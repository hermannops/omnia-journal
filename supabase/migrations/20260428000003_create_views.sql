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
join agent a           on a.id = t.agent_id
join operateur o       on o.id = t.operateur_id
join type_operation tp on tp.id = t.type_operation_id
where t.horodatage::date = current_date
  and t.statut = 'validee'
order by t.horodatage desc;

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
join operateur o       on o.id = t.operateur_id
join type_operation tp on tp.id = t.type_operation_id
where t.horodatage::date = current_date
  and t.statut = 'validee'
group by t.agent_id, o.code, o.nom, tp.code, tp.libelle
order by o.code, tp.code;

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
