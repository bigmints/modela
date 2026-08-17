import {
  CAPABILITY_LABELS,
  FEED_LABELS,
  capabilityLabel,
  filterModels,
  formatContextLength,
  formatGeneratedDate,
  modalityPath
} from "./catalog.js";

const elements = {
  terminalStatus: document.querySelector("#terminal-status"),
  modelCount: document.querySelector("#model-count"),
  discoveredCount: document.querySelector("#discovered-count"),
  generatedDate: document.querySelector("#generated-date"),
  generatedTime: document.querySelector("#generated-time"),
  capabilityGrid: document.querySelector("#capability-grid"),
  searchInput: document.querySelector("#search-input"),
  capabilityFilter: document.querySelector("#capability-filter"),
  resultCount: document.querySelector("#result-count"),
  modelList: document.querySelector("#model-list"),
  emptyState: document.querySelector("#empty-state"),
  resetFilter: document.querySelector("#reset-filter"),
  endpointList: document.querySelector("#endpoint-list"),
  catalogueHash: document.querySelector("#catalogue-hash"),
  toast: document.querySelector("#toast")
};

const state = { models: [], index: null };

async function loadCatalogue() {
  const [indexResponse, catalogueResponse] = await Promise.all([
    fetch("data/index.json"),
    fetch("data/catalog.json")
  ]);
  if (!indexResponse.ok || !catalogueResponse.ok) {
    throw new Error(`Catalogue unavailable (${indexResponse.status}/${catalogueResponse.status})`);
  }
  const [index, catalogue] = await Promise.all([indexResponse.json(), catalogueResponse.json()]);
  if (index.catalogue_hash !== catalogue.catalogue_hash) {
    throw new Error("Catalogue files are temporarily out of sync");
  }
  state.index = index;
  state.models = catalogue.models;
  renderSummary(index, catalogue);
  renderCapabilities(index);
  renderFilterOptions(catalogue.models);
  renderEndpoints(index);
  renderModels();
}

function renderSummary(index, catalogue) {
  const source = catalogue.sources.find(item => item.source === "openrouter");
  const generated = formatGeneratedDate(index.generated_at);
  elements.terminalStatus.textContent = "200 OK";
  elements.terminalStatus.classList.add("online");
  elements.modelCount.textContent = String(index.model_count).padStart(2, "0");
  elements.discoveredCount.textContent = source?.discovered?.toLocaleString() ?? "—";
  elements.generatedDate.textContent = generated.date;
  elements.generatedTime.textContent = generated.time;
  elements.catalogueHash.textContent = `hash: ${index.catalogue_hash.slice(0, 12)}`;
}

function renderCapabilities(index) {
  const orderedFeeds = [
    "chat",
    "audio-generation",
    "tts",
    "transcription",
    "embeddings",
    "image-generation",
    "video-generation"
  ];
  elements.capabilityGrid.replaceChildren(...orderedFeeds.map(name => {
    const feed = index.feeds[name];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "capability-card";
    card.disabled = !feed?.model_count;
    card.dataset.feed = name;

    const label = document.createElement("span");
    label.className = "capability-name";
    label.textContent = FEED_LABELS[name] ?? name;
    const count = document.createElement("strong");
    count.textContent = String(feed?.model_count ?? 0).padStart(2, "0");
    const status = document.createElement("span");
    status.className = "capability-status";
    status.textContent = feed?.model_count ? "available" : "none free";
    card.append(label, count, status);
    card.addEventListener("click", () => selectFeed(name));
    return card;
  }));
}

function selectFeed(name) {
  const mapping = {
    chat: "text_generation",
    "audio-generation": "audio_generation",
    tts: "speech_synthesis",
    transcription: "speech_recognition",
    embeddings: "embeddings",
    "image-generation": "image_generation",
    "video-generation": "video_generation"
  };
  elements.capabilityFilter.value = mapping[name] ?? "all";
  renderModels();
  document.querySelector("#models").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFilterOptions(models) {
  const capabilities = [...new Set(models.flatMap(model => model.capabilities))].sort();
  for (const capability of capabilities) {
    const option = document.createElement("option");
    option.value = capability;
    option.textContent = CAPABILITY_LABELS[capability] ?? capabilityLabel(capability);
    elements.capabilityFilter.append(option);
  }
}

function renderModels() {
  const models = filterModels(
    state.models,
    elements.searchInput.value,
    elements.capabilityFilter.value
  );
  elements.resultCount.textContent = `Showing ${models.length} of ${state.models.length}`;
  elements.emptyState.hidden = models.length > 0;
  elements.modelList.hidden = models.length === 0;
  elements.modelList.replaceChildren(...models.map(createModelRow));
}

function createModelRow(model, index) {
  const row = document.createElement("article");
  row.className = "model-row";

  const number = document.createElement("span");
  number.className = "model-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const identity = document.createElement("div");
  identity.className = "model-identity";
  const title = document.createElement("a");
  title.href = model.source.model_url;
  title.target = "_blank";
  title.rel = "noreferrer";
  title.textContent = model.name;
  const id = document.createElement("code");
  id.textContent = model.id;
  identity.append(title, id);

  const capabilityList = document.createElement("div");
  capabilityList.className = "model-capabilities";
  for (const capability of model.capabilities) {
    const tag = document.createElement("span");
    tag.textContent = capabilityLabel(capability);
    capabilityList.append(tag);
  }

  const specs = document.createElement("div");
  specs.className = "model-specs";
  specs.append(
    specItem("I/O", modalityPath(model)),
    specItem("Context", formatContextLength(model.context_length)),
    specItem("Price", "$0")
  );

  const copy = document.createElement("button");
  copy.className = "copy-id";
  copy.type = "button";
  copy.textContent = "Copy ID";
  copy.addEventListener("click", () => copyText(model.id, "Model ID copied"));

  row.append(number, identity, capabilityList, specs, copy);
  return row;
}

function specItem(label, value) {
  const item = document.createElement("span");
  const key = document.createElement("small");
  key.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value;
  item.append(key, content);
  return item;
}

function renderEndpoints(index) {
  const endpoints = [
    ["Complete catalogue", index.catalogue, index.model_count],
    ...Object.entries(index.feeds).map(([name, feed]) => [FEED_LABELS[name] ?? name, feed.path, feed.model_count])
  ];
  elements.endpointList.replaceChildren(...endpoints.map(([label, endpoint, count]) => {
    const row = document.createElement("div");
    row.className = "endpoint-row";
    const name = document.createElement("span");
    name.textContent = label;
    const path = document.createElement("a");
    path.href = endpoint;
    path.textContent = `/${endpoint}`;
    const total = document.createElement("span");
    total.textContent = `${count} model${count === 1 ? "" : "s"}`;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => {
      const url = new URL(endpoint, window.location.href).href;
      copyText(url, "Endpoint copied");
    });
    row.append(name, path, total, copy);
    return row;
  }));
}

async function copyText(value, message) {
  await navigator.clipboard.writeText(value);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.setTimeout(() => elements.toast.classList.remove("visible"), 1600);
}

elements.searchInput.addEventListener("input", renderModels);
elements.capabilityFilter.addEventListener("change", renderModels);
elements.resetFilter.addEventListener("click", () => {
  elements.searchInput.value = "";
  elements.capabilityFilter.value = "all";
  renderModels();
});
document.querySelector(".copy-command").addEventListener("click", event => {
  copyText(event.currentTarget.dataset.copy, "Endpoint copied");
});

loadCatalogue().catch(error => {
  elements.terminalStatus.textContent = "OFFLINE";
  elements.terminalStatus.classList.add("offline");
  elements.resultCount.textContent = error.message;
  elements.emptyState.hidden = false;
  elements.emptyState.querySelector("span").textContent = "500";
  elements.emptyState.querySelector("p").textContent = "The catalogue could not be loaded.";
});
