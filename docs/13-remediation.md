# Suivi de remédiation

État au 2026-09-07. Réfère aux 20 risques de l'audit (`R01`–`R20`).

Légende : **Corrigé** = traité dans le code + test ou vérification locale ·
**Partiel** = mécanisme en place, reste une action hors code (Supabase/Meta/Vercel réels) ·
**Ouvert** = non traité.

## Gate qualité (préalable à toute recette)

| Élément | État | Détail |
|---|---|---|
| `npm run lint` | Corrigé | `eslint.config.mjs` (flat) : `@eslint/js` + `react` + `react-hooks` + `jsx-a11y`. 0 erreur. |
| `npm run typecheck` | Corrigé | `tsconfig.json` strict, `tsc --noEmit`. 0 erreur. Exécuté aussi par `next build`. |
| `npm test` | Corrigé | `node --test` — 14 tests : `auth-config` (R01), `database-security` (R02), `delivery-integrity` (R06/R08/R08b/R09/R10/R12 + statut non régressif), `whatsapp` (validation `sendText`/`sendCampaignMessage`/`isDemo`). |
| CI | Corrigé | `.github/workflows/ci.yml` : install → lint → typecheck → test → `npm audit --audit-level=high` → build. |
| `npm run verify` | Ajouté | enchaîne les quatre étapes localement. |

## Risques P0

| ID | État | Correction |
|---|---|---|
| R01 — cookie admin forgeable | Corrigé | `src/lib/auth.js` : `SESSION_SECRET` obligatoire (≥ 32 car., ≥ 12 car. distincts, valeurs d'exemple rejetées), `ADMIN_PASSWORD` ≥ 16 car. Session = id aléatoire signé HMAC + expiration 8 h. Test `auth-config.test.mjs`. |
| R02 — accès direct Supabase | Partiel | `supabase/migrations/001_private_access.sql` + bloc équivalent dans `schema.sql` : RLS activé, `revoke all … from public, anon, authenticated`, `grant … to service_role`, vue `campaign_stats` en `security_invoker`. Test `database-security.test.mjs`. **Reste** : appliquer sur le projet Supabase réel et re-vérifier les grants. |

## Risques P1

| ID | État | Correction |
|---|---|---|
| R03 — sessions non révocables | Corrigé | Table `admin_sessions` (migration 002). `requireAdmin()` (`src/lib/api.js`) revérifie l'existence + fraîcheur à chaque requête ; `logout` supprime la ligne ; le scheduler purge les sessions expirées. |
| R04 — signature webhook facultative | Corrigé | `src/app/api/webhook/whatsapp/route.js` : 503 si `WHATSAPP_APP_SECRET` absent/court ; signature `x-hub-signature-256` comparée en temps constant. |
| R05 — cron public | Corrigé | `src/app/api/cron/scheduler/route.js` : 503 si `CRON_SECRET` absent/court ; `Bearer` comparé en temps constant ; `rateLimit`. |
| R06 — envois concurrents en double | Corrigé | Machine à états SQL (migration 003) : `prepare_campaign` / `claim_campaign_message` (`for update skip locked` + `dispatch_token`) / `finish_campaign_message` / `complete_campaign_batch`. Index unique `unique_campaign_delivery (campaign_id, contact_id, kind)`. Test `delivery-integrity` R06. |
| R07 — campagne bloquée après échec | Corrigé | États séparés `main_prepared_at` / `main_sent_at` ; `complete_campaign_batch` ne marque `envoye` que si 0 message en attente/incertain/échec ; reprise par destinataire via `next_campaign_work`. |
| R08 — STOP non garanti | Corrigé | `record_incoming` (migration 003) : STOP → `consent=false`, `status='stop'`, messages `queued` passés en `skipped`, `optout` créé, le tout transactionnel. `sendCampaign` relit `consent,status` juste avant chaque envoi. Test `delivery-integrity` R08. |
| R09 — webhooks non idempotents | Corrigé | File `webhook_inbox` (migration 004) avec `upsert … ignoreDuplicates`. `record_incoming` : `pg_advisory_xact_lock` + court-circuit sur `wa_message_id` déjà vu. Index unique `unique_meta_event`. Test `delivery-integrity` R09. |
| R10 — cohérence interclients | Corrigé | Clés `(id, client_id)` + FK composites `messages/reservations/optouts → contacts/campaigns` (migration 003). Test `delivery-integrity` R10. |
| R11 — consentement mal typé | Corrigé | `src/lib/contracts.ts` : `consent: z.boolean()` strict, `consent_source` requis (3–300 car.). Route contacts : `consent !== true` → 400. Contrainte `contact_stop_check`. |
| R12 — suppression ≠ anonymisation | Corrigé | Trigger `anonymize_contact_history` (migration 003) : `before delete on contacts` efface `messages.body/error`, `reservations.details`, `optouts.original_message`. Test `delivery-integrity` R12. |
| R13 — dépendances hors support | Corrigé | Next `16.3.4`, React `19.2.8`, `package-lock.json` présent. `csv-parse` (parsing conforme), `sharp` (validation image), `zod`. CI lance `npm audit --audit-level=high`. |
| R14 — dates sans fuseau | Corrigé | `contracts.ts` : `z.iso.datetime({ offset: true })` — offset obligatoire. `computeReminderAt` valide `Date.parse`. Front (`campagnes/nouvelle`) : `toInstant()` fige l'heure murale `datetime-local` en instant UTC avant l'API. |
| R15 — listes tronquées | Partiel | `src/lib/resources.js` : `paging()` (max 500) + `allRows()` (pagination 500 par lot, plafond 100 000). Migration 005 : index trigram + `contacts (client_id, created_at)`. **Reste** : `EXPLAIN` sur volumes réels. |
| R16 — résilience pannes externes | Corrigé | Timeouts explicites : `fetch` Supabase 8 s (`src/lib/supabase.js`), IA 6 s, Meta 8 s. IA : `try/catch` réseau → fallback gabarits. Meta : jamais de retry auto, statut `unknown` isolé. |
| R17 — réservations/réponses sans traitement | Corrigé | `PATCH /api/reservations/[id]` (statut), `PATCH /api/messages/[id]` (`handled`), `POST /api/messages/[id]/reply` (réponse manuelle : `sendText()` message de session, log `kind='manual'`, `handled=true`, simulé en mode démo). Page détail campagne : Confirmer / Annuler une réservation, zone de réponse pré-remplie par `suggestedReply()` avec Envoyer / Classer sans répondre / Rouvrir, compteur « à traiter ». `sendText()` et `suggestedReply()` sont désormais reliés à un parcours. |
| R18 — succès/stats trompeurs | Corrigé | `src/app/api/stats/route.js` réécrit avec `api()` + contrôle d'erreur → 503 au lieu de zéros silencieux. `finish_campaign_message` échoue si le `dispatch_token` ne correspond pas (pas de faux « sent »). |
| R19 — sauvegarde/restauration | Partiel | `docs/04-configuration-supabase.md` corrigé + `scripts/backup.sh` (`pg_dump` custom, vérif `pg_restore --list`, purge rétention, checklist Storage + test de restore trimestriel avec rapprochement `wa_message_id`). **Reste** : brancher le cron sur une machine tierce et exécuter un premier test de restauration réel. |
| R20 — upload validé par extension | Corrigé | `src/app/api/upload/route.js` : `api()` (auth + origine + `rateLimit` 60/h), décodage/ré-encodage `sharp` en WebP, rejet fichier vide, limite 4096 px/côté, redimension ≤ 1600 px. |

## Vague 4 — durcissement transverse

| Élément | État | Détail |
|---|---|---|
| En-têtes de sécurité | Corrigé | `next.config.mjs` `headers()` : CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. `poweredByHeader: false`. Vérifiés sur `next start`. |
| Sonde de santé | Corrigé | `GET /api/health` (public) : 200 si base joignable, 503 sinon + fraîcheur du scheduler. Aucune fuite d'info. |
| `.env.example` / `.gitignore` | Corrigé | Placeholders volontairement invalides (échec fermé). `.gitignore` couvre `.env` et `.env.*` sauf `.env.example`. `APP_URL` documenté. |
| Responsive | Corrigé | `Sidebar` : tiroir superposé + barre supérieure `< md`, `aria-current` sur le lien actif. Layout `flex-col md:flex-row`. |
| Accessibilité formulaires | Corrigé | Composant `src/components/Field.js` : `<label>` enveloppant libellé + contrôle. Appliqué à login, clients, contacts, création de campagne. `jsx-a11y/recommended` vert. |
| Accessibilité — divers | Corrigé | Import CSV : input `sr-only` (focusable au clavier) + `focus-within:ring`. Contrastes : `text-gray-400` → `text-gray-500` (≥ 4.5:1) partout. États d'erreur de liste distincts de « aucun résultat » sur dashboard, campagnes, contacts, clients (`role="alert"`). |

## Ouvert (nécessite un environnement réel ou une décision produit)

Procédure complète et ordonnée : **`docs/14-go-live.md`**.

- **R02** — appliquer `schema.sql` + migrations sur le Supabase réel, puis vérifier la fermeture des accès (`set role anon; select …` → `permission denied`). Runbook §1.
- **Recette réelle** — parcours Meta de bout en bout : templates approuvés, image / sans image, statuts non régressifs, STOP, message de session, rejeu webhook, envois concurrents. Runbook §5.
- **R19** — brancher `scripts/backup.sh` en cron hors compte Supabase + premier test de restauration réel avec rapprochement Meta. Runbook §6.
- **R15 (perf)** — exécuter `supabase/EXPLAIN.sql` sur une copie à volumes représentatifs ; viser zéro `Seq Scan` sur `contacts` / `messages`. Runbook §8.
- **Déploiement** — cron horaire (`vercel.json`, compatible Hobby ; Pro requis pour 5 min), HTTPS, `scripts/smoke.sh` vert après chaque mise en prod. Runbook §3–4.
- **Observabilité** — collecteur d'erreurs + alertes `/api/health` et cron muet. Runbook §7.
- **Rollback** — redeploy testé + compatibilité descendante des migrations. Runbook §9.
