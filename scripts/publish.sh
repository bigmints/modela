#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

catalogue_files=(
  public/data/audio-generation.json
  public/data/catalog.json
  public/data/chat.json
  public/data/embeddings.json
  public/data/hosted-free.json
  public/data/image-generation.json
  public/data/index.json
  public/data/transcription.json
  public/data/tts.json
  public/data/video-generation.json
)

git add -- "${catalogue_files[@]}"
if git diff --cached --quiet; then
  echo '{"published":false,"reason":"catalogue_unchanged"}'
  exit 0
fi

git commit -m "chore(catalog): refresh model catalogue"
git pull --rebase origin HEAD || { echo '{"published":false,"reason":"rebase_failed"}'; exit 1; }
git push origin HEAD || { echo '{"published":false,"reason":"push_failed"}'; exit 1; }
echo '{"published":true}'
