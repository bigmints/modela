import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertSafeDrop,
  loadPublicFiles,
  updateCatalogue,
  validatePublicFiles
} from "../src/catalog.mjs";

function model(id = "free-model") {
  return {
    provider: "test",
    id,
    name: id,
    description: null,
    capabilities: ["text_generation"],
    input_modalities: ["text"],
    output_modalities: ["text"],
    context_length: 1000,
    supported_parameters: [],
    access: { type: "hosted_free", pricing: { prompt: "0", completion: "0" }, limits: null },
    classification: { basis: "test", confidence: "high" },
    source: { catalogue: "fixture", model_url: null },
    metadata: {}
  };
}

test("catalogue update writes validated feeds and preserves timestamp when unchanged", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "modela-test-"));
  const output = path.join(temporary, "public/data");
  const state = path.join(temporary, ".modela/status.json");
  const sourceResults = [{ source: "fixture", discovered: 1, accepted: 1, models: [model()] }];
  try {
    const first = await updateCatalogue({
      sourceResults,
      outputDirectory: output,
      stateFile: state,
      now: new Date("2026-08-16T00:00:00Z")
    });
    assert.equal(first.changed, true);
    validatePublicFiles(await loadPublicFiles(output));
    const original = JSON.parse(await readFile(path.join(output, "catalog.json"), "utf8"));

    const second = await updateCatalogue({
      sourceResults,
      outputDirectory: output,
      stateFile: state,
      now: new Date("2026-08-17T00:00:00Z")
    });
    const unchanged = JSON.parse(await readFile(path.join(output, "catalog.json"), "utf8"));
    assert.equal(second.changed, false);
    assert.equal(unchanged.generated_at, original.generated_at);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("large drops are rejected unless explicitly allowed", () => {
  assert.throws(() => assertSafeDrop([model("a"), model("b"), model("c")], [model("a")], 0.5, false));
  assert.doesNotThrow(() => assertSafeDrop([model("a"), model("b"), model("c")], [model("a")], 0.5, true));
});
