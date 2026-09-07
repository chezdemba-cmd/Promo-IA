#!/usr/bin/env bash
# Smoke test post-déploiement : à lancer contre l'URL réelle après chaque mise en prod.
# Ne touche à aucune donnée (lectures + vérifs d'accès uniquement).
#
# Usage : BASE_URL="https://promo.mondomaine.fr" ./scripts/smoke.sh
#         BASE_URL=... ADMIN_PASSWORD=... ./scripts/smoke.sh   # teste aussi le login
set -uo pipefail

: "${BASE_URL:?Définir BASE_URL (URL du déploiement)}"
BASE_URL="${BASE_URL%/}"
fail=0
pass() { printf '  ok   %s\n' "$1"; }
ko()   { printf '  KO   %s\n' "$1"; fail=1; }

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
header() { curl -s -D - -o /dev/null "$1" | tr -d '\r' | grep -i "^$2:"; }

echo "== $BASE_URL =="

# 1. Santé
h="$(code "$BASE_URL/api/health")"
[ "$h" = 200 ] && pass "GET /api/health -> 200" || ko "GET /api/health -> $h (attendu 200 ; 503 = base injoignable)"
curl -s "$BASE_URL/api/health" | grep -q '"database":"ok"' && pass "/api/health : database ok" || ko "/api/health : database != ok"

# 2. Page de login servie
[ "$(code "$BASE_URL/login")" = 200 ] && pass "GET /login -> 200" || ko "GET /login -> $(code "$BASE_URL/login")"

# 3. Redirection / 401 sans session
r="$(code "$BASE_URL/dashboard")"
[ "$r" = 307 ] || [ "$r" = 302 ] && pass "GET /dashboard sans cookie -> $r (redirection)" || ko "GET /dashboard sans cookie -> $r (attendu 307/302)"
a="$(code "$BASE_URL/api/clients")"
[ "$a" = 401 ] && pass "GET /api/clients sans cookie -> 401" || ko "GET /api/clients sans cookie -> $a (attendu 401)"

# 4. En-têtes de sécurité sur /login
for hdr in "content-security-policy" "strict-transport-security" "x-content-type-options" "x-frame-options" "referrer-policy" "permissions-policy"; do
  header "$BASE_URL/login" "$hdr" >/dev/null && pass "en-tête $hdr présent" || ko "en-tête $hdr absent"
done
header "$BASE_URL/login" "x-powered-by" >/dev/null && ko "x-powered-by exposé (devrait être masqué)" || pass "x-powered-by masqué"

# 5. Webhook et cron fermés si secrets configurés (doivent renvoyer 403/401/503, jamais 200)
w="$(code -X POST "$BASE_URL/api/webhook/whatsapp" -H 'content-type: application/json' -d '{}')"
[ "$w" != 200 ] && pass "POST /api/webhook/whatsapp non signé -> $w (refusé)" || ko "POST /api/webhook/whatsapp non signé -> 200 (FAILLE)"
c="$(code "$BASE_URL/api/cron/scheduler")"
[ "$c" != 200 ] && pass "GET /api/cron/scheduler sans Bearer -> $c (refusé)" || ko "GET /api/cron/scheduler sans Bearer -> 200 (FAILLE)"

# 6. Login (optionnel)
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  jar="$(mktemp)"
  ok="$(curl -s -o /dev/null -w '%{http_code}' -c "$jar" -X POST "$BASE_URL/api/auth/login" \
        -H 'content-type: application/json' -H "origin: $BASE_URL" \
        -d "{\"password\":\"$ADMIN_PASSWORD\"}")"
  [ "$ok" = 200 ] && pass "login mot de passe correct -> 200" || ko "login -> $ok (attendu 200)"
  me="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$BASE_URL/api/clients")"
  [ "$me" = 200 ] && pass "GET /api/clients avec session -> 200" || ko "GET /api/clients avec session -> $me"
  curl -s -b "$jar" -X POST "$BASE_URL/api/auth/logout" -H "origin: $BASE_URL" >/dev/null
  after="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$BASE_URL/api/clients")"
  [ "$after" = 401 ] && pass "après logout, cookie rejoué -> 401 (session révoquée)" || ko "après logout, cookie rejoué -> $after (attendu 401 — R03)"
  rm -f "$jar"
fi

echo
[ "$fail" = 0 ] && echo "SMOKE OK" || { echo "SMOKE ÉCHEC"; exit 1; }
