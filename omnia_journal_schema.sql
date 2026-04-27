-- =============================================================================
-- OMNIA Journal — Schéma Supabase v1 (Mobile Money uniquement)
-- =============================================================================
-- À exécuter dans le SQL Editor de Supabase.
-- Hypothèses : auth Supabase non utilisée pour les agents (système numéro+PIN custom).
--              Tu accèdes en admin via la service_role key depuis ton dashboard.
-- =============================================================================

-- Extensions utiles
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- pour bcrypt sur le PIN

-- =============================================================================
-- 1. RÉFÉRENTIELS
-- =============================================================================

-- Opérateurs Mobile Money
create table operateur (
    id          uuid primary key default uuid_generate_v4(),
    code        text not null unique,           -- 'MTN', 'MOOV', 'CELTIIS'
    nom         text not null,                  -- 'MTN MoMo', 'Moov Money', 'Celtiis Cash'
    actif       boolean not null default true,
    created_at  timestamptz not null default now()
);

insert into operateur (code, nom) values
    ('MTN',     'MTN MoMo'),
    ('MOOV',    'Moov Money'),
    ('CELTIIS', 'Celtiis Cash');

-- Types d'opérations possibles
-- Volontairement une table plutôt qu'un enum : tu pourras en ajouter sans migration
create table type_operation (
    id          uuid primary key default uuid_generate_v4(),
    code        text not null unique,           -- 'DEPOT', 'RETRAIT', etc.
    libelle     text not null,                  -- 'Dépôt', 'Retrait', etc.
    sens_solde  smallint not null,              -- +1 = augmente solde SIM, -1 = diminue, 0 = neutre/info
    actif       boolean not null default true,
    ordre       smallint not null default 0     -- pour l'ordre d'affichage dans le formulaire
);

-- sens_solde explication :
--   RETRAIT client → la SIM marchande reçoit l'argent du client → solde SIM augmente → +1
--   DEPOT client  → la SIM marchande envoie l'argent au client → solde SIM diminue → -1
--   PAIEMENT      → dépend du sens, à clarifier au cas par cas, on met 0 pour l'instant
--   FORFAIT       → la SIM marchande paie le forfait → solde diminue → -1
insert into type_operation (code, libelle, sens_solde, ordre) values
    ('DEPOT',           'Dépôt',                -1, 1),
    ('RETRAIT',         'Retrait',              +1, 2),
    ('PAIEMENT',        'Paiement',              0, 3),
    ('FORFAIT_INTERNET','Forfait internet',     -1, 4),
    ('FORFAIT_APPEL',   'Forfait appel',        -1, 5),
    ('AUTRE',           'Autre',                 0, 99);

-- =============================================================================
-- 2. AGENTS
-- =============================================================================

create table agent (
    id              uuid primary key default uuid_generate_v4(),
    numero_agent    text not null unique,           -- 'AG001', 'AG002'
    nom             text not null,
    role            text not null default 'agent',  -- 'agent', 'superviseur', 'admin'
    pin_hash        text not null,                  -- bcrypt
    pin_essais_rates smallint not null default 0,
    pin_verrouille  boolean not null default false,
    actif           boolean not null default true,
    created_at      timestamptz not null default now(),
    constraint role_valide check (role in ('agent', 'superviseur', 'admin'))
);

-- Helper pour créer un agent avec PIN haché
-- Usage : select creer_agent('AG001', 'Grâce', 'agent', '123456');
create or replace function creer_agent(
    p_numero text,
    p_nom    text,
    p_role   text,
    p_pin    text
) returns uuid
language plpgsql
as $$
declare
    v_id uuid;
begin
    insert into agent (numero_agent, nom, role, pin_hash)
    values (p_numero, p_nom, p_role, crypt(p_pin, gen_salt('bf')))
    returning id into v_id;
    return v_id;
end;
$$;

-- Vérification du PIN (utilisé côté backend / Edge Function)
-- Renvoie l'agent si le PIN est bon, sinon null. Incrémente le compteur d'échecs.
create or replace function verifier_pin(
    p_numero text,
    p_pin    text
) returns table (id uuid, nom text, role text, verrouille boolean)
language plpgsql
as $$
declare
    v_agent agent%rowtype;
    v_max_essais constant smallint := 5;
begin
    select * into v_agent from agent where numero_agent = p_numero and actif = true;

    if not found then
        return; -- agent inexistant, on renvoie vide
    end if;

    if v_agent.pin_verrouille then
        return query select v_agent.id, v_agent.nom, v_agent.role, true;
        return;
    end if;

    if v_agent.pin_hash = crypt(p_pin, v_agent.pin_hash) then
        -- PIN correct → reset compteur
        update agent set pin_essais_rates = 0 where id = v_agent.id;
        return query select v_agent.id, v_agent.nom, v_agent.role, false;
    else
        -- PIN incorrect → incrémente, verrouille si dépassé
        update agent
            set pin_essais_rates = pin_essais_rates + 1,
                pin_verrouille = (pin_essais_rates + 1 >= v_max_essais)
            where id = v_agent.id;
        return; -- renvoie vide
    end if;
end;
$$;

-- =============================================================================
-- 3. SESSION JOURNALIÈRE
-- =============================================================================

create table session_jour (
    id                      uuid primary key default uuid_generate_v4(),
    agent_id                uuid not null references agent(id),
    date_session            date not null,
    heure_ouverture         timestamptz not null default now(),
    heure_derniere_activite timestamptz not null default now(),
    constraint session_unique_par_jour unique (agent_id, date_session)
);

create index idx_session_agent_date on session_jour (agent_id, date_session desc);

-- Helper : récupère ou crée la session du jour pour un agent
create or replace function obtenir_ou_creer_session(p_agent_id uuid)
returns uuid
language plpgsql
as $$
declare
    v_session_id uuid;
    v_today date := current_date;
begin
    select id into v_session_id
    from session_jour
    where agent_id = p_agent_id and date_session = v_today;

    if v_session_id is null then
        insert into session_jour (agent_id, date_session)
        values (p_agent_id, v_today)
        returning id into v_session_id;
    else
        update session_jour
            set heure_derniere_activite = now()
            where id = v_session_id;
    end if;

    return v_session_id;
end;
$$;

-- =============================================================================
-- 4. POINT DE VEILLE — validation des soldes du jour précédent
-- =============================================================================
-- Quand l'agent se connecte le matin, on lui demande de valider/corriger le
-- solde réel de chaque opérateur tel qu'affiché par le SMS de la veille au soir.
-- Le solde théorique = dernière transaction.solde_apres de la veille.

create table point_veille (
    id                      uuid primary key default uuid_generate_v4(),
    agent_id                uuid not null references agent(id),
    operateur_id            uuid not null references operateur(id),
    date_concernee          date not null,                  -- date dont on valide le solde de fin
    solde_theorique         bigint,                         -- calculé depuis la dernière transaction de la date_concernee
    solde_reel_valide       bigint not null,                -- ce que l'agent saisit le matin suivant
    ecart                   bigint generated always as (solde_reel_valide - coalesce(solde_theorique, 0)) stored,
    commentaire             text,
    validated_at            timestamptz not null default now(),
    validated_by            uuid not null references agent(id),
    constraint point_veille_unique unique (agent_id, operateur_id, date_concernee)
);

create index idx_point_veille_date on point_veille (date_concernee desc);

-- =============================================================================
-- 5. TRANSACTIONS — la table centrale
-- =============================================================================

create table transaction (
    id                  uuid primary key default uuid_generate_v4(),
    session_id          uuid not null references session_jour(id),
    agent_id            uuid not null references agent(id),       -- dénormalisé pour requêtes rapides
    operateur_id        uuid not null references operateur(id),
    type_operation_id   uuid not null references type_operation(id),

    numero_client       text,                                     -- nullable (forfaits sans client)
    nom_client          text,                                     -- récupéré depuis l'app opérateur, optionnel
    montant             bigint not null,                          -- en FCFA, entier (pas de centimes)
    solde_apres         bigint not null,                          -- solde SIM marchande après opération, depuis le SMS

    observation         text,
    horodatage          timestamptz not null default now(),

    statut              text not null default 'validee',          -- 'validee', 'annulee'
    motif_annulation    text,
    annulee_at          timestamptz,
    annulee_by          uuid references agent(id),

    constraint montant_positif check (montant > 0),
    constraint solde_positif check (solde_apres >= 0),
    constraint statut_valide check (statut in ('validee', 'annulee')),
    constraint annulation_coherente check (
        (statut = 'validee' and motif_annulation is null and annulee_at is null)
        or
        (statut = 'annulee' and motif_annulation is not null and annulee_at is not null)
    )
);

create index idx_transaction_session on transaction (session_id);
create index idx_transaction_agent_date on transaction (agent_id, horodatage desc);
create index idx_transaction_operateur_date on transaction (operateur_id, horodatage desc);
create index idx_transaction_numero_client on transaction (numero_client) where numero_client is not null;
create index idx_transaction_statut on transaction (statut);

-- =============================================================================
-- 6. VUES MÉTIER — prêtes à consommer côté front
-- =============================================================================

-- 6.1 — Journal du jour : toutes les transactions valides du jour pour un agent
create or replace view v_journal_du_jour as
select
    t.id,
    t.horodatage,
    t.agent_id,
    a.nom as agent_nom,
    o.code as operateur_code,
    o.nom as operateur_nom,
    tp.code as type_code,
    tp.libelle as type_libelle,
    t.numero_client,
    t.nom_client,
    t.montant,
    t.solde_apres,
    t.observation,
    t.statut
from transaction t
join agent a       on a.id = t.agent_id
join operateur o   on o.id = t.operateur_id
join type_operation tp on tp.id = t.type_operation_id
where t.horodatage::date = current_date
  and t.statut = 'validee'
order by t.horodatage desc;

-- 6.2 — Totaux du jour par opérateur et par type
create or replace view v_totaux_du_jour as
select
    t.agent_id,
    o.code as operateur_code,
    o.nom as operateur_nom,
    tp.code as type_code,
    tp.libelle as type_libelle,
    count(*) as nb_operations,
    sum(t.montant) as montant_total
from transaction t
join operateur o on o.id = t.operateur_id
join type_operation tp on tp.id = t.type_operation_id
where t.horodatage::date = current_date
  and t.statut = 'validee'
group by t.agent_id, o.code, o.nom, tp.code, tp.libelle
order by o.code, tp.code;

-- 6.3 — Solde théorique actuel par opérateur (= dernière transaction validée)
create or replace view v_solde_actuel_par_operateur as
select distinct on (t.operateur_id)
    t.operateur_id,
    o.code as operateur_code,
    o.nom as operateur_nom,
    t.solde_apres as solde_theorique,
    t.horodatage as derniere_operation
from transaction t
join operateur o on o.id = t.operateur_id
where t.statut = 'validee'
order by t.operateur_id, t.horodatage desc;

-- 6.4 — Solde théorique de fin de journée d'une date donnée
-- Utile pour préparer l'écran de point de veille du matin suivant
create or replace function solde_fin_de_journee(p_operateur_id uuid, p_date date)
returns bigint
language sql
stable
as $$
    select t.solde_apres
    from transaction t
    where t.operateur_id = p_operateur_id
      and t.horodatage::date = p_date
      and t.statut = 'validee'
    order by t.horodatage desc
    limit 1;
$$;

-- 6.5 — Opérateurs nécessitant un point de veille pour aujourd'hui
-- (= ceux qui ont eu de l'activité hier mais pas de point_veille validé pour hier)
create or replace view v_points_veille_a_faire as
select
    o.id as operateur_id,
    o.code as operateur_code,
    o.nom as operateur_nom,
    (current_date - interval '1 day')::date as date_concernee,
    solde_fin_de_journee(o.id, (current_date - interval '1 day')::date) as solde_theorique
from operateur o
where o.actif = true
  and exists (
      select 1 from transaction t
      where t.operateur_id = o.id
        and t.horodatage::date = (current_date - interval '1 day')::date
        and t.statut = 'validee'
  )
  and not exists (
      select 1 from point_veille pv
      where pv.operateur_id = o.id
        and pv.date_concernee = (current_date - interval '1 day')::date
  );

-- =============================================================================
-- 7. ANNULATION D'UNE TRANSACTION (admin uniquement, pour traçabilité)
-- =============================================================================

create or replace function annuler_transaction(
    p_transaction_id uuid,
    p_motif          text,
    p_admin_id       uuid
) returns void
language plpgsql
as $$
begin
    if p_motif is null or length(trim(p_motif)) = 0 then
        raise exception 'Le motif d''annulation est obligatoire';
    end if;

    update transaction
        set statut = 'annulee',
            motif_annulation = p_motif,
            annulee_at = now(),
            annulee_by = p_admin_id
        where id = p_transaction_id
          and statut = 'validee';

    if not found then
        raise exception 'Transaction introuvable ou déjà annulée';
    end if;
end;
$$;

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- À adapter selon comment tu connectes ton front à Supabase.
-- Option A : tu utilises uniquement la service_role key depuis un backend Edge
--            Function qui sert d'intermédiaire → laisse RLS désactivé.
-- Option B : tu utilises l'anon key directement depuis ton front et tu fais
--            transiter l'agent_id via JWT → active RLS et adapte les policies.
--
-- Pour démarrer simple, je laisse RLS désactivé et tu activeras quand le flux
-- d'auth sera tranché. Décommente les blocs ci-dessous quand prêt.

-- alter table agent          enable row level security;
-- alter table session_jour   enable row level security;
-- alter table transaction    enable row level security;
-- alter table point_veille   enable row level security;

-- =============================================================================
-- 9. SEED — données de test
-- =============================================================================

-- Crée un agent admin (toi) et un agent terrain
select creer_agent('AG001', 'Admin OMNIA', 'admin', '999999');
select creer_agent('AG002', 'Grâce',       'agent', '123456');

-- =============================================================================
-- FIN
-- =============================================================================