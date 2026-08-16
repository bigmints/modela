import { HF_TASK_CAPABILITIES, HF_TASK_MODALITIES } from "../constants.mjs";
import { fetchJson, parsePositiveInteger, uniqueSorted } from "../util.mjs";

function licenseFromTags(tags = []) {
  const tag = tags.find(value => value.startsWith("license:"));
  return tag ? tag.slice("license:".length) : null;
}

export function normalizeHuggingFaceModel(model, task) {
  const modalities = HF_TASK_MODALITIES[task];
  return {
    provider: "huggingface",
    id: model.id,
    name: model.id,
    description: null,
    capabilities: [...HF_TASK_CAPABILITIES[task]],
    input_modalities: [...modalities.input],
    output_modalities: [...modalities.output],
    context_length: null,
    supported_parameters: [],
    access: {
      type: "open_weights",
      pricing: null,
      limits: null
    },
    classification: {
      basis: "provider_task",
      confidence: "high"
    },
    source: {
      catalogue: "https://huggingface.co/api/models",
      model_url: `https://huggingface.co/${model.id}`
    },
    metadata: {
      pipeline_tags: [task],
      license: licenseFromTags(model.tags),
      downloads: model.downloads ?? null,
      likes: model.likes ?? null,
      last_modified: model.lastModified ?? null
    }
  };
}

function mergeModel(existing, incoming) {
  existing.capabilities = uniqueSorted([...existing.capabilities, ...incoming.capabilities]);
  existing.input_modalities = uniqueSorted([...existing.input_modalities, ...incoming.input_modalities]);
  existing.output_modalities = uniqueSorted([...existing.output_modalities, ...incoming.output_modalities]);
  existing.metadata.pipeline_tags = uniqueSorted([
    ...existing.metadata.pipeline_tags,
    ...incoming.metadata.pipeline_tags
  ]);
  return existing;
}

export async function harvestHuggingFace(config) {
  const limit = parsePositiveInteger(process.env.MODELA_HF_LIMIT_PER_TASK, config.limit_per_task);
  const headers = process.env.HF_TOKEN
    ? { Authorization: `Bearer ${process.env.HF_TOKEN}` }
    : {};

  const responses = await Promise.all(
    config.tasks.map(async task => {
      if (!HF_TASK_CAPABILITIES[task]) throw new Error(`Unsupported Hugging Face task: ${task}`);
      const url = new URL(config.url);
      url.searchParams.set("pipeline_tag", task);
      url.searchParams.set("sort", "downloads");
      url.searchParams.set("direction", "-1");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("full", "true");
      const payload = await fetchJson(url, { headers });
      if (!Array.isArray(payload)) throw new Error(`Hugging Face ${task} response was not an array`);
      return { task, payload };
    })
  );

  const modelsById = new Map();
  let discovered = 0;
  for (const { task, payload } of responses) {
    discovered += payload.length;
    for (const rawModel of payload) {
      if (!rawModel.id || rawModel.private || rawModel.gated) continue;
      const normalized = normalizeHuggingFaceModel(rawModel, task);
      const key = normalized.id;
      modelsById.set(key, modelsById.has(key) ? mergeModel(modelsById.get(key), normalized) : normalized);
    }
  }

  const models = [...modelsById.values()];
  return {
    source: "huggingface",
    discovered,
    accepted: models.length,
    models
  };
}
