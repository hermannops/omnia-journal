-- Colonne pour l'idempotence offline.
-- Générée côté client (UUID v4) et envoyée avec chaque INSERT.
-- La contrainte UNIQUE empêche les doublons si deux flush arrivent
-- en parallèle avec la même transaction pending.
-- Nullable : les transactions saisies online sans offline ne l'auront pas.
alter table transaction
  add column if not exists client_uuid text unique;
