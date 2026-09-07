# Configuration Supabase

1. **Créer le projet** : https://supabase.com → New project (région EU West de préférence, RGPD). Notez le mot de passe base de données.
2. **Exécuter le schéma** : SQL Editor → New query → coller `supabase/schema.sql` → Run. Cela crée les 7 tables, la vue `campaign_stats`, le bucket `visuels`, active RLS et retire les accès `public/anon/authenticated`.
3. **Appliquer les migrations** : dans l'ordre numérique, exécuter chaque fichier de `supabase/migrations/` (`001` → `005`). Elles ajoutent les sessions, la limitation de débit, l'intégrité des envois, la file webhook et les index de recherche. À rejouer sur toute base déjà en service.
4. **Données de démo** (facultatif, hors production) : même procédé avec `supabase/seed-demo.sql`. Le seed **n'est pas idempotent** pour les campagnes — ne pas le lancer deux fois sur la même base.
5. **Vérifier le bucket** : Storage → le bucket `visuels` doit exister et être **public** (les URLs des affiches sont envoyées à Meta). Sinon : New bucket → nom `visuels` → Public.
6. **Récupérer les clés** : Settings → API :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`
7. **Vérifier les accès directs** : SQL Editor →
   ```sql
   set role anon;        select * from public.contacts;  -- doit échouer : permission denied
   reset role;
   ```
   Rejouer avec `authenticated`. Toute lecture/écriture qui réussit signale un grant à retirer.

⚠ La clé `service_role` contourne RLS : uniquement dans `.env.local` / variables Vercel, jamais dans le code ni côté navigateur. L'application n'utilise pas la clé `anon` : tous les accès passent par les routes API serveur.

## RLS (Row Level Security)

**Activé** par `schema.sql` et `migrations/001_private_access.sql` : RLS sur les 7 tables + `admin_sessions`, `rate_limits`, `webhook_inbox`, aucune policy pour `anon`/`authenticated`, `grant` réservé à `service_role`, vue `campaign_stats` en `security_invoker`. Le seul chemin d'accès légitime est la clé `service_role` côté serveur.

Pour ouvrir plus tard un accès direct (portail client final) : ajouter des policies par `client_id` sur chaque table concernée, jamais retirer le `revoke`.

## Sauvegardes

- **Le plan gratuit ne garantit pas de sauvegarde restaurable** ([doc officielle](https://supabase.com/docs/guides/platform/backups)). Les sauvegardes quotidiennes / PITR sont réservées aux plans payants. Sur plan gratuit : planifier `scripts/backup.sh` (`pg_dump` format custom + vérification `pg_restore --list`) en cron sur une machine tierce, puis copier les dumps vers un stockage **hors du compte Supabase**.
- **Le Storage n'est pas inclus** dans la sauvegarde de la base : sauvegarder le bucket `visuels` séparément.
- **Tester la restauration**, pas seulement le démarrage de PostgreSQL : une sauvegarde ancienne peut restaurer des marqueurs d'envoi (`main_sent_at`, `status`) désynchronisés de la réalité chez Meta → risque de renvoi. Prévoir un rapprochement des `wa_message_id` après restore.
- **RPO / RTO** : à définir explicitement (fréquence des exports = perte maximale acceptable ; durée de restauration testée = indisponibilité maximale).

## RGPD — effacement d'un contact

La suppression d'un contact déclenche le trigger `anonymize_contact_history` (`migrations/003_delivery_integrity.sql`) : `messages.body`, `messages.error`, `reservations.details` et `optouts.original_message` sont vidés, les envois encore en file passent en `skipped`. Les lignes `messages`/`reservations` sont conservées sans contenu identifiant (statistiques). Vérifier après suppression qu'aucun nom / téléphone du contact ne subsiste dans les textes libres.

## Purge

Pas de purge automatique. À planifier (Supabase scheduled function ou cron applicatif) : messages et visuels au-delà de la durée de conservation retenue (ex. 24 mois).
