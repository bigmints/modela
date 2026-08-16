#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadPublicFiles,
  updateCatalogue,
  validatePublicFiles
} from "./catalog.mjs";
import { harvestOpenRouter } from "./sources/openrouter.mjs";
import { parseBoolean, readJson } from "./util.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArguments(argv) {
  const command = argv[0] ?? "help";
  const options = {
    config: path.join(ROOT, "config/sources.json"),
    output: path.join(ROOT, "public/data"),
    state: path.join(ROOT, ".modela/status.json"),
    dryRun: false,
    allowLargeDrop: false
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--allow-large-drop") options.allowLargeDrop = true;
    else if (["--config", "--output", "--state"].includes(argument)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      options[argument.slice(2)] = path.resolve(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { command, options };
}

async function harvest(config) {
  const jobs = [];
  if (config.openrouter?.enabled) jobs.push(harvestOpenRouter(config.openrouter));
  if (jobs.length === 0) throw new Error("No Modela sources are enabled");
  return Promise.all(jobs);
}

async function update(options) {
  const config = await readJson(options.config);
  const sourceResults = await harvest(config);
  const configuredDrop = Number.parseFloat(process.env.MODELA_MAX_DROP_RATIO ?? "0.5");
  const maxDropRatio = Number.isFinite(configuredDrop) && configuredDrop >= 0 && configuredDrop <= 1
    ? configuredDrop
    : 0.5;
  return updateCatalogue({
    sourceResults,
    outputDirectory: options.output,
    stateFile: options.state,
    dryRun: options.dryRun,
    allowLargeDrop: options.allowLargeDrop,
    maxDropRatio
  });
}

function conciseStatus(status) {
  const previewSize = 20;
  const diff = status.diff;
  return {
    ...status,
    diff: {
      added: diff.added,
      removed: diff.removed,
      changed: diff.changed,
      added_models: diff.added_models.slice(0, previewSize),
      removed_models: diff.removed_models.slice(0, previewSize),
      changed_models: diff.changed_models.slice(0, previewSize),
      truncated: [diff.added_models, diff.removed_models, diff.changed_models]
        .some(models => models.length > previewSize)
    }
  };
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === "update" || command === "diff") {
    if (command === "diff") options.dryRun = true;
    console.log(JSON.stringify(conciseStatus(await update(options)), null, 2));
    return;
  }
  if (command === "validate") {
    validatePublicFiles(await loadPublicFiles(options.output));
    console.log(JSON.stringify({ valid: true, output: options.output }, null, 2));
    return;
  }
  if (command === "status") {
    const status = await readJson(options.state, { status: "never_run" });
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  if (command === "help") {
    console.log(`Modela model harvester\n\nCommands:\n  update [--dry-run] [--allow-large-drop]\n  diff\n  validate\n  status\n\nOptions:\n  --config <path>\n  --output <path>\n  --state <path>`);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(`modela: ${error.message}`);
  if (parseBoolean(process.env.MODELA_DEBUG)) console.error(error.stack);
  process.exitCode = 1;
});
