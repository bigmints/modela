---
name: modela-model-harvester
description: Harvest, classify, validate, diff, and publish Modela catalogues of free hosted, open-weight, and local chat, TTS, transcription, embedding, image-generation, video-generation, and audio-generation models. Use for Modela refreshes, model discovery, catalogue status, source failures, classification review, and GitHub Pages publishing.
---

# Modela Model Harvester

Use the repository's deterministic CLI. Do not classify models from intuition or rewrite catalogue JSON manually.

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

- Treat `hosted_free`, `free_tier`, `local`, and `open_weights` as distinct access types.
- Do not call a model free merely because its ID ends in `:free`; verify all published price fields are zero.
- Do not call audio-input models transcription models without provider task or transcription evidence.
- Do not call audio-output models TTS models without provider task or speech-synthesis evidence.
- Treat Hugging Face discoveries as open weights, not hosted-free inference.
- Preserve manual entries in `config/manual-models.json`; validate them against `schemas/catalog.schema.json`.

## Failure handling

Preserve the last known-good public directory when any source or validation step fails. Do not use `--allow-large-drop` unless the removed-model list was reviewed and the drop is expected.

Report source counts, total models, added/removed/changed counts, whether files changed, and whether publication succeeded.
