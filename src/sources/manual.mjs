import path from "node:path";
import { readJson, uniqueSorted } from "../util.mjs";

export async function harvestManual(config, rootDirectory) {
  const filePath = path.resolve(rootDirectory, config.path);
  const payload = await readJson(filePath);
  if (!Array.isArray(payload)) throw new Error(`${config.path} must contain a JSON array`);
  const models = payload.map(model => ({
    ...model,
    capabilities: uniqueSorted(model.capabilities),
    input_modalities: uniqueSorted(model.input_modalities),
    output_modalities: uniqueSorted(model.output_modalities),
    supported_parameters: uniqueSorted(model.supported_parameters)
  }));
  return {
    source: "manual",
    discovered: payload.length,
    accepted: models.length,
    models
  };
}
