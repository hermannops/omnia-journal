-- Idempotent : recrée la fonction et la vue point de veille
-- (déjà présentes dans le schéma initial, cette migration assure
--  leur existence sur tout environnement cloné depuis git)

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
