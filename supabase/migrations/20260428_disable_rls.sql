-- Supabase Cloud active RLS par défaut sur toutes les tables.
-- Pour v1, on le désactive conformément à l'intention du schéma initial :
-- l'auth est gérée au niveau applicatif (JWT custom + Edge Function).
-- À remplacer par des policies RLS propres quand on aura résolu
-- l'intégration du JWT custom avec le système auth Supabase.

alter table operateur       disable row level security;
alter table type_operation  disable row level security;
alter table agent           disable row level security;
alter table session_jour    disable row level security;
alter table transaction     disable row level security;
alter table point_veille    disable row level security;
