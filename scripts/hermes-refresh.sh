#!/usr/bin/env bash
set -euo pipefail

script_path="$(readlink -f "${BASH_SOURCE[0]}")"
repo_root="$(cd "$(dirname "$script_path")/.." && pwd)"
cd "$repo_root"

MODELA_UID="$(id -u)" MODELA_GID="$(id -g)" docker compose run --rm modela update
MODELA_UID="$(id -u)" MODELA_GID="$(id -g)" docker compose run --rm modela validate
"$repo_root/scripts/publish.sh"
