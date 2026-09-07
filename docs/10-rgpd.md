# Conformité RGPD / CNIL

## Principes appliqués dans le produit

**Base légale : consentement (opt-in).** La prospection par messagerie est du marketing direct électronique : consentement préalable, spécifique et traçable. Techniquement :

- impossible de créer/importer un contact marketing sans `consent = true` (refus API + rejet CSV) ;
- `consent_source` et `consent_date` conservés pour chaque contact (preuve) ;
- un contact créé automatiquement depuis un message entrant est enregistré **sans** consentement marketing (il a écrit, il n'a pas accepté d'être démarché) et ne recevra donc aucune campagne.

**Désinscription simple et effective.** Chaque message mentionne STOP. La détection STOP est déterministe (mots-clés, prioritaire sur l'IA), immédiate (statut `stop`, `consent = false`), définitive (filtre bloquant dans `lib/campaigns.js`), et tracée dans `optouts` (date, message original, campagne, client).

**Minimisation.** Seules les données utiles sont collectées : prénom, nom, téléphone, email optionnel, catégorie, ville. Pas de date de naissance, pas de données sensibles.

**Droits des personnes.** Suppression d'un contact en un clic (les messages historiques sont anonymisés : `contact_id → null`). Export possible via Supabase pour le droit d'accès/portabilité.

**Sécurité.** Accès admin authentifié, secrets en variables d'environnement, token WhatsApp jamais exposé au navigateur, webhook signé, données cloisonnées par client.

**Interdictions intégrées.** Pas de scraping (aucune fonctionnalité de collecte) ; pas de WhatsApp Web automatisé (uniquement l'API officielle) ; pas de ciblage des mineurs ; pas de promotion directe d'alcool (consigne IA + relecture humaine).

## Obligations de l'agence (hors produit)

1. **Registre des traitements** : ajouter le traitement « campagnes WhatsApp pour le compte de clients » (l'agence est sous-traitant, le client final responsable de traitement).
2. **Contrat de sous-traitance (art. 28 RGPD)** avec chaque client : finalités, durées, sous-traitants ultérieurs (Supabase, Vercel, Meta, Anthropic).
3. **Information des personnes** : le client final doit informer ses contacts au moment de la collecte (mention sur le formulaire, la carte de fidélité, etc.).
4. **Durée de conservation** : recommandé 3 ans après le dernier contact actif ; purge des messages > 24 mois.
5. **Charte d'usage** signée par le client : engagement sur l'origine licite des contacts (modèle d'engagement dans docs/11-business.md).
