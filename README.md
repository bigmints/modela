# Modela

Modela publishes a deterministic catalogue of hosted OpenRouter models. By default it includes only models whose published prompt, completion, and auxiliary prices are all zero.

It does not catalogue Hugging Face repositories, local models, or undeployed open weights.

## Published files

GitHub Pages serves the complete catalogue and capability feeds from `public/data/`:

- `catalog.json`
- `hosted-free.json`
- `chat.json`
- `tts.json`
- `transcription.json`
- `embeddings.json`
- `image-generation.json`
- `video-generation.json`
- `audio-generation.json`

The site is available at:

`https://bigmints.github.io/modela/`

The complete JSON endpoint is:

`https://bigmints.github.io/modela/data/catalog.json`

Capability feeds can be empty when OpenRouter does not currently list a zero-priced model for that capability. Modela does not reinterpret audio understanding as transcription or general audio output as TTS.

## Run locally

Docker is the supported runtime:

```bash
MODELA_UID="$(id -u)" MODELA_GID="$(id -g)" docker compose run --rm modela update
MODELA_UID="$(id -u)" MODELA_GID="$(id -g)" docker compose run --rm modela validate
```

Use `--dry-run` to fetch, classify, validate, and display a diff without replacing `public/data/`:

```bash
MODELA_UID="$(id -u)" MODELA_GID="$(id -g)" docker compose run --rm modela update --dry-run
```

The harvester retries transient failures, writes through a staging directory, rejects empty results, and refuses catalogue drops greater than 50% by default. A failed run leaves the published directory unchanged.

## Free-model classification

A model is `hosted_free` only when:

- `pricing.prompt` is exactly zero
- `pricing.completion` is exactly zero
- every other published price field is zero
- no variable or unknown negative price is present

An ID ending in `:free` is not sufficient by itself. This also captures zero-priced models that do not use the suffix.

Set `MODELA_INCLUDE_PAID_OPENROUTER=true` to include paid models for diagnostics. Paid models are excluded from normal publication.

## Production use

Entries are hosted OpenRouter model IDs, not downloadable weights. Applications still need an OpenRouter API key and should implement fallback routing because free models can be rate-limited, removed, or temporarily unavailable.

Modela validates catalogue metadata. It does not make inference calls against every model and does not promise an availability SLA.

## Install on Hermes

Clone the repository to a persistent location on ubot-server, configure a repository-scoped GitHub deploy key with write access, then run:

```bash
./scripts/install-hermes.sh
```

The installer:

- links `modela-model-harvester` into `~/.hermes/skills/`
- links the deterministic refresh script into `~/.hermes/scripts/`
- creates `Modela daily model harvest` with `hermes cron`
- schedules it for `03:15` every day using the Hermes host timezone
- uses Hermes `--no-agent` mode, so daily runs consume no LLM tokens

Confirm the host timezone and installation:

```bash
timedatectl status
hermes cron list --all
hermes cron run <job-id>
```

The daily script updates and validates the catalogue, commits only known JSON output paths, and pushes the current branch. A push to `main` triggers the GitHub Pages deployment.

## Configuration

Source defaults live in `config/sources.json`. Optional environment variables are documented in `.env.example`.

OpenRouter's public models endpoint does not currently require an API key. Never commit OpenRouter or GitHub credentials.
