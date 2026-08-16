# Modela

Modela builds a public, machine-readable catalogue of AI models without conflating free APIs, free tiers, local inference, and downloadable open weights.

It currently harvests:

- OpenRouter's public catalogue, retaining zero-priced hosted models by default
- Hugging Face model metadata for TTS, transcription, embeddings, image generation, and video generation
- Explicit local or provider-specific entries from `config/manual-models.json`

## Published files

GitHub Pages serves the complete catalogue and focused feeds from `public/data/`:

- `catalog.json`
- `hosted-free.json`
- `open-weights.json`
- `local-models.json`
- `chat.json`
- `tts.json`
- `transcription.json`
- `embeddings.json`
- `image-generation.json`
- `video-generation.json`
- `audio-generation.json`

After Pages is enabled with GitHub Actions as its source, the site is available at:

`https://bigmints.github.io/modela/`

The complete JSON endpoint is:

`https://bigmints.github.io/modela/data/catalog.json`

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

The harvester retries transient source failures, writes through a staging directory, rejects empty results, and refuses catalogue drops greater than 50% by default. A failed run leaves the published directory unchanged.

## Access types

| Type | Meaning |
|---|---|
| `hosted_free` | The provider publishes zero prices for every relevant charge. |
| `free_tier` | The provider offers a limited free allowance. |
| `local` | The model runs on user-owned infrastructure without a per-request API fee. |
| `open_weights` | The model is publicly downloadable and intended for self-hosting. |
| `paid` | The provider publishes a positive price. |
| `unknown` | The available metadata cannot establish cost. |

OpenRouter models are considered `hosted_free` only when prompt, completion, and any auxiliary published price fields are all zero. A `:free` suffix alone is not accepted as proof.

Hugging Face results are classified as `open_weights`, not hosted-free inference. Gated models are excluded. The default harvest keeps the 200 most-downloaded models per configured task; adjust `MODELA_HF_LIMIT_PER_TASK` if needed.

## Add local models

Add explicit entries to `config/manual-models.json`. Do not publish private endpoint addresses or credentials. A manual model follows the model definition in `schemas/catalog.schema.json`; for example:

```json
[
  {
    "provider": "gx10",
    "id": "kokoro",
    "name": "Kokoro TTS",
    "description": "Locally hosted speech synthesis",
    "capabilities": ["speech_synthesis"],
    "input_modalities": ["text"],
    "output_modalities": ["audio"],
    "context_length": null,
    "supported_parameters": [],
    "access": {
      "type": "local",
      "pricing": null,
      "limits": null
    },
    "classification": {
      "basis": "manual_verification",
      "confidence": "high"
    },
    "source": {
      "catalogue": "manual",
      "model_url": null
    },
    "metadata": {
      "endpoint_compatibility": "openai.audio.speech"
    }
  }
]
```

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

The daily script updates and validates the catalogue, commits only the known JSON output paths, and pushes the current branch. GitHub Pages deploys automatically after a push to `main`.

## Manual Hermes usage

The installed skill supports requests such as:

- “Use modela-model-harvester to preview today's model changes.”
- “Refresh Modela and publish it.”
- “Why did the latest Modela harvest fail?”
- “Add this verified local embedding model to Modela.”

## Configuration

Source defaults live in `config/sources.json`. Optional environment variables are documented in `.env.example`.

An optional `HF_TOKEN` raises Hugging Face API limits. OpenRouter's public models endpoint does not currently require an API key. Never commit provider tokens or GitHub credentials.
