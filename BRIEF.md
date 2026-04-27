# OMNIA Journal — Brief technique pour développement

## 1. Contexte

OMNIA Journal est une application web interne de gestion des opérations Mobile Money pour OMNIA Group SARL (Bénin). Elle remplace un cahier papier tenu par un agent terrain qui enregistre chaque transaction (dépôt, retrait, paiement, forfait) effectuée pour les clients via les SIM marchandes MTN, Moov et Celtiis.

**Utilisateur principal v1 :** 1 agent terrain (peut évoluer) + 1 admin (le dirigeant).

**Contexte d'usage critique :**
- Le réseau 4G béninois est instable → l'app DOIT fonctionner offline et synchroniser à la reconnexion.
- L'agent saisit depuis son téléphone Android perso ET depuis le poste fixe de l'agence.
- Chaque saisie doit être ultra-rapide (un client attend devant l'agent).

## 2. Stack technique imposée

| Couche | Choix | Justification |
|--------|-------|---------------|
| Front | **SvelteKit** + TypeScript strict | Bundle léger, syntaxe simple, idéal PWA |
| Styling | **Tailwind CSS** | Demandé par le client |
| Build | Vite (inclus dans SvelteKit) | Standard SvelteKit |
| PWA | `@vite-pwa/sveltekit` | Offline-first natif |
| Stockage offline | **IndexedDB** via `idb` (npm) | Plus robuste que localStorage pour les transactions en attente |
| Adapter | `@sveltejs/adapter-static` | Site statique pour Cloudflare Pages |
| Backend | **Supabase self-hosted** sur serveur Hetzner | Déjà installé par le client |
| Auth | **Edge Function Supabase + JWT custom** | Système numéro agent + PIN, pas d'email |
| Hébergement front | **Cloudflare Pages** | CDN mondial, gratuit, déploiement Git auto |
| Domaine | `journal.omnia-group-sarl.com` | Cloudflare Pages |
| API Supabase | `api.omnia-group-sarl.com` (ou équivalent) | Hetzner |
| Thème | **Mode clair uniquement** | Demandé par le client |
| Langue | **Français** (toute l'UI) | Bénin francophone |

**Interdictions :**
- Pas de `useState` à la React (on est en Svelte, on utilise `$state` runes ou stores).
- Pas de framework UI lourd type Material UI, Vuetify, etc. → Tailwind suffit.
- Pas de gestionnaire d'état externe (Redux, Pinia, etc.) → les stores Svelte natifs suffisent.
- Pas de tests E2E pour la v1 (Playwright/Cypress) — on prioritise la vitesse de livraison.
- Pas de SSR (on est en mode static-only pour Cloudflare Pages).

## 3. Structure de dossiers attendue

```
omnia-journal/
├── BRIEF.md                          ← ce fichier
├── omnia_journal_schema.sql          ← schéma Supabase (déjà exécuté)
├── README.md                         ← à créer (instructions setup)
├── .env.example                      ← variables d'environnement
├── .env                              ← (gitignored) valeurs réelles
├── .gitignore
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── static/
│   ├── favicon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.webmanifest         (généré par vite-pwa)
├── supabase/
│   └── functions/
│       └── login/
│           ├── index.ts              ← Edge Function de login
│           └── deno.json
└── src/
    ├── app.html
    ├── app.css                       ← styles Tailwind globaux
    ├── app.d.ts
    ├── lib/
    │   ├── supabase.ts               ← client Supabase configuré
    │   ├── auth.ts                   ← gestion JWT, login, logout
    │   ├── db/
    │   │   ├── transactions.ts       ← CRUD transactions
    │   │   ├── point-veille.ts       ← logique point de veille
    │   │   └── referentiels.ts       ← opérateurs, types d'opérations
    │   ├── offline/
    │   │   ├── queue.ts              ← file d'attente IndexedDB
    │   │   └── sync.ts               ← synchronisation auto
    │   ├── stores/
    │   │   ├── agent.ts              ← agent connecté
    │   │   ├── session.ts            ← session journalière
    │   │   └── network.ts            ← état online/offline
    │   ├── components/
    │   │   ├── Button.svelte
    │   │   ├── Input.svelte
    │   │   ├── Select.svelte
    │   │   ├── PinPad.svelte         ← clavier numérique pour PIN
    │   │   ├── TransactionRow.svelte
    │   │   ├── OfflineBadge.svelte
    │   │   └── SyncStatus.svelte
    │   └── utils/
    │       ├── format.ts             ← format FCFA, dates
    │       └── validation.ts
    └── routes/
        ├── +layout.svelte            ← shell global, vérif auth
        ├── +layout.ts                ← load auth state
        ├── +page.svelte              ← redirige selon auth
        ├── login/
        │   └── +page.svelte
        ├── point-veille/
        │   └── +page.svelte          ← écran matinal de validation
        ├── saisie/
        │   └── +page.svelte          ← formulaire de saisie transaction
        ├── journal/
        │   └── +page.svelte          ← journal du jour
        └── admin/
            ├── +layout.svelte        ← garde-fou rôle admin
            ├── +page.svelte          ← dashboard admin
            ├── transactions/
            │   └── +page.svelte      ← toutes les transactions, filtres, annulation
            ├── agents/
            │   └── +page.svelte      ← gestion agents
            └── export/
                └── +page.svelte      ← export Excel
```

## 4. Variables d'environnement

```env
# .env.example
PUBLIC_SUPABASE_URL=https://api.omnia-group-sarl.com
PUBLIC_SUPABASE_ANON_KEY=<anon_key>

# Côté Edge Function uniquement (jamais exposé au front)
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
JWT_SECRET=<jwt_secret_supabase>
JWT_EXPIRY_HOURS=12
```

## 5. Modèle de données — résumé

Le schéma SQL complet est dans `omnia_journal_schema.sql`. Tables clés :

- `agent` — numéro_agent unique, PIN haché en bcrypt, rôle (agent/superviseur/admin)
- `operateur` — MTN, Moov, Celtiis (référentiel)
- `type_operation` — Dépôt, Retrait, Paiement, Forfait internet, Forfait appel, Autre
- `session_jour` — une session par agent par jour, créée auto à la première saisie
- `transaction` — la table centrale, avec `montant`, `solde_apres` (lu sur SMS opérateur)
- `point_veille` — validation matinale du solde de fin de journée précédente

Vues SQL prêtes à consommer :
- `v_journal_du_jour`
- `v_totaux_du_jour`
- `v_solde_actuel_par_operateur`
- `v_points_veille_a_faire`

Fonctions SQL :
- `verifier_pin(numero, pin)` — vérifie le PIN, gère le verrouillage
- `obtenir_ou_creer_session(agent_id)` — crée la session du jour si besoin
- `annuler_transaction(id, motif, admin_id)` — annulation traçable
- `solde_fin_de_journee(operateur_id, date)` — solde théorique d'une date

## 6. Flux d'authentification

1. L'agent ouvre l'app → page `/login`
2. Saisit numéro agent (texte) + PIN (6 chiffres, clavier numérique custom)
3. Front envoie `POST /functions/v1/login` à l'Edge Function avec `{ numero, pin }`
4. Edge Function appelle `verifier_pin(numero, pin)` en SQL via service_role
5. Si OK → génère JWT signé avec :
   ```json
   {
     "sub": "<agent_id>",
     "numero": "AG002",
     "nom": "Grâce",
     "role": "agent",
     "exp": <timestamp + 12h>
   }
   ```
6. Front stocke le JWT dans localStorage + dans un store Svelte
7. Toutes les requêtes Supabase incluent le JWT dans le header `Authorization: Bearer <jwt>`
8. À la déconnexion ou expiration → retour à `/login`

**Code de l'Edge Function** : à coder en TypeScript Deno, signature JWT avec `djwt` (lib Deno standard pour JWT).

## 7. Flux des écrans

### 7.1 — Page `/login`
- Champ numéro agent (texte)
- Clavier numérique custom (composant `PinPad.svelte`) pour saisir 6 chiffres
- Affichage discret du nombre de tentatives restantes après 1er échec
- Si `pin_verrouille = true` → message clair : "Compte verrouillé, contactez l'administrateur"

### 7.2 — Page `/point-veille` (écran matinal)
- Affichée automatiquement après login SI la vue `v_points_veille_a_faire` retourne des lignes
- Pour chaque ligne (= un opérateur ayant eu de l'activité hier sans validation) :
  - Nom opérateur (MTN, Moov, Celtiis)
  - Solde théorique de fin de journée (selon la dernière transaction de la veille)
  - Champ "Solde réel affiché par l'opérateur ce matin" (input number)
  - Champ commentaire optionnel
- Bouton "Valider tous les soldes" → INSERT dans `point_veille` pour chaque ligne
- L'écart est calculé automatiquement par la BDD (colonne générée)
- Une fois validé → redirection vers `/saisie`

### 7.3 — Page `/saisie` (cœur de l'app)
**Formulaire ultra-rapide :**
- **Opérateur** : 3 gros boutons radio (MTN / Moov / Celtiis) — pas de dropdown
- **Type d'opération** : 6 boutons radio (Dépôt / Retrait / Paiement / Forfait internet / Forfait appel / Autre) — pas de dropdown
- **Numéro client** : input tel, format libre (l'agent peut taper sans tirets)
- **Nom client** : input texte (optionnel)
- **Montant** : input number, valeur en FCFA
- **Solde après opération** : input number, lu sur le SMS reçu
- **Observation** : textarea optionnelle, courte
- Bouton **"Enregistrer"** large et clair
- Après enregistrement : reset du formulaire + toast "Transaction enregistrée" + focus revient sur Opérateur

**Comportement offline :**
- Si réseau dispo → INSERT direct dans Supabase
- Si pas de réseau → enregistrement dans IndexedDB queue, badge "Hors ligne — N opération(s) en attente" visible en haut
- Au retour du réseau → flush automatique de la queue

**Validation :**
- Montant > 0 obligatoire
- Solde >= 0 obligatoire
- Numéro client optionnel (pour les forfaits sans numéro client comme dans le cahier papier)

### 7.4 — Page `/journal`
- Liste des transactions du jour pour l'agent connecté (`v_journal_du_jour`)
- En haut : cartes avec totaux par opérateur (`v_totaux_du_jour` + `v_solde_actuel_par_operateur`)
- Chaque ligne : heure, opérateur (badge coloré), type, numéro client, nom client, montant, solde après
- Bouton "Annuler" sur chaque transaction (admin uniquement)
- Auto-refresh toutes les 30 secondes si online

### 7.5 — Espace `/admin` (rôle admin uniquement)
- Garde-fou : si JWT.role !== 'admin' → redirect vers `/saisie`
- **Dashboard** : stats globales (volume aujourd'hui, semaine, mois, par opérateur)
- **Transactions** : tableau filtrable (date, agent, opérateur, type), avec annulation possible
- **Agents** : liste, ajout (via `creer_agent` SQL), désactivation, déverrouillage PIN
- **Export Excel** : génère un .xlsx via la lib `xlsx` (npm) côté client, avec filtres période + opérateur

## 8. Stratégie offline-first

**Principe : write-through avec fallback queue.**

1. Toute opération de création (transaction, point_veille) tente d'abord l'envoi réseau.
2. Si échec réseau → enregistrement dans une queue IndexedDB (`pending_transactions`).
3. Un service worker + un listener `online` rejouent la queue dans l'ordre dès que le réseau revient.
4. Pour les lectures (journal, totaux) → cache IndexedDB des dernières données vues, affiché en attendant la requête réseau.

**Détection du réseau :**
- `navigator.onLine` (peu fiable mais utile)
- Ping périodique de l'endpoint Supabase `/rest/v1/` (toutes les 15s) pour confirmation
- Store Svelte `network.ts` qui expose `$online`

**Composant `OfflineBadge.svelte` :**
- Visible sur toutes les pages
- État vert "En ligne" / orange "Hors ligne — N en attente" / bleu "Synchronisation..."

## 9. Conventions de code

- **TypeScript strict** : `"strict": true` dans tsconfig
- **Composants Svelte** : runes API (`$state`, `$derived`, `$effect`) — Svelte 5
- **Nommage** : `kebab-case` pour fichiers, `PascalCase` pour composants, `camelCase` pour fonctions
- **Pas de `any`** sauf justification commentée
- **Commentaires** : en français, brefs, uniquement quand le "pourquoi" n'est pas évident
- **Erreurs** : toujours capturées et affichées via un système de toast (composant `Toast.svelte` à créer)
- **Money** : toujours en `bigint` ou `number` (FCFA entier, pas de virgule), formaté via `utils/format.ts` (ex : `formatFCFA(70000)` → `"70 000 F"`)
- **Dates** : ISO 8601 en BDD, `Intl.DateTimeFormat('fr-FR')` pour l'affichage

## 10. Plan de livraison — étape par étape

À traiter **dans l'ordre**, une étape à la fois. **Ne pas commencer l'étape N+1 avant que l'étape N soit terminée et testée.**

### Étape 1 — Setup projet
- [ ] Initialiser SvelteKit avec TypeScript : `npm create svelte@latest .`
- [ ] Installer Tailwind CSS, configurer `tailwind.config.js`
- [ ] Installer `@vite-pwa/sveltekit`, configurer manifest et service worker basique
- [ ] Installer `@supabase/supabase-js`, créer `src/lib/supabase.ts`
- [ ] Installer `idb` pour IndexedDB
- [ ] Configurer `adapter-static`
- [ ] Créer `.env.example`, `.gitignore`, `README.md` minimal
- [ ] Vérifier que `npm run dev` démarre sans erreur sur une page d'accueil simple

### Étape 2 — Edge Function login
- [ ] Créer `supabase/functions/login/index.ts`
- [ ] Implémenter la vérification PIN via RPC `verifier_pin`
- [ ] Génération JWT avec `djwt`
- [ ] Tester en local avec `supabase functions serve` puis en déployant

### Étape 3 — Auth front
- [ ] Page `/login` avec PinPad custom
- [ ] Store `agent.ts` avec persistance localStorage
- [ ] Helper `auth.ts` : `login()`, `logout()`, `getAgent()`, `getJwt()`
- [ ] Garde-fou dans `+layout.ts` : redirect vers `/login` si pas de JWT valide
- [ ] Tester le flux complet login → page d'accueil

### Étape 4 — Référentiels
- [ ] `db/referentiels.ts` : fetch opérateurs et types d'opérations
- [ ] Cache IndexedDB des référentiels (changent rarement)
- [ ] Tester l'affichage

### Étape 5 — Page de saisie
- [ ] Composants Button, Input, Select
- [ ] Formulaire de saisie complet
- [ ] Logique d'enregistrement online
- [ ] Validation des champs
- [ ] Toast de confirmation

### Étape 6 — Offline-first
- [ ] Store `network.ts` avec détection online/offline
- [ ] Queue IndexedDB pour transactions en attente
- [ ] Sync automatique au retour du réseau
- [ ] Composant `OfflineBadge.svelte` visible sur toutes les pages
- [ ] Tester en coupant le réseau dans DevTools

### Étape 7 — Journal du jour
- [ ] Page `/journal` avec liste des transactions
- [ ] Cartes de totaux par opérateur
- [ ] Auto-refresh

### Étape 8 — Point de veille
- [ ] Page `/point-veille`
- [ ] Logique de détection : appeler `v_points_veille_a_faire` après login
- [ ] Si lignes → forcer cette page avant `/saisie`

### Étape 9 — Espace admin
- [ ] Layout admin avec garde-fou rôle
- [ ] Page transactions avec filtres
- [ ] Annulation de transaction
- [ ] Gestion agents

### Étape 10 — Export Excel
- [ ] Page `/admin/export`
- [ ] Génération xlsx côté client

### Étape 11 — Polish & déploiement
- [ ] Icons PWA (192, 512)
- [ ] Manifest soigné
- [ ] Test installation PWA sur Android
- [ ] Déploiement Cloudflare Pages
- [ ] Configuration DNS sur `journal.omnia-group-sarl.com`

## 11. Pièges connus à éviter

1. **Service Worker et JWT** : ne pas mettre en cache les requêtes authentifiées vers Supabase. Configurer la stratégie de cache pour exclure `/rest/v1/` et `/functions/v1/`.

2. **CORS sur Supabase self-hosted** : penser à autoriser `https://journal.omnia-group-sarl.com` dans la config Kong/Nginx du Supabase Hetzner.

3. **Horodatage** : toujours laisser PostgreSQL gérer `now()` côté serveur. **Ne pas envoyer le timestamp depuis le client** (l'horloge du téléphone peut être fausse).

4. **Reconnexion réseau** : `navigator.onLine` ment souvent. Toujours doubler avec un ping réel.

5. **PIN dans IndexedDB** : ne jamais stocker le PIN, même haché, dans IndexedDB. Seul le JWT est stocké côté client.

6. **Numéro client** : nullable en BDD, donc l'UI doit l'autoriser vide. Ne pas mettre `required` sur cet input HTML.

7. **Format FCFA** : pas de centimes, jamais de virgule. Toujours `bigint` ou `Math.round()` avant insert.

8. **Svelte 5 runes** : `$state`, `$derived`, `$effect` — pas de `$:` réactif legacy. Si Claude Code utilise la syntaxe Svelte 4 par habitude, le corriger.

## 12. Critère de succès v1

L'app est livrée quand :
- L'agent peut se connecter, saisir une transaction en moins de 20 secondes, voir le journal du jour
- L'app fonctionne offline et synchronise au retour du réseau
- L'admin peut consulter, filtrer, annuler, exporter
- Le tout est déployé sur `journal.omnia-group-sarl.com` via Cloudflare Pages
- L'agent terrain l'utilise pendant 1 semaine sans bloquer

**Hors scope v1** (à ne pas coder même si ça démange) :
- Modules Canal+ et Assurance
- Commissions par opération
- Multi-agents avancé (assignation de zones, etc.)
- Dashboard analytics avancé (graphiques temporels, comparaisons)
- Notifications push
- Lecture automatique des SMS
- Intégration API MTN/Moov

Ces features viendront en v2 après retour terrain.