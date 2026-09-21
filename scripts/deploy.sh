#!/usr/bin/env bash
# Roda NA VPS (chamado pelo GitHub Actions). Uso: bash deploy.sh <sha-da-release>
# Estrutura: ~/concursei/{.env, releases/<sha>, current -> releases/<sha>, backups/}
set -euo pipefail

SHA="${1:?informe o sha da release}"
BASE="${DEPLOY_BASE:-$HOME/concursei}"
REL="$BASE/releases/$SHA"
KEEP=3

[ -f "$BASE/.env" ] || { echo "ERRO: falta $BASE/.env (precisa de TUNNEL_TOKEN=... ou TUNNEL_NETWORK=...)"; exit 1; }
[ -d "$REL" ] || { echo "ERRO: release $REL não existe"; exit 1; }

PREV="$(readlink -f "$BASE/current" 2>/dev/null || true)"

has_var() { grep -Eq "^$1=.+" "$BASE/.env"; }

if has_var TUNNEL_TOKEN; then
  TUNNEL_FILE="docker-compose.tunnel.yml"
elif has_var TUNNEL_NETWORK; then
  TUNNEL_FILE="docker-compose.shared-tunnel.yml"
else
  echo "ERRO: defina TUNNEL_TOKEN (túnel próprio) ou TUNNEL_NETWORK (túnel existente) em $BASE/.env"
  exit 1
fi

compose_up() {
  (cd "$1" && docker compose -p concursei --env-file "$BASE/.env" -f docker-compose.vps.yml -f "$TUNNEL_FILE" up -d --build --remove-orphans)
}

point_current() {
  ln -sfn "$1" "$BASE/current.tmp"
  mv -T "$BASE/current.tmp" "$BASE/current"
}

healthy() {
  for _ in $(seq 1 40); do
    api="$(docker inspect -f '{{.State.Health.Status}}' estudo-api 2>/dev/null || echo none)"
    web="$(docker inspect -f '{{.State.Health.Status}}' estudo-web 2>/dev/null || echo none)"
    [ "$api" = healthy ] && [ "$web" = healthy ] && return 0
    sleep 3
  done
  return 1
}

echo "==> Backup do banco antes do deploy"
if docker ps --format '{{.Names}}' | grep -qx estudo-api; then
  bash "$REL/scripts/backup.sh" "$BASE/backups" || echo "AVISO: backup falhou, seguindo mesmo assim"
else
  echo "(primeiro deploy, nada para salvar)"
fi

echo "==> Publicando release $SHA"
point_current "$REL"
compose_up "$REL"

if healthy; then
  echo "==> OK: release $SHA no ar"
  ls -1dt "$BASE"/releases/* | tail -n +$((KEEP + 1)) | xargs -r rm -rf
  docker image prune -f >/dev/null || true
  exit 0
fi

echo "==> FALHOU: containers não ficaram saudáveis"
docker compose -p concursei ps || true
docker logs --tail 40 estudo-api 2>&1 || true
if [ -n "$PREV" ] && [ -d "$PREV" ] && [ "$PREV" != "$REL" ]; then
  echo "==> Rollback para $PREV"
  point_current "$PREV"
  compose_up "$PREV"
  healthy && echo "==> Rollback concluído" || echo "==> ATENÇÃO: rollback também não ficou saudável"
fi
exit 1
