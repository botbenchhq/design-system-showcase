// The showcase's behaviour: the mode switch, live previews, the catalogue's search and filter,
// copy buttons, and the rendered check on the rules page. No dependencies.
const root = document.documentElement;
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage may be blocked. The choice then lasts for this page only.
    }
  },
};

/* ---------- Mode: light or dark, for the page and for the previews that follow it ---------- */

const preview = {
  brand: store.get("showcase-brand") === "default" ? "default" : "botbench",
  mode: root.dataset.scMode === "light" ? "light" : "dark",
};

function setPageMode(mode) {
  root.dataset.theme = mode;
  root.dataset.scMode = mode;
  store.set("showcase-mode", mode);
  for (const button of document.querySelectorAll("[data-sc-mode-toggle]")) button.setAttribute("aria-pressed", String(mode === "dark"));
  setPreview({ mode });
}

for (const button of document.querySelectorAll("[data-sc-mode-toggle]")) {
  button.setAttribute("aria-pressed", String(preview.mode === "dark"));
  button.addEventListener("click", () => setPageMode(root.dataset.scMode === "dark" ? "light" : "dark"));
}

/* ---------- Live previews ---------- */

const frames = [...document.querySelectorAll("iframe[data-frame]")];
const ready = new WeakSet();
const lookOf = (frame) => ({ brand: frame.dataset.brand ?? preview.brand, mode: frame.dataset.mode ?? preview.mode });

function frameUrl(frame) {
  const { brand, mode } = lookOf(frame);
  const url = new URL(frame.dataset.src, location.href);
  url.searchParams.set("theme", mode);
  if (brand !== "default") url.searchParams.set("brand", brand);
  if (frame.hasAttribute("data-fit")) url.searchParams.set("fit", "");
  return url.href;
}

function paint(frame) {
  if (ready.has(frame) && frame.contentWindow) frame.contentWindow.postMessage({ type: "sc-theme", ...lookOf(frame) }, "*");
  else if (frame.src !== frameUrl(frame)) frame.src = frameUrl(frame);
}

function setPreview(change) {
  Object.assign(preview, change);
  if (change.brand) store.set("showcase-brand", preview.brand);
  frames.forEach(paint);
  for (const input of document.querySelectorAll("input[data-sc-preview]")) {
    input.checked = preview[input.dataset.scPreview] === input.value;
  }
}

function load(frame, path) {
  ready.delete(frame);
  frame.dataset.src = path;
  frame.src = frameUrl(frame);
}

const pending = new Map();
addEventListener("message", (event) => {
  const frame = frames.find((candidate) => candidate.contentWindow === event.source);
  if (!frame || typeof event.data !== "object" || event.data === null) return;
  if (event.data.type === "sc-ready") {
    ready.add(frame);
    paint(frame);
  }
  if (event.data.type === "sc-height" && !frame.hasAttribute("data-fixed") && Number.isFinite(event.data.height)) {
    const least = Number(frame.dataset.min ?? 80);
    const most = Number(frame.dataset.max ?? 1600);
    frame.height = String(Math.min(most, Math.max(least, event.data.height)));
  }
  if (event.data.type === "sc-findings") pending.get(event.data.id)?.(event.data);
});

frames.forEach((frame) => {
  frame.addEventListener("load", () => {
    // A frame that navigated away from its preview is no longer one this page can talk to.
    if (!frame.src.includes("/ds/frames/") && !frame.src.includes("/demos/")) ready.delete(frame);
  });
  paint(frame);
});

for (const input of document.querySelectorAll("input[data-sc-preview]")) {
  input.checked = preview[input.dataset.scPreview] === input.value;
  input.addEventListener("change", () => {
    if (input.checked) setPreview({ [input.dataset.scPreview]: input.value });
  });
}

// The width of the previews on a component page: a phone, a tablet, or the room there is.
const WIDTHS = { phone: 390, tablet: 768 };
for (const input of document.querySelectorAll("input[data-sc-size]")) {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    for (const frame of document.querySelectorAll("iframe[data-resizable]")) {
      if (input.value in WIDTHS) {
        frame.dataset.size = input.value;
        frame.width = String(WIDTHS[input.value]);
      } else {
        delete frame.dataset.size;
        frame.removeAttribute("width");
      }
    }
  });
}

/* ---------- A choice that swaps what a preview shows ---------- */

for (const group of document.querySelectorAll("[data-sc-swap]")) {
  const targets = [...document.querySelectorAll(`[data-sc-swap-target="${group.dataset.scSwap}"]`)];
  const apply = (input) => {
    for (const target of targets) {
      if (target instanceof HTMLIFrameElement) {
        load(target, input.dataset.frame);
        target.title = `Live preview: ${input.dataset.label}`;
      } else if (target instanceof HTMLAnchorElement) {
        target.href = input.dataset.href;
        target.textContent = input.dataset.linkText;
      } else {
        target.textContent = input.dataset.caption;
      }
    }
  };
  group.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.checked) apply(input);
    if (input instanceof HTMLSelectElement) apply(input.selectedOptions[0]);
  });
}

/* ---------- Panels chosen by a radio group ---------- */

for (const group of document.querySelectorAll("[data-sc-switch]")) {
  const name = group.dataset.scSwitch;
  const panels = [...document.querySelectorAll(`[data-sc-panel^="${name}:"]`)];
  const show = (value) => {
    for (const panel of panels) panel.hidden = panel.dataset.scPanel !== `${name}:${value}`;
  };
  group.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement && event.target.checked) show(event.target.value);
  });
  const checked = group.querySelector("input:checked");
  if (checked) show(checked.value);
}

/* ---------- Copy buttons ---------- */

for (const button of document.querySelectorAll("button[data-sc-copy]")) {
  const status = button.parentElement?.querySelector('[role="status"]');
  let timer;
  button.addEventListener("click", async () => {
    const text = document.getElementById(button.dataset.scCopy)?.textContent ?? "";
    let said = "Copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      said = "Not copied. Select the text instead.";
    }
    if (status) {
      status.textContent = said;
      clearTimeout(timer);
      timer = setTimeout(() => (status.textContent = ""), 2400);
    }
  });
}

/* ---------- The catalogue: search and category ---------- */

const catalogue = document.querySelector("[data-sc-catalogue]");
if (catalogue) {
  const input = document.querySelector("[data-sc-search]");
  const clear = document.querySelector("[data-sc-search-clear]");
  const count = document.querySelector("[data-sc-count]");
  const empty = document.querySelector("[data-sc-empty]");
  const chips = [...document.querySelectorAll("input[data-sc-category]")];
  const items = [...catalogue.querySelectorAll("[data-sc-item]")];
  const noun = catalogue.dataset.scNoun ?? "components";
  const params = new URLSearchParams(location.search);

  const filter = () => {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const category = chips.find((chip) => chip.checked)?.value ?? "";
    let shown = 0;
    for (const item of items) {
      const match = (category === "" || item.dataset.category === category) && words.every((word) => item.dataset.text.includes(word));
      item.hidden = !match;
      if (match) shown++;
    }
    const said = [];
    if (words.length > 0) said.push(`match "${input.value.trim()}"`);
    if (category !== "") said.push(`are in ${category}`);
    count.textContent = said.length === 0 ? `${items.length} ${noun}` : `${shown} of ${items.length} ${noun} ${said.join(" and ")}`;
    empty.hidden = shown > 0;
    catalogue.hidden = shown === 0;
    clear.hidden = input.value === "";
    const next = new URLSearchParams();
    if (input.value.trim() !== "") next.set("q", input.value.trim());
    if (category !== "") next.set("category", category);
    history.replaceState(null, "", next.size > 0 ? `?${next}` : location.pathname);
  };

  input.value = params.get("q") ?? "";
  const wanted = chips.find((chip) => chip.value === (params.get("category") ?? ""));
  if (wanted) wanted.checked = true;
  input.addEventListener("input", filter);
  chips.forEach((chip) => chip.addEventListener("change", filter));
  clear.addEventListener("click", () => {
    input.value = "";
    filter();
    input.focus();
  });
  for (const reset of document.querySelectorAll("[data-sc-reset]")) {
    reset.addEventListener("click", () => {
      input.value = "";
      chips[0].checked = true;
      filter();
      input.focus();
    });
  }
  input.form?.addEventListener("submit", (event) => event.preventDefault());
  addEventListener("keydown", (event) => {
    const typing = event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable]");
    if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      input.focus();
    }
  });
  filter();
}

/* ---------- A component page: examples by state ---------- */

const stateSelect = document.querySelector("select[data-sc-state]");
if (stateSelect) {
  const examples = [...document.querySelectorAll("[data-sc-example]")];
  const said = document.querySelector("[data-sc-state-count]");
  const apply = () => {
    const value = stateSelect.value;
    let shown = 0;
    for (const example of examples) {
      const match = value === "" || (value === "do" || value === "dont" ? example.dataset.verdict === value : example.dataset.state === value);
      example.hidden = !match;
      if (match) shown++;
    }
    if (said) said.textContent = value === "" ? `${examples.length} examples` : `${shown} of ${examples.length} examples`;
  };
  stateSelect.addEventListener("change", apply);
  apply();
}

/* ---------- The rendered check, run for real inside a preview ---------- */

let checkId = 0;
for (const button of document.querySelectorAll("button[data-sc-check]")) {
  const frame = document.getElementById(button.dataset.scCheck);
  const output = document.getElementById(button.dataset.scOutput);
  button.addEventListener("click", async () => {
    if (!frame?.contentWindow || !output) return;
    button.setAttribute("aria-busy", "true");
    const id = ++checkId;
    const answer = await new Promise((resolve) => {
      pending.set(id, resolve);
      frame.contentWindow.postMessage({ type: "sc-check", id, appPrefix: button.dataset.scPrefix ?? "" }, "*");
      setTimeout(() => resolve({ error: "The preview did not answer. Reload the page and try again." }), 8000);
    });
    pending.delete(id);
    button.removeAttribute("aria-busy");
    const lines = answer.error
      ? [`The check could not run: ${answer.error}`]
      : [
          ...answer.findings.map((finding) => `${finding.rule}  ${finding.message}\n    ${finding.snippet ?? ""}`.trimEnd()),
          `${answer.findings.length === 0 ? "" : "\n"}${answer.findings.length} finding${answer.findings.length === 1 ? "" : "s"} from dsCheckDom() on the page drawn above`,
        ];
    output.textContent = lines.join("\n");
    output.closest("[data-sc-result]")?.removeAttribute("hidden");
  });
}
