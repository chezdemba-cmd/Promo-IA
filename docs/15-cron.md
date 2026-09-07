# Planification (cron)

Le scheduler `/api/cron/scheduler` traite : file webhook entrante, envois de
campagnes dues, rappels, nettoyage des sessions expirées. Plus il tourne souvent,
plus les envois et réponses sont réactifs.

## Sur Vercel

`vercel.json` déclare un cron **quotidien** (`0 6 * * *`, 06:00 UTC) — c'est la
**seule fréquence autorisée par le plan Hobby**. Le plan Pro permet `*/5 * * * *`
(toutes les 5 min) : dans ce cas, modifier `vercel.json` et redéployer.

Vercel ajoute automatiquement l'en-tête `Authorization: Bearer $CRON_SECRET`
si la variable `CRON_SECRET` existe — rien d'autre à configurer.

## Cron externe gratuit (recommandé en Hobby)

Pour des envois toutes les 5 minutes sans payer Vercel Pro, un service tiers
appelle le même endpoint.

### cron-job.org (gratuit, sans carte)

1. Créer un compte sur https://cron-job.org
2. **Create cronjob** :
   - **Title** : `Djelis scheduler`
   - **URL** : `https://<ton-domaine-vercel>/api/cron/scheduler`
   - **Schedule** : toutes les 5 minutes (`*/5`)
   - **Advanced → Headers** : ajouter
     `Authorization: Bearer <valeur exacte de CRON_SECRET>`
   - **Request method** : `GET`
3. Enregistrer, puis **Test run** → doit renvoyer `200` avec un JSON
   `{"processed":…,"campaign":…}`.

L'endpoint est idempotent et protégé par le secret : le faire appeler à la fois
par Vercel (1×/jour) et par cron-job.org (toutes les 5 min) ne pose aucun problème.

### Alternatives équivalentes

- **GitHub Actions** : un workflow `schedule: cron('*/5 * * * *')` qui fait
  `curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/scheduler`
  (secret dans les *Repository secrets*).
- **Upstash QStash**, **EasyCron**, **Val Town** : même principe.

## Surveillance

Chaque exécution réussie écrit `settings.scheduler_last_success`.
`/api/health` renvoie `scheduler: "stale"` si cette valeur dépasse
`SCHEDULER_STALE_MS` (défaut 26 h ; à baisser via variable d'env si un cron
externe fréquent est en place, ex. `SCHEDULER_STALE_MS=1800000` pour 30 min).
