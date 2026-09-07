# Architecture technique

## Vue d'ensemble

Architecture volontairement simple : **une seule application Next.js** (frontend + API routes) déployée sur Vercel, avec Supabase comme base de données et stockage. Pas de backend séparé pour le MVP — moins de coûts, moins de complexité, un seul déploiement.

```
┌────────────────────────  Vercel  ────────────────────────┐
│  Next.js 14 (App Router)                                 │
│                                                          │
│  Pages (React + Tailwind)      API Routes (Node.js)      │
│  ├─ /login                     ├─ /api/auth/*            │
│  ├─ /dashboard                 ├─ /api/clients/*         │
│  ├─ /clients                   ├─ /api/contacts/*  ◄─ CSV│
│  ├─ /contacts                  ├─ /api/campaigns/*       │
│  ├─ /campagnes(+new,+id)       ├─ /api/generate    ◄─ IA │
│  └─ /parametres                ├─ /api/stats             │
│                                ├─ /api/webhook/whatsapp ◄─┼── Meta (réponses + statuts)
│  Vercel Cron (5 min) ─────────►└─ /api/cron/scheduler ───┼─► Meta Graph API (envois)
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
      ┌────────▼─────────┐        ┌────────▼────────┐
      │ Supabase         │        │ Claude API      │
      │ PostgreSQL       │        │ (génération +   │
      │ + Storage(visuels)│       │  classification)│
      └──────────────────┘        └─────────────────┘
```

## Flux principaux

**1. Création + envoi de campagne**
Admin crée la campagne → `/api/generate` produit le message principal + le rappel (IA) → campagne `programmée` avec `send_at` et `reminder_at` calculé (ex. événement samedi 22h − 12h = rappel samedi 10h) → le cron détecte l'échéance → `lib/campaigns.js` filtre les contacts (consentement OK, statut actif, pas STOP, pas déjà envoyé) → `lib/whatsapp.js` envoie le template (ou simule en mode démo) → chaque message est journalisé dans `messages`.

**2. Réception d'une réponse**
Meta POST → `/api/webhook/whatsapp` → identification du client via `phone_number_id`, du contact via son numéro → sauvegarde dans `messages` (direction `in`) → classification IA (`lib/ai.js`) → actions automatiques : STOP → contact bloqué + entrée `optouts` ; RÉSERVATION → entrée `reservations` ; AUTRE → marqué « à traiter ».

**3. Statuts d'envoi**
Meta POST (statuses) → webhook → mise à jour `messages.status` (sent → delivered → read / failed).

## Option A vs Option B (numéros WhatsApp)

| | **Option A : 1 numéro agence** | **Option B : 1 numéro par client** ✅ choisie |
|---|---|---|
| Setup Meta | 1 seule fois | Par client (WABA + vérification + templates) |
| Image de marque | Messages émis « par l'agence » — confusion possible | Le client apparaît sous son propre nom ✔ |
| Quotas Meta | Partagés entre tous les clients — risque de saturation | Isolés par client ✔ |
| Risque de bannissement | Un client abusif pénalise tous les autres ⚠ | Cloisonné ✔ |
| Fenêtre 24h / réponses | Réponses mélangées, routage complexe | Naturellement séparées ✔ |
| Coût / délai d'onboarding | Minimal | Plus lourd (facturable comme prestation setup ✔) |

**Implémentation** : les credentials (`wa_phone_number_id`, `wa_access_token`, `wa_business_account_id`) sont stockés **par client** dans la table `clients`. Un client sans credentials est automatiquement en mode démo. Le webhook route les messages entrants grâce au `phone_number_id` présent dans chaque notification Meta — un seul endpoint suffit pour tous les numéros (ils sont abonnés à la même app Meta ou ajoutés via Embedded Signup plus tard).

## Mode démo

Activé si `demo_mode = true` sur le client **ou** credentials absents **ou** `DEMO_MODE=true` global. Comportement : `lib/whatsapp.js` n'appelle pas Meta, enregistre le message avec statut `simulated`, puis le fait passer à `delivered`/`read` ; `/api/campaigns/[id]/simulate-replies` génère des réponses réalistes (OUI, réserve pour 4, c'est où ?, STOP…) qui passent dans le même pipeline de classification que les vraies. Résultat : démonstration complète de bout en bout, statistiques crédibles, zéro message réel.

## Sécurité (niveau MVP)

- Auth admin : mot de passe unique (`ADMIN_PASSWORD`) → cookie de session signé HMAC, vérifié par `middleware.js` sur toutes les pages et API (sauf webhook et cron).
- Webhook : vérification du `hub.verify_token` (GET) et de la signature `X-Hub-Signature-256` (POST).
- Cron : header `Authorization: Bearer CRON_SECRET`.
- Supabase : clé `service_role` utilisée uniquement côté serveur (jamais exposée au navigateur). RLS non nécessaire au MVP car aucun accès client-side direct à la base.
- Tokens WhatsApp par client : stockés en base, jamais renvoyés au navigateur (masqués dans les réponses API).

## Adaptabilité du fournisseur IA

`src/lib/ai.js` expose deux fonctions (`generateCampaignMessages`, `classifyReply`) et isole l'appel HTTP dans un adaptateur. Passer d'Anthropic à OpenAI/Gemini = réécrire ~20 lignes dans `callProvider()` sans toucher au reste de l'app. Sans clé API : fallback déterministe (gabarits sectoriels + classification par mots-clés) — l'app reste 100 % fonctionnelle.
