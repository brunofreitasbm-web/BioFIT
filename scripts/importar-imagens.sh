#!/usr/bin/env bash
# Baixa as fotos de início/fim de movimento do free-exercise-db (yuhonas, Unlicense) para as
# pastas usadas em `apps/treino/lib/exercicios.ts` (mapa IMAGENS) e reduz para 320px.
# Uso: scripts/importar-imagens.sh   (requer curl e ImageMagick `convert`)
set -euo pipefail

BASE="https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
DESTINO="$(cd "$(dirname "$0")/.." && pwd)/apps/treino/public/exercicios"
CATALOGO="$(cd "$(dirname "$0")/.." && pwd)/apps/treino/lib/exercicios.ts"

# Pastas = valores entre aspas do bloco IMAGENS.
pastas=$(sed -n '/^const IMAGENS/,/^};/p' "$CATALOGO" | grep -oE ':\s*"[^"]+"' | grep -oE '"[^"]+"' | tr -d '"' | sort -u)

for pasta in $pastas; do
  mkdir -p "$DESTINO/$pasta"
  for i in 0 1; do
    alvo="$DESTINO/$pasta/$i.jpg"
    [ -s "$alvo" ] && continue
    tmp=$(mktemp)
    curl -fsSL "$BASE/$pasta/$i.jpg" -o "$tmp"
    convert "$tmp" -resize 320x320 -strip -quality 75 -interlace JPEG "$alvo"
    rm -f "$tmp"
  done
  echo "ok $pasta"
done
