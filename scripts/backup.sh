#!/usr/bin/env bash
# Sauvegarde de la base Djeli's Promo AI vers un stockage HORS du compte Supabase.
# Le plan gratuit Supabase ne garantit pas de sauvegarde restaurable : ce script
# doit tourner en cron (ex. quotidien) sur une machine tierce.
#
# Prérequis : pg_dump >= 15, variable DIRECT_URL (Supabase > Settings > Database >
# pooler en mode SESSION, port 5432 — pg_dump ne fonctionne pas via le pooler en
# mode transaction / pgbouncer). Optionnel : BACKUP_DIR (défaut ./backups).
#
# Usage : DIRECT_URL="postgresql://...:5432/postgres" ./scripts/backup.sh
set -euo pipefail

: "${DIRECT_URL:?Définir DIRECT_URL (pooler mode session, port 5432)}"
case "$DIRECT_URL" in
  *:6543*|*pgbouncer=true*) echo "DIRECT_URL vise le pooler transaction — utiliser le port 5432." >&2; exit 1 ;;
esac
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/djelis-${STAMP}.dump"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

echo "→ Dump vers ${OUT}"
pg_dump "${DIRECT_URL}" \
  --format=custom \
  --no-owner --no-privileges \
  --schema=public \
  --file="${OUT}"

# Vérifie que l'archive est lisible (table des matières non vide).
pg_restore --list "${OUT}" > /dev/null
echo "→ Archive vérifiée ($(du -h "${OUT}" | cut -f1))"

# Purge des dumps plus vieux que RETENTION_DAYS.
find "${BACKUP_DIR}" -name 'djelis-*.dump' -mtime "+${RETENTION_DAYS}" -delete || true

cat <<'NOTE'

À FAIRE MANUELLEMENT (non couvert par ce script) :
  1. Copier BACKUP_DIR vers un stockage distant (S3, rclone, disque hors site).
  2. Sauvegarder le bucket Storage "visuels" séparément :
       supabase storage cp --recursive ss://visuels ./backups/visuels-<stamp>/
     (ou via l'API Storage) — il n'est PAS inclus dans le dump PostgreSQL.
  3. Tester une restauration réelle chaque trimestre :
       createdb djelis_restore_test
       pg_restore --dbname=djelis_restore_test --no-owner ./backups/djelis-<stamp>.dump
     puis rapprocher les wa_message_id des messages 'sent' avec l'historique Meta
     avant toute remise en service (risque de renvoi de messages déjà livrés).
NOTE
