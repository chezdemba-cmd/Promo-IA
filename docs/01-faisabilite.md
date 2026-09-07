# DJELI'S PROMO AI — Analyse de faisabilité

## Verdict

**Faisable en MVP avec la stack demandée.** Aucun verrou technique. Les deux vrais points de friction sont administratifs, pas techniques :

1. **Onboarding Meta par client (Option B choisie)** : chaque client doit avoir un compte WhatsApp Business (WABA) vérifié, un numéro dédié et des templates approuvés par Meta (24-48h par template). C'est le chemin critique commercial → le **mode démo** est indispensable pour vendre avant que le WABA du client soit prêt.
2. **Conformité RGPD/CNIL** : la prospection par WhatsApp est du marketing direct électronique → consentement préalable obligatoire (opt-in), traçabilité, STOP effectif. Le produit intègre ces règles nativement (voir docs/10-rgpd.md).

## Points clés validés

| Sujet | Faisabilité | Note |
|---|---|---|
| Envoi WhatsApp | ✅ | Cloud API officielle Meta ; messages *template* obligatoires pour initier une conversation |
| Images/affiches | ✅ | Header IMAGE dans les templates, ou message media dans la fenêtre de 24h |
| Réception réponses | ✅ | Webhook Meta (messages + statuses) |
| Classification IA | ✅ | Claude Haiku suffit ; fallback par mots-clés si pas de clé API |
| Génération IA | ✅ | Claude ; fallback par gabarits sectoriels |
| Rappels programmés | ✅ | Vercel Cron toutes les 5 min → campagnes dues |
| Multi-client | ✅ | `client_id` sur toutes les tables, credentials WhatsApp par client |
| Mode démo | ✅ | Envois « simulés » stockés en base, simulateur de réponses |

## Contraintes Meta à connaître

- **Templates obligatoires** hors fenêtre de 24h après le dernier message entrant du contact. Toute campagne sortante = template approuvé.
- **Quotas progressifs** : un nouveau numéro démarre à 250 conversations initiées/24h, monte à 1K/10K/100K selon la qualité. À expliquer aux clients.
- **Qualité du numéro** : trop de blocages/signalements = numéro restreint. La gestion stricte des consentements et des STOP protège le business.
- **Tarification Meta** : facturation par template *marketing* délivré (~0,06–0,12 € en France) ; catégorie *utility* moins chère pour les rappels de RDV. À intégrer dans les prix de l'agence.
- **Alcool** : la politique commerce de Meta restreint la promotion d'alcool → les messages « bar » parlent de l'événement (match, soirée), jamais de l'alcool. Garde-fou intégré dans les prompts IA.

## Risque principal du MVP

Dérive vers le spam par les clients finaux. Protections : consentement obligatoire à l'import, blocage absolu des STOP, séparation stricte par client, charte d'usage signée (voir docs/11-business.md). Détail complet : docs/09-risques.md.
