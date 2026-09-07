# Configuration Meta WhatsApp Business Cloud API

À faire **une fois pour l'agence** (app Meta + webhook), puis **par client** (Option B : un numéro par client).

## A. Côté agence (une seule fois)

1. https://developers.facebook.com → My Apps → **Create App** → type « Business ».
2. Dans l'app : Add product → **WhatsApp**.
3. Notez l'**App Secret** (App settings → Basic) → variable `WHATSAPP_APP_SECRET`.
4. **Webhook** : WhatsApp → Configuration →
   - Callback URL : `https://votre-domaine.vercel.app/api/webhook/whatsapp`
   - Verify token : la valeur de `WHATSAPP_VERIFY_TOKEN` (au choix, identique des deux côtés)
   - S'abonner aux champs : `messages` (inclut messages entrants ET statuts).
5. Cliquez « Verify and save » — la route GET du webhook répond automatiquement au challenge.

## B. Par client (Option B)

1. Le client crée (ou vous créez pour lui) un **portfolio Business Manager** vérifié : https://business.facebook.com.
2. Dans votre app Meta (ou via **Embedded Signup** plus tard) : ajouter un numéro WhatsApp au WABA du client. Le numéro ne doit **pas** être déjà utilisé sur l'app WhatsApp classique.
3. Récupérer pour ce client :
   - **Phone Number ID** (WhatsApp → API Setup)
   - **WhatsApp Business Account ID**
   - **Access Token permanent** : Business Settings → Users → System users → créer un system user admin → Generate token avec les permissions `whatsapp_business_messaging` + `whatsapp_business_management`. (Le token temporaire de l'API Setup expire en 24h — ne l'utilisez que pour tester.)
4. Saisir ces 3 valeurs dans DJELI'S PROMO AI → page **Clients** → fiche du client → section « WhatsApp Cloud API » → décocher « Mode démo ».

## C. Templates (par WABA, donc par client)

1. WhatsApp Manager → Message templates → Create template, catégorie **Marketing** (ou **Utility** pour les rappels de RDV).
2. Créez au minimum le template **`djelis_generique`** (utilisé par défaut par le code — voir docs/07-templates-whatsapp.md pour le contenu exact et les variantes).
3. Attendez l'approbation Meta (quelques minutes à 48h).
4. Si vous nommez le template autrement, ajoutez une colonne/valeur `wa_template_name` au client (le code lit `client.wa_template_name`, défaut `djelis_generique`).

## D. Test de bout en bout

1. API Setup fournit un **numéro de test** + 5 destinataires de test : idéal pour valider sans WABA vérifié.
2. Ajoutez votre propre numéro comme destinataire de test, créez un contact avec ce numéro, campagne → « Envoyer maintenant » (mode démo décoché).
3. Répondez « OUI » puis « STOP » depuis votre téléphone : vérifiez la classification et le blocage du contact.

## Limites à retenir

- Nouveau numéro : 250 conversations initiées/24h au départ (montée automatique avec la qualité).
- Hors fenêtre de 24h, seuls les templates approuvés peuvent être envoyés.
- Facturation Meta par conversation template (voir la grille de prix Meta pour la France).
