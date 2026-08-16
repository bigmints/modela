#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hermes_home="${HERMES_HOME:-${HOME}/.hermes}"
job_name="Modela daily model harvest"
cron_script="$hermes_home/scripts/modela-refresh.sh"

command -v hermes >/dev/null || { echo "hermes is not installed" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker is not installed" >&2; exit 1; }

mkdir -p "$hermes_home/skills" "$hermes_home/scripts"
ln -sfn "$repo_root/skills/modela-model-harvester" "$hermes_home/skills/modela-model-harvester"
if test -e "$cron_script" || test -L "$cron_script"; then
  rm -f "$cron_script"
fi
{
  printf '#!/usr/bin/env bash\n'
  printf 'set -euo pipefail\n'
  printf 'exec %q\n' "$repo_root/scripts/hermes-refresh.sh"
} > "$cron_script"
chmod +x "$cron_script" "$repo_root/scripts/hermes-refresh.sh" "$repo_root/scripts/publish.sh"

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
echo "Installed script: $cron_script"
echo "The cron expression uses the Hermes host timezone."
