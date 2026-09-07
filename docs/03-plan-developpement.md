# Plan de développement étape par étape

Chaque étape produit un résultat testable. Durées indicatives pour un développeur.

## Étape 0 — Fondations (0,5 j)
Créer le projet Next.js, Tailwind, variables d'environnement, projet Supabase, exécuter `supabase/schema.sql`. ✔ Test : `npm run dev` affiche la page de login.

## Étape 1 — Auth admin (0,5 j)
`/api/auth/login`, cookie signé, `middleware.js` protégeant pages et API. ✔ Test : accès refusé sans login, accepté après.

## Étape 2 — Clients (1 j)
CRUD clients + page liste/formulaire (secteur, ton, credentials WhatsApp, mode démo). ✔ Test : créer « Chez Demba ».

## Étape 3 — Contacts + import CSV (1,5 j)
CRUD contacts, filtres, import CSV avec validations (E.164, doublons, consentement obligatoire), modèle CSV téléchargeable. ✔ Test : importer 20 contacts dont 3 invalides → rejets listés.

## Étape 4 — Campagnes + génération IA (2 j)
CRUD campagnes, formulaire de création, upload visuel (Supabase Storage), `/api/generate` (Claude + fallback gabarits), aperçu WhatsApp, calcul automatique de `reminder_at`. ✔ Test : créer une campagne complète avec messages générés.

## Étape 5 — Mode démo (1 j)
Envoi simulé, simulateur de réponses, seed 5 secteurs (`supabase/seed-demo.sql`). ✔ Test : dérouler une démo complète sans identifiants Meta.

## Étape 6 — Envoi WhatsApp réel (1,5 j)
`lib/whatsapp.js` (templates + variables + image), gestion erreurs, filtrage strict des destinataires. ✔ Test : envoi réel sur son propre numéro avec un template approuvé.

## Étape 7 — Webhook + classification (1,5 j)
GET verify, POST signature, routage par `phone_number_id`, classification IA, actions automatiques (STOP, réservation). ✔ Test : répondre STOP → contact bloqué ; « on sera 4 » → réservation créée.

## Étape 8 — Cron rappels (1 j)
`/api/cron/scheduler` : envois initiaux dus + rappels dus, garde-fous (déjà envoyé, événement passé, campagne annulée). ✔ Test : campagne avec send_at dans 2 min → envoyée par le cron.

## Étape 9 — Stats + dashboard (1 j)
Vue `campaign_stats`, `/api/stats`, dashboard agence, détail campagne. ✔ Test : chiffres cohérents après une démo simulée.

## Étape 10 — Déploiement (0,5 j)
Vercel + cron + webhook public configuré chez Meta. ✔ Test : plan de test complet (docs/08).

**Total : ~12 jours.** Priorité de vente : les étapes 0-5 + 9 suffisent pour démarcher (tout en mode démo), les étapes 6-8 s'activent au premier client signé.
