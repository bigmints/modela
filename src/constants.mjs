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
  "hosted-free.json": model => model.access.type === "hosted_free"
});
