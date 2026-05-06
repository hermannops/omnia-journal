# Dette technique sécurité — à traiter en v2

## RLS Supabase

État : RLS désactivé sur toutes les tables, sécurité gérée par JWT côté front.

Risque accepté en v1 : un attaquant ayant l'anon_key (visible dans le bundle) 
peut techniquement faire des requêtes directes à PostgREST sans passer par 
l'app. Impact limité : exposition de numéros de téléphone et noms de clients.

À faire en v2 :
- Aligner le JWT_SECRET de l'Edge Function avec celui de Supabase
- Renommer le claim "role" en "omnia_role" pour éviter le conflit avec PostgreSQL
- Activer RLS sur toutes les tables avec policies basées sur auth.jwt() ->> 'omnia_role'
- Tester chaque flow end-to-end après activation