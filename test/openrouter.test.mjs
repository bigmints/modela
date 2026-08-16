import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyOpenRouterModel,
  isZeroPriced,
  normalizeOpenRouterModel
} from "../src/sources/openrouter.mjs";

test("zero pricing requires all price fields to be zero", () => {
  assert.equal(isZeroPriced({ prompt: "0", completion: "0" }), true);
  assert.equal(isZeroPriced({ prompt: "0", completion: "0", web_search: "0.01" }), false);
  assert.equal(isZeroPriced({ prompt: "-1", completion: "-1" }), false);
  assert.equal(isZeroPriced({ prompt: "0", completion: "0.000001" }), false);
  assert.equal(isZeroPriced({
    prompt: "0",
    completion: "0",
    overrides: [{ min_prompt_tokens: 10_000, prompt: "0", completion: "0" }]
  }), true);
});

test("output audio is not automatically called TTS", () => {
  const model = {
    id: "google/lyria-preview",
    name: "Lyria music preview",
    architecture: {
      input_modalities: ["text"],
      output_modalities: ["text", "audio"]
    }
  };
  assert.deepEqual(classifyOpenRouterModel(model), [
    "audio_generation",
    "music_generation",
    "text_generation"
  ]);
});

test("transcription requires semantic evidence", () => {
  const generic = {
    id: "vendor/audio-chat",
    name: "Audio chat",
    architecture: { input_modalities: ["audio", "text"], output_modalities: ["text"] }
  };
  const whisper = { ...generic, id: "vendor/whisper-large", name: "Whisper Large" };
  assert.equal(classifyOpenRouterModel(generic).includes("speech_recognition"), false);
  assert.equal(classifyOpenRouterModel(whisper).includes("speech_recognition"), true);
});

test("normalization uses published prices instead of ID suffix", () => {
  const model = normalizeOpenRouterModel({
    id: "vendor/model:free",
    name: "Misleading suffix",
    pricing: { prompt: "0", completion: "0.1" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
    supported_parameters: []
  });
  assert.equal(model.access.type, "paid");
});
