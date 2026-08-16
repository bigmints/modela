import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHuggingFaceModel } from "../src/sources/huggingface.mjs";

test("Hugging Face task metadata is high-confidence open-weight classification", () => {
  const model = normalizeHuggingFaceModel({
    id: "org/speech-model",
    tags: ["license:apache-2.0"],
    downloads: 10,
    likes: 2
  }, "text-to-speech");
  assert.deepEqual(model.capabilities, ["speech_synthesis"]);
  assert.deepEqual(model.output_modalities, ["audio"]);
  assert.equal(model.access.type, "open_weights");
  assert.equal(model.classification.basis, "provider_task");
  assert.equal(model.metadata.license, "apache-2.0");
});
