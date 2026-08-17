import test from "node:test";
import assert from "node:assert/strict";
import {
  capabilityLabel,
  filterModels,
  formatContextLength,
  formatGeneratedDate,
  modalityPath
} from "../public/assets/catalog.js";

const models = [
  {
    id: "provider/chat:free",
    name: "Chat Model",
    description: "General assistant",
    capabilities: ["text_generation"],
    input_modalities: ["text"],
    output_modalities: ["text"]
  },
  {
    id: "provider/music",
    name: "Music Model",
    description: null,
    capabilities: ["audio_generation", "music_generation"],
    input_modalities: ["text", "image"],
    output_modalities: ["audio"]
  }
];

test("frontend catalogue helpers format model metadata", () => {
  assert.equal(formatContextLength(512_000), "512k");
  assert.equal(formatContextLength(1_048_576), "1m");
  assert.equal(formatContextLength(null), "n/a");
  assert.equal(modalityPath(models[1]), "text + image → audio");
  assert.equal(capabilityLabel("text_generation"), "Chat");
});

test("model filtering combines query and capability", () => {
  assert.deepEqual(filterModels(models, "music", "all").map(model => model.id), ["provider/music"]);
  assert.deepEqual(filterModels(models, "provider", "text_generation").map(model => model.id), ["provider/chat:free"]);
  assert.deepEqual(filterModels(models, "missing", "all"), []);
});

test("generated date handles valid and invalid timestamps", () => {
  assert.equal(formatGeneratedDate("invalid").date, "unknown");
  assert.notEqual(formatGeneratedDate("2026-08-16T20:15:44.891Z", "en").date, "unknown");
});
