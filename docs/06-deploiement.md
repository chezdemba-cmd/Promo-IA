# Déploiement (Vercel)

Le MVP tient entièrement sur Vercel (frontend + API + cron) + Supabase. Railway/Render ne sont pas nécessaires — à envisager seulement si les envois dépassent la durée max d'une fonction Vercel (grosses listes → passer à une file BullMQ sur Railway).

## Étapes

1. Pousser le code sur GitHub :
   ```bash
   git init && git add . && git commit -m "MVP DJELI'S PROMO AI"
   git remote add origin https://github.com/votre-compte/djelis-promo-ai.git
   git push -u origin main
   ```
2. https://vercel.com → Add New Project → importer le repo. Framework détecté : Next.js, aucun réglage à changer.
3. **Environment Variables** : copier toutes les variables de `.env.example` avec les vraies valeurs (ADMIN_PASSWORD, SESSION_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, CRON_SECRET, DEMO_MODE).
4. Deploy. Notez l'URL de production.
5. **Cron** : `vercel.json` déclare `/api/cron/scheduler` toutes les heures (`0 * * * *`, compatible Hobby ; passer à `*/5 * * * *` nécessite un plan Pro) — Vercel l'active automatiquement au déploiement et ajoute le header `Authorization: Bearer $CRON_SECRET` si la variable `CRON_SECRET` existe.
6. **Webhook Meta** : configurer la Callback URL avec l'URL de production (docs/05, section A.4).

## Vérifications post-déploiement

- `https://votre-app.vercel.app/login` → connexion OK.
- Vercel → Deployments → Functions → `/api/cron/scheduler` s'exécute chaque heure sans erreur.
- Meta → Webhook → « Test » → l'événement apparaît dans les logs Vercel.

## Passage démo → réel

`DEMO_MODE=false` dans Vercel + credentials WhatsApp renseignés sur le client + case « Mode démo » décochée. Rien d'autre à redéployer (juste « Redeploy » pour recharger les variables).
