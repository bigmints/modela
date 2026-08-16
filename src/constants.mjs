export const SCHEMA_VERSION = 1;

export const CAPABILITIES = Object.freeze({
  TEXT_GENERATION: "text_generation",
  MULTIMODAL_UNDERSTANDING: "multimodal_understanding",
  SPEECH_SYNTHESIS: "speech_synthesis",
  SPEECH_RECOGNITION: "speech_recognition",
  AUDIO_GENERATION: "audio_generation",
  MUSIC_GENERATION: "music_generation",
  EMBEDDINGS: "embeddings",
  IMAGE_GENERATION: "image_generation",
  VIDEO_GENERATION: "video_generation"
});

export const FEEDS = Object.freeze({
  "chat.json": model => model.capabilities.includes(CAPABILITIES.TEXT_GENERATION),
  "tts.json": model => model.capabilities.includes(CAPABILITIES.SPEECH_SYNTHESIS),
  "transcription.json": model => model.capabilities.includes(CAPABILITIES.SPEECH_RECOGNITION),
  "embeddings.json": model => model.capabilities.includes(CAPABILITIES.EMBEDDINGS),
  "image-generation.json": model => model.capabilities.includes(CAPABILITIES.IMAGE_GENERATION),
  "video-generation.json": model => model.capabilities.includes(CAPABILITIES.VIDEO_GENERATION),
  "audio-generation.json": model => model.capabilities.includes(CAPABILITIES.AUDIO_GENERATION),
  "hosted-free.json": model => ["hosted_free", "free_tier"].includes(model.access.type),
  "open-weights.json": model => model.access.type === "open_weights",
  "local-models.json": model => model.access.type === "local"
});

export const HF_TASK_CAPABILITIES = Object.freeze({
  "text-to-speech": [CAPABILITIES.SPEECH_SYNTHESIS],
  "automatic-speech-recognition": [CAPABILITIES.SPEECH_RECOGNITION],
  "feature-extraction": [CAPABILITIES.EMBEDDINGS],
  "sentence-similarity": [CAPABILITIES.EMBEDDINGS],
  "text-to-image": [CAPABILITIES.IMAGE_GENERATION],
  "text-to-video": [CAPABILITIES.VIDEO_GENERATION]
});

export const HF_TASK_MODALITIES = Object.freeze({
  "text-to-speech": { input: ["text"], output: ["audio"] },
  "automatic-speech-recognition": { input: ["audio"], output: ["text"] },
  "feature-extraction": { input: ["text"], output: ["embeddings"] },
  "sentence-similarity": { input: ["text"], output: ["embeddings"] },
  "text-to-image": { input: ["text"], output: ["image"] },
  "text-to-video": { input: ["text"], output: ["video"] }
});
