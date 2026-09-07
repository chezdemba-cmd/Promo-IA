# DJELI'S PROMO AI — MVP

L'agent IA qui transforme vos contacts en clients présents, réservations et ventes grâce à WhatsApp Business, l'automatisation et l'intelligence artificielle.

## Qu'est-ce que c'est ?

Application web multi-client permettant à une agence de communication de gérer, pour chacun de ses clients (restaurants, salons, boutiques, associations, organisateurs d'événements, PME) :

- une base de contacts avec consentement RGPD ;
- des campagnes WhatsApp (message principal + rappel automatique) ;
- la génération IA des messages (Claude API, adaptable) ;
- l'envoi via l'API officielle **WhatsApp Business Cloud API** (jamais WhatsApp Web automatisé) ;
- la classification IA des réponses (intéressé, réservation, question, STOP…) ;
- la gestion des réservations et des désinscriptions ;
- des statistiques simples par campagne ;
- un **mode démo** complet pour présenter le produit sans identifiants Meta.

## Stack

Next.js 14 (App Router, JavaScript) · Tailwind CSS · Supabase (PostgreSQL + Storage) · Claude API · WhatsApp Business Cloud API · Vercel (hébergement + cron).

## Démarrage rapide

```bash
npm install
cp .env.example .env.local   # remplir les variables (voir docs/04-configuration-supabase.md)
# Exécuter supabase/schema.sql puis supabase/seed-demo.sql dans l'éditeur SQL Supabase
npm run dev                   # http://localhost:3000 — mot de passe admin défini dans .env.local
```

Sans clé Claude ni identifiants Meta, l'application fonctionne intégralement en **mode démo** : génération de messages par gabarits, envois simulés, réponses simulées, statistiques réalistes.

## Documentation

| Fichier | Contenu |
|---|---|
| docs/01-faisabilite.md | Analyse de faisabilité |
| docs/02-architecture.md | Architecture technique, Option A vs B |
| docs/03-plan-developpement.md | Plan de développement étape par étape |
| docs/04-configuration-supabase.md | Setup base de données + storage |
| docs/05-configuration-meta.md | Setup WhatsApp Cloud API pas à pas |
| docs/06-deploiement.md | Déploiement Vercel + cron |
| docs/07-templates-whatsapp.md | Templates à faire approuver par Meta |
| docs/08-plan-de-test.md | Plan de test |
| docs/09-risques.md | Risques techniques et juridiques |
| docs/10-rgpd.md | Conformité RGPD/CNIL |
| docs/11-business.md | Tarifs, argumentaire PME, script de démo |
| docs/12-exemples-campagnes.md | Exemples de campagnes par secteur |
| supabase/schema.sql | Schéma SQL complet |
| supabase/seed-demo.sql | Données de démonstration (5 secteurs) |

## Structure du code

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── login/              # Connexion admin
│   ├── (app)/              # Pages protégées (sidebar commune)
│   │   ├── dashboard/      # Vue globale agence
│   │   ├── clients/        # Gestion des clients
│   │   ├── contacts/       # Contacts + import CSV
│   │   ├── campagnes/      # Liste, création, détail
│   │   └── parametres/     # Clés API, mode démo
│   └── api/                # Routes API backend
│       ├── auth/           # Login/logout
│       ├── clients/        # CRUD clients
│       ├── contacts/       # CRUD + import CSV
│       ├── campaigns/      # CRUD + envoi + simulation
│       ├── generate/       # Génération IA des messages
│       ├── webhook/whatsapp/ # Réception messages + statuts Meta
│       ├── cron/scheduler/ # Envois programmés + rappels
│       └── stats/          # Statistiques dashboard
├── lib/                    # Logique métier (Supabase, IA, WhatsApp, téléphone)
└── components/             # Composants UI réutilisables
```

## Règles absolues intégrées au code

1. Jamais d'envoi à un contact `STOP` ou sans consentement (`src/lib/campaigns.js`).
2. Uniquement l'API officielle Meta (`src/lib/whatsapp.js`).
3. Chaque message sortant mentionne STOP.
4. Pas de promotion directe d'alcool dans les messages générés (prompt IA).
5. Toutes les données sont cloisonnées par `client_id`.
