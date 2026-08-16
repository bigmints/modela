#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hermes_home="${HERMES_HOME:-${HOME}/.hermes}"
job_name="Modela daily model harvest"

command -v hermes >/dev/null || { echo "hermes is not installed" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker is not installed" >&2; exit 1; }

mkdir -p "$hermes_home/skills" "$hermes_home/scripts"
ln -sfn "$repo_root/skills/modela-model-harvester" "$hermes_home/skills/modela-model-harvester"
ln -sfn "$repo_root/scripts/hermes-refresh.sh" "$hermes_home/scripts/modela-refresh.sh"
chmod +x "$repo_root/scripts/hermes-refresh.sh" "$repo_root/scripts/publish.sh"

if hermes cron list --all | grep -Fq "$job_name"; then
  echo "Hermes cron job already exists: $job_name"
else
  hermes cron create "15 3 * * *" \
    --name "$job_name" \
    --script modela-refresh.sh \
    --no-agent \
    --deliver local
fi

echo "Installed skill: $hermes_home/skills/modela-model-harvester"
echo "Installed script: $hermes_home/scripts/modela-refresh.sh"
echo "The cron expression uses the Hermes host timezone."
