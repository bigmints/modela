import path from "node:path";
import { FEEDS, SCHEMA_VERSION } from "./constants.mjs";
import {
  readJson,
  replaceDirectoryAtomic,
  sha256,
  stableStringify,
  writeJsonAtomic
} from "./util.mjs";

const ACCESS_TYPES = new Set([
  "hosted_free",
  "free_tier",
  "local",
  "open_weights",
  "paid",
  "unknown"
]);

function modelIdentity(model) {
  return `${model.provider}:${model.id}`;
}

export function validateModel(model) {
  const requiredStrings = ["provider", "id", "name"];
  for (const field of requiredStrings) {
    if (typeof model[field] !== "string" || !model[field].trim()) {
      throw new Error(`Model ${model.id ?? "<unknown>"} has invalid ${field}`);
    }
  }
  for (const field of ["capabilities", "input_modalities", "output_modalities", "supported_parameters"]) {
    if (!Array.isArray(model[field]) || model[field].some(value => typeof value !== "string")) {
      throw new Error(`${modelIdentity(model)} has invalid ${field}`);
    }
  }
  if (!model.access || !ACCESS_TYPES.has(model.access.type)) {
    throw new Error(`${modelIdentity(model)} has invalid access.type`);
  }
  if (!model.classification?.basis || !model.classification?.confidence) {
    throw new Error(`${modelIdentity(model)} has incomplete classification metadata`);
  }
  if (!model.source?.catalogue) {
    throw new Error(`${modelIdentity(model)} has no source catalogue`);
  }
  return true;
}

export function normalizeModels(sourceResults) {
  const models = sourceResults.flatMap(result => result.models);
  const seen = new Set();
  for (const model of models) {
    validateModel(model);
    const identity = modelIdentity(model);
    if (seen.has(identity)) throw new Error(`Duplicate model identity: ${identity}`);
    seen.add(identity);
  }
  return models.sort((left, right) => modelIdentity(left).localeCompare(modelIdentity(right)));
}

export function diffModels(previousModels = [], nextModels = []) {
  const previous = new Map(previousModels.map(model => [modelIdentity(model), model]));
  const next = new Map(nextModels.map(model => [modelIdentity(model), model]));
  const added = [...next.keys()].filter(key => !previous.has(key)).sort();
  const removed = [...previous.keys()].filter(key => !next.has(key)).sort();
  const changed = [...next.keys()].filter(key =>
    previous.has(key) && stableStringify(previous.get(key)) !== stableStringify(next.get(key))
  ).sort();
  return { added, removed, changed };
}

function sourceSummaries(sourceResults) {
  return sourceResults.map(({ source, discovered, accepted }) => ({
    source,
    discovered,
    accepted
  })).sort((left, right) => left.source.localeCompare(right.source));
}

export function createPublicFiles(models, sourceResults, generatedAt = new Date().toISOString()) {
  const catalogueHash = sha256(stableStringify({ schema_version: SCHEMA_VERSION, models }));
  const base = {
    schema_version: SCHEMA_VERSION,
    generated_at: generatedAt,
    catalogue_hash: catalogueHash
  };
  const catalogue = {
    ...base,
    model_count: models.length,
    sources: sourceSummaries(sourceResults),
    models
  };
  const files = { "catalog.json": catalogue };
  const feeds = {};

  for (const [fileName, predicate] of Object.entries(FEEDS)) {
    const feedModels = models.filter(predicate);
    files[fileName] = {
      ...base,
      model_count: feedModels.length,
      models: feedModels
    };
    feeds[fileName.replace(/\.json$/, "")] = {
      path: `data/${fileName}`,
      model_count: feedModels.length
    };
  }

  files["index.json"] = {
    ...base,
    model_count: models.length,
    catalogue: "data/catalog.json",
    feeds
  };
  return files;
}

export function validatePublicFiles(files) {
  const catalogue = files["catalog.json"];
  if (!catalogue || catalogue.schema_version !== SCHEMA_VERSION || !Array.isArray(catalogue.models)) {
    throw new Error("catalog.json does not match the Modela catalogue contract");
  }
  normalizeModels([{ models: catalogue.models }]);
  if (catalogue.model_count !== catalogue.models.length || catalogue.models.length === 0) {
    throw new Error("catalog.json model_count is invalid or empty");
  }
  const expectedHash = sha256(stableStringify({
    schema_version: catalogue.schema_version,
    models: catalogue.models
  }));
  if (catalogue.catalogue_hash !== expectedHash) throw new Error("catalog.json hash is invalid");

  const catalogueIds = new Set(catalogue.models.map(modelIdentity));
  for (const fileName of ["index.json", ...Object.keys(FEEDS)]) {
    if (!files[fileName]) throw new Error(`Missing ${fileName}`);
  }
  for (const fileName of Object.keys(FEEDS)) {
    const feed = files[fileName];
    if (!Array.isArray(feed.models) || feed.model_count !== feed.models.length) {
      throw new Error(`${fileName} has an invalid model_count`);
    }
    const actualIds = feed.models.map(modelIdentity).sort();
    const expectedIds = catalogue.models.filter(FEEDS[fileName]).map(modelIdentity).sort();
    if (stableStringify(actualIds) !== stableStringify(expectedIds)) {
      throw new Error(`${fileName} does not match its capability filter`);
    }
    for (const model of feed.models) {
      if (!catalogueIds.has(modelIdentity(model))) {
        throw new Error(`${fileName} contains a model not present in catalog.json`);
      }
    }
  }
  return true;
}

export function assertSafeDrop(previousModels, nextModels, maxDropRatio, allowLargeDrop) {
  if (allowLargeDrop || previousModels.length === 0 || nextModels.length >= previousModels.length) return;
  const dropRatio = (previousModels.length - nextModels.length) / previousModels.length;
  if (dropRatio > maxDropRatio) {
    throw new Error(
      `Refusing to publish a ${(dropRatio * 100).toFixed(1)}% model-count drop; ` +
      `maximum is ${(maxDropRatio * 100).toFixed(1)}%. Re-run with --allow-large-drop after review.`
    );
  }
}

export async function updateCatalogue({
  sourceResults,
  outputDirectory,
  stateFile,
  dryRun = false,
  allowLargeDrop = false,
  maxDropRatio = 0.5,
  now = new Date()
}) {
  const models = normalizeModels(sourceResults);
  if (models.length === 0) throw new Error("All sources returned zero accepted models; preserving last known-good output");

  const previous = await readJson(path.join(outputDirectory, "catalog.json"), null);
  const previousModels = previous?.models ?? [];
  assertSafeDrop(previousModels, models, maxDropRatio, allowLargeDrop);
  const differences = diffModels(previousModels, models);
  const files = createPublicFiles(models, sourceResults, now.toISOString());
  validatePublicFiles(files);
  const changed = previous?.catalogue_hash !== files["catalog.json"].catalogue_hash;

  if (changed && !dryRun) await replaceDirectoryAtomic(outputDirectory, files);

  const status = {
    schema_version: SCHEMA_VERSION,
    last_checked_at: now.toISOString(),
    changed,
    dry_run: dryRun,
    model_count: models.length,
    catalogue_hash: files["catalog.json"].catalogue_hash,
    sources: sourceSummaries(sourceResults),
    diff: {
      added: differences.added.length,
      removed: differences.removed.length,
      changed: differences.changed.length,
      added_models: differences.added,
      removed_models: differences.removed,
      changed_models: differences.changed
    }
  };
  await writeJsonAtomic(stateFile, status);
  return status;
}

export async function loadPublicFiles(outputDirectory) {
  const fileNames = ["catalog.json", "index.json", ...Object.keys(FEEDS)];
  const entries = await Promise.all(
    fileNames.map(async fileName => [fileName, await readJson(path.join(outputDirectory, fileName))])
  );
  return Object.fromEntries(entries);
}
