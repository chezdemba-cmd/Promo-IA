# Runbook de mise en production

Procédure ordonnée. Le code est prêt (`npm run verify` vert, 14 tests) ; ce qui suit
se fait sur les environnements réels. Cocher au fur et à mesure.

> Détail des risques et de leur correction : `docs/13-remediation.md`.

---

## 0. Pré-requis locaux

- [ ] `npm ci && npm run verify` passe (lint + typecheck + tests + build).
- [ ] `npm audit --audit-level=high` → 0 vulnérabilité.
- [ ] Dépôt Git initialisé, CI `.github/workflows/ci.yml` active et verte sur la branche.

---

## 1. Base Supabase — `R02`

- [ ] Projet créé en région UE (RGPD).
- [ ] Schéma + migrations appliqués, **au choix** :
  - `DIRECT_URL="…pooler…:5432/postgres" npm run db:migrate:dry` (aperçu) puis `npm run db:migrate` — idempotent, tient un journal `schema_migrations` ; **utiliser le port 5432 (mode session)**, pas 6543 ;
  - ou SQL Editor : coller `supabase/schema.sql` puis chaque `supabase/migrations/00N_*.sql` dans l'ordre.
- [ ] Storage → bucket `visuels` existe et est **public**.
- [ ] **Vérifier la fermeture des accès directs** :
      ```sql
      set role anon;          select * from public.contacts;   -- doit échouer : permission denied
      set role authenticated; select * from public.campaign_stats; -- doit échouer
      reset role;
      ```
      Toute requête qui réussit = grant à retirer.
- [ ] `seed-demo.sql` **non** exécuté sur la base de prod (démo uniquement).

## 2. Variables d'environnement (Vercel → Settings → Environment Variables)

Toutes obligatoires ; l'application refuse de démarrer / renvoie 503 si une valeur est faible.

- [ ] `SESSION_SECRET` — `openssl rand -hex 32` (≥ 32 car., ≥ 12 car. distincts, pas une valeur d'exemple).
- [ ] `ADMIN_PASSWORD` — ≥ 16 car., unique.
- [ ] `APP_URL` — URL publique exacte (`https://…`), sert au contrôle d'origine des POST.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `WHATSAPP_VERIFY_TOKEN` (≥ 16 car.), `WHATSAPP_APP_SECRET` (≥ 32 car.).
- [ ] `CRON_SECRET` (≥ 32 car.).
- [ ] `ANTHROPIC_API_KEY` (ou vide = fallback gabarits), `AI_MODEL`.
- [ ] `DEMO_MODE` — `true` tant que la recette Meta n'est pas validée.

## 3. Déploiement — `Gate 8`

- [ ] Plan Vercel **compatible cron toutes les 5 min** (Hobby = 1×/jour → insuffisant, voir `vercel.json`).
- [ ] Déploiement effectué, build Vercel vert.
- [ ] DNS + HTTPS OK sur le domaine final.
- [ ] `maxDuration` des routes d'envoi (60 s) compatible avec les limites du plan.
- [ ] Cron Vercel `/api/cron/scheduler` configuré avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.

## 4. Smoke test post-déploiement

- [ ] `BASE_URL="https://…" ADMIN_PASSWORD="…" ./scripts/smoke.sh` → `SMOKE OK`.
      Couvre : `/api/health` 200, `/login` 200, `/dashboard` redirige, `/api/clients` 401,
      6 en-têtes de sécurité présents, `x-powered-by` masqué, webhook/cron fermés,
      login + révocation de session après logout (`R03`).

## 5. Recette Meta / WhatsApp — `Gate 11`

- [ ] Templates approuvés par Meta (`docs/07-templates-whatsapp.md`) ; `wa_template_name` /
      `wa_image_template_name` renseignés sur la fiche du client de test.
- [ ] Sur un numéro de test, `DEMO_MODE=false` pour ce client :
  - [ ] Envoi campagne **avec** image → reçu, header média correct.
  - [ ] Envoi campagne **sans** image → reçu.
  - [ ] Rappel sans image sur template à header média → comportement vérifié.
  - [ ] Statuts `sent` → `delivered` → `read` remontent via webhook (vérifier la non-régression).
  - [ ] Réponse entrante classée (intent) et visible dans « Réponses à traiter ».
  - [ ] **STOP** entrant → `consent=false`, `status=stop`, plus aucun envoi, `optout` créé.
  - [ ] Réponse manuelle depuis l'interface (`POST /api/messages/[id]/reply`) → message de session reçu.
  - [ ] Rejeu du même webhook (même `wa_message_id`) → aucun doublon (`R09`).
- [ ] Deux envois concurrents sur la même campagne → aucun doublon (`R06`).
- [ ] Arrêt en cours d'envoi puis relance → reprise par destinataire, pas de renvoi (`R07`).

## 6. Sauvegarde / restauration — `R19` / `Gate 9`

- [ ] `scripts/backup.sh` planifié en cron sur une machine **hors du compte Supabase** (`DATABASE_URL`).
- [ ] Bucket `visuels` sauvegardé séparément.
- [ ] **Test de restauration réel** : `pg_restore` dans une base jetable + rapprochement des
      `wa_message_id` des messages `sent` avec l'historique Meta avant toute remise en service.
- [ ] RPO / RTO écrits et acceptés.
- [ ] Procédure de réponse à compromission du compte cloud documentée (révocation, rotation).

## 7. Observabilité — `Gate 10`

- [ ] Collecteur d'erreurs branché (les routes loguent `event: request_failed` avec `requestId`).
- [ ] Alerte si `/api/health` ≠ 200.
- [ ] Alerte si `settings.scheduler_last_success` vieillit de plus de ~20 min (cron muet).
- [ ] Politique de rétention des logs définie (les erreurs peuvent contenir du texte libre).

## 8. Performance — `R15` (après mise en charge, non bloquant go-live)

- [ ] `supabase/EXPLAIN.sql` exécuté sur une copie à volumes représentatifs.
- [ ] Aucun `Seq Scan` sur `contacts` / `messages` dans les 10 plans listés.
- [ ] Si la boucle d'envoi dépasse ~quelques milliers de destinataires : découpage en lots validé.

## 9. Rollback — `Gate 12`

- [ ] Redeploy d'une version antérieure testé sur Vercel.
- [ ] Compatibilité descendante des migrations vérifiée (une version N-1 tourne-t-elle sur le schéma N ?).
- [ ] Décision documentée : que faire des messages partis entre la version cassée et le rollback.

---

## Bascule finale

- [ ] `DEMO_MODE` retiré (ou `false`) pour les clients réellement en production.
- [ ] Section 0–7 entièrement cochée.
- [ ] Commit + tag de la version déployée.
