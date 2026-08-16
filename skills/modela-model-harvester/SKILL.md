---
name: modela-model-harvester
description: Harvest, classify, validate, diff, and publish Modela catalogues of hosted OpenRouter chat, TTS, transcription, embedding, image-generation, video-generation, and audio-generation models. Use for OpenRouter catalogue refreshes, free-model discovery, Modela status, source failures, classification review, and GitHub Pages publishing.
---

# Modela Model Harvester

Use the repository's deterministic CLI. Harvest OpenRouter only. Do not add Hugging Face repositories, local services, or undeployed weights.

## Locate the repository

Use the current working directory when it contains `package.json` with package name `@bigmints/modela`. Otherwise resolve the repository from the installed `modela-refresh.sh` symlink. Ask for the checkout path only if neither is available.

## Commands

- Refresh without writing: `docker compose run --rm modela update --dry-run`
- Refresh public JSON: `docker compose run --rm modela update`
- Validate published files: `docker compose run --rm modela validate`
- Show the last local result: `docker compose run --rm modela status`
- Publish changed JSON: `scripts/publish.sh`

Run `scripts/publish.sh` only when publication is requested or when executing the configured scheduled job.

## Classification rules

- Treat `hosted_free`, `paid`, and `unknown` as distinct access types.
- Do not call a model free merely because its ID ends in `:free`; verify every published price field is zero.
- Do not call audio-input models transcription models without transcription evidence.
- Do not call audio-output models TTS models without speech-synthesis evidence.
- Preserve OpenRouter IDs exactly as published.

## Failure handling

Preserve the last known-good public directory when fetching or validation fails. Do not use `--allow-large-drop` unless the removed-model list was reviewed and the drop is expected.

Report the OpenRouter discovered and accepted counts, added/removed/changed counts, whether files changed, and whether publication succeeded.
