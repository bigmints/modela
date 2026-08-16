import { CAPABILITIES } from "../constants.mjs";
import { fetchJson, parseBoolean, uniqueSorted } from "../util.mjs";

const SPEECH_MARKERS = /\b(tts|text[- ]to[- ]speech|speech synthesis|speech generation)\b/i;
const TRANSCRIPTION_MARKERS = /\b(asr|automatic speech recognition|speech[- ]to[- ]text|transcrib|whisper)\b/i;
const MUSIC_MARKERS = /\b(music|song|lyria)\b/i;

export function isZeroPriced(pricing) {
  if (!pricing || pricing.prompt !== "0" || pricing.completion !== "0") return false;
  const prices = collectPriceValues(pricing);
  return prices.length >= 2 && prices.every(value => value === 0);
}

function collectPriceValues(value, key = "") {
  if (Array.isArray(value)) return value.flatMap(item => collectPriceValues(item, key));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([childKey, childValue]) =>
      childKey.startsWith("min_") ? [] : collectPriceValues(childValue, childKey)
    );
  }
  if (typeof value !== "string" && typeof value !== "number") return [];
  const parsed = Number(value);
  return Number.isFinite(parsed) && key ? [parsed] : [];
}

export function classifyOpenRouterModel(model) {
  const input = model.architecture?.input_modalities ?? [];
  const output = model.architecture?.output_modalities ?? [];
  const searchable = [model.id, model.name, model.description].filter(Boolean).join(" ");
  const capabilities = [];

  if (output.includes("text")) capabilities.push(CAPABILITIES.TEXT_GENERATION);
  if (output.includes("image")) capabilities.push(CAPABILITIES.IMAGE_GENERATION);
  if (output.includes("video")) capabilities.push(CAPABILITIES.VIDEO_GENERATION);
  if (output.includes("embeddings") || output.includes("embedding")) {
    capabilities.push(CAPABILITIES.EMBEDDINGS);
  }
  if (output.includes("audio")) {
    capabilities.push(CAPABILITIES.AUDIO_GENERATION);
    if (SPEECH_MARKERS.test(searchable)) capabilities.push(CAPABILITIES.SPEECH_SYNTHESIS);
    if (MUSIC_MARKERS.test(searchable)) capabilities.push(CAPABILITIES.MUSIC_GENERATION);
  }
  if (input.some(item => ["audio", "image", "video", "file"].includes(item)) && output.includes("text")) {
    capabilities.push(CAPABILITIES.MULTIMODAL_UNDERSTANDING);
  }
  if (input.includes("audio") && output.includes("text") && TRANSCRIPTION_MARKERS.test(searchable)) {
    capabilities.push(CAPABILITIES.SPEECH_RECOGNITION);
  }

  return uniqueSorted(capabilities);
}

export function normalizeOpenRouterModel(model) {
  const capabilities = classifyOpenRouterModel(model);
  const free = isZeroPriced(model.pricing);
  return {
    provider: "openrouter",
    id: model.id,
    name: model.name || model.id,
    description: model.description || null,
    capabilities,
    input_modalities: uniqueSorted(model.architecture?.input_modalities),
    output_modalities: uniqueSorted(model.architecture?.output_modalities),
    context_length: Number.isFinite(model.context_length) ? model.context_length : null,
    supported_parameters: uniqueSorted(model.supported_parameters),
    access: {
      type: free ? "hosted_free" : model.pricing ? "paid" : "unknown",
      pricing: model.pricing ?? null,
      limits: model.per_request_limits ?? null
    },
    classification: {
      basis: "provider_modality",
      confidence: capabilities.length > 0 ? "medium" : "low"
    },
    source: {
      catalogue: "https://openrouter.ai/api/v1/models",
      model_url: `https://openrouter.ai/${model.id}`
    },
    metadata: {
      canonical_slug: model.canonical_slug ?? null,
      hugging_face_id: model.hugging_face_id ?? null,
      created: model.created ?? null,
      knowledge_cutoff: model.knowledge_cutoff ?? null,
      expiration_date: model.expiration_date ?? null
    }
  };
}

export async function harvestOpenRouter(config) {
  const payload = await fetchJson(config.url);
  if (!Array.isArray(payload.data)) throw new Error("OpenRouter response did not contain a data array");
  const includePaid = parseBoolean(process.env.MODELA_INCLUDE_PAID_OPENROUTER, config.include_paid);
  const normalized = payload.data.map(normalizeOpenRouterModel);
  const models = includePaid ? normalized : normalized.filter(model => model.access.type === "hosted_free");
  return {
    source: "openrouter",
    discovered: payload.data.length,
    accepted: models.length,
    models
  };
}
