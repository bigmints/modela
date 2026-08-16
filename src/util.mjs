import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function uniqueSorted(values = []) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, sortValue(value[key])])
    );
  }
  return value;
}

export async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && arguments.length > 1) return fallback;
    throw new Error(`Could not read JSON from ${filePath}: ${error.message}`, { cause: error });
  }
}

export async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

export async function replaceDirectoryAtomic(destination, files) {
  const parent = path.dirname(destination);
  const stage = path.join(parent, `.${path.basename(destination)}.${process.pid}.stage`);
  const backup = path.join(parent, `.${path.basename(destination)}.${process.pid}.backup`);
  await rm(stage, { recursive: true, force: true });
  await rm(backup, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    await writeJsonAtomic(path.join(stage, name), value);
  }
  let movedExistingDirectory = false;
  try {
    await rename(destination, backup);
    movedExistingDirectory = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await rename(stage, destination);
  } catch (error) {
    if (movedExistingDirectory) await rename(backup, destination);
    throw error;
  }
  await rm(backup, { recursive: true, force: true });
}

export async function fetchJson(url, options = {}) {
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 30_000;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "bigmints-modela/0.1",
          ...options.headers
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 400 * 2 ** (attempt - 1)));
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${attempts} attempts: ${lastError.message}`, {
    cause: lastError
  });
}

export function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}
