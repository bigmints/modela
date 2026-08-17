export const CAPABILITY_LABELS = Object.freeze({
  text_generation: "Chat",
  multimodal_understanding: "Multimodal",
  speech_synthesis: "TTS",
  speech_recognition: "Transcription",
  embeddings: "Embeddings",
  image_generation: "Image generation",
  video_generation: "Video generation",
  audio_generation: "Audio generation",
  music_generation: "Music generation"
});

export const FEED_LABELS = Object.freeze({
  chat: "Chat",
  tts: "TTS",
  transcription: "Transcription",
  embeddings: "Embeddings",
  "image-generation": "Image generation",
  "video-generation": "Video generation",
  "audio-generation": "Audio generation",
  "hosted-free": "All hosted free"
});

export function formatContextLength(value) {
  if (!Number.isFinite(value)) return "n/a";
  if (value >= 1_000_000) return `${trimDecimal(value / 1_000_000)}m`;
  if (value >= 1_000) return `${trimDecimal(value / 1_000)}k`;
  return String(value);
}

function trimDecimal(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatGeneratedDate(value, locale = "en") {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return { date: "unknown", time: "invalid timestamp" };
  return {
    date: new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit" }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    }).format(date)
  };
}

export function filterModels(models, query = "", capability = "all") {
  const normalizedQuery = query.trim().toLowerCase();
  return models.filter(model => {
    const matchesCapability = capability === "all" || model.capabilities.includes(capability);
    if (!matchesCapability) return false;
    if (!normalizedQuery) return true;
    const haystack = [model.id, model.name, model.description, ...model.capabilities]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function modalityPath(model) {
  const input = model.input_modalities.length ? model.input_modalities.join(" + ") : "unknown";
  const output = model.output_modalities.length ? model.output_modalities.join(" + ") : "unknown";
  return `${input} → ${output}`;
}

export function capabilityLabel(capability) {
  return CAPABILITY_LABELS[capability] ?? capability.replaceAll("_", " ");
}
