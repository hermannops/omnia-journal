-- Vues statistiques pour le dashboard admin

create or replace view v_stats_admin_jour as
select
  count(*) filter (where statut = 'validee')                        as nb_transactions,
  coalesce(sum(montant) filter (where statut = 'validee'), 0)       as volume_total,
  count(*) filter (where statut = 'annulee')                        as nb_annulees
from transaction
where horodatage::date = current_date;

create or replace view v_stats_admin_semaine as
select
  count(*) filter (where statut = 'validee')                        as nb_transactions,
  coalesce(sum(montant) filter (where statut = 'validee'), 0)       as volume_total,
  count(*) filter (where statut = 'annulee')                        as nb_annulees
from transaction
where horodatage >= date_trunc('week', current_date);

create or replace view v_stats_admin_mois as
select
  count(*) filter (where statut = 'validee')                        as nb_transactions,
  coalesce(sum(montant) filter (where statut = 'validee'), 0)       as volume_total,
  count(*) filter (where statut = 'annulee')                        as nb_annulees
from transaction
where horodatage >= date_trunc('month', current_date);

create or replace view v_volume_par_operateur_7j as
select
  o.code  as operateur_code,
  o.nom   as operateur_nom,
  count(*) as nb_transactions,
  coalesce(sum(t.montant), 0) as volume_total
from transaction t
join operateur o on o.id = t.operateur_id
where t.horodatage >= (current_date - interval '6 days')
  and t.statut = 'validee'
group by o.id, o.code, o.nom
order by volume_total desc;

-- Fonction de réinitialisation PIN (côté serveur pour bcrypt)
create or replace function reinitialiser_pin(p_agent_id uuid, p_nouveau_pin text)
returns void
language plpgsql
as $$
begin
  update agent
  set pin_hash         = crypt(p_nouveau_pin, gen_salt('bf')),
      pin_essais_rates = 0,
      pin_verrouille   = false
  where id = p_agent_id;
  if not found then
    raise exception 'Agent introuvable';
  end if;
end;
$$;
