#!/usr/bin/env bash
# Backup consistente do SQLite (usa a API de backup do better-sqlite3, seguro com o app rodando).
# Uso: scripts/backup.sh [pasta-destino]   (padrão: ./backups) — mantém os 14 mais recentes.
set -euo pipefail
DEST="${1:-./backups}"
CONTAINER="${CONTAINER:-estudo-api}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
docker exec "$CONTAINER" node -e "
const D=require('better-sqlite3');
new D('/app/data/data.db').backup('/tmp/backup.db').then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
"
docker cp "$CONTAINER:/tmp/backup.db" "$DEST/concursei-$STAMP.db"
docker exec "$CONTAINER" rm -f /tmp/backup.db
ls -1t "$DEST"/concursei-*.db | tail -n +15 | xargs -r rm -f
echo "Backup salvo em $DEST/concursei-$STAMP.db"
