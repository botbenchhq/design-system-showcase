// Reads the vendored design system and turns it into the data the pages are written from.
// Nothing about a component is written by hand in this repository: names, guidance, examples and
// categories all come from vendor/design-system, which tools/fetch-upstream.mjs fills from the pinned release.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const vendor = join(root, "vendor", "design-system");
export const pin = JSON.parse(readFileSync(join(root, "upstream.json"), "utf8"));

export const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unescapeHtml = (text) =>
  text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export const read = (...parts) => readFileSync(join(vendor, ...parts), "utf8");

/** Where a file of the design system is on GitHub, at the pinned release. */
export const sourceUrl = (path = "") => (path === "" ? pin.repository : `${pin.repository}/blob/${pin.tag}/${path}`);
export const treeUrl = (path) => `${pin.repository}/tree/${pin.tag}/${path}`;

const FIGURE = /^<figure data-gallery="(do|dont|specimen)">\n<figcaption>\n([\s\S]*?)\n<\/figcaption>\n([\s\S]*?)\n<\/figure>$/gm;

/** The examples of one gallery page, in page order, each with the wrapper element exactly as the gallery draws it. */
function galleryExamples(name) {
  const page = read("gallery", `${name}.html`);
  const examples = [];
  for (const [, verdict, caption, wrapper] of page.matchAll(FIGURE)) {
    const id = /^<div data-example="([^"]*)"/.exec(wrapper)?.[1];
    if (id === undefined) throw new Error(`${name}: an example without data-example in the gallery page.`);
    const title = unescapeHtml(/<h3>(?:<span data-gallery="verdict">[\s\S]*?<\/span> )?([\s\S]*?)<\/h3>/.exec(caption)?.[1] ?? id);
    const state = /<p data-gallery="state">State: <code>([^<]*)<\/code><\/p>/.exec(caption)?.[1] ?? null;
    const reason = /<\/p>\n<p>([\s\S]*?)<\/p>$/.exec(caption)?.[1] ?? /^<h3>[\s\S]*?<\/h3>\n<p>(?!State:)([\s\S]*?)<\/p>$/.exec(caption)?.[1] ?? null;
    // The markup inside the wrapper, as an app would write it: without the wrapper and its indentation.
    const inner = wrapper.split("\n").slice(1, -1).map((line) => line.replace(/^ {2}/, "")).join("\n");
    examples.push({ id, verdict, title, state, reason: reason === null ? null : unescapeHtml(reason), wrapper, inner });
  }
  return examples;
}

function categories(names) {
  const text = read("rules", "choosing-components.md");
  const sections = text.split(/^## /m).slice(1).map((section) => {
    const title = section.slice(0, section.indexOf("\n")).trim();
    return { title, names: [...section.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((match) => match[1]) };
  });
  const wanted = ["Page structure", "Actions and navigation", "Forms", "Messages and status", "Overlays", "Data", "Agent surfaces"];
  const byName = new Map();
  // A component belongs to the first section whose "Use" column names it.
  for (const title of wanted) {
    const section = sections.find((entry) => entry.title === title);
    if (!section) throw new Error(`choosing-components.md has no "${title}" section; the catalogue's categories come from it.`);
    for (const name of section.names) if (names.has(name) && !byName.has(name)) byName.set(name, title);
  }
  return { order: wanted, byName };
}

export function loadCatalogue() {
  const data = JSON.parse(read("components.json"));
  const names = new Set(data.components.map((entry) => entry.name));
  const { order, byName } = categories(names);
  const entry = (item, kind) => {
    const examples = galleryExamples(item.name);
    const copyable = new Map(item.examples.map((example) => [example.id, example.markup]));
    for (const example of examples) {
      // components.json holds the markup an agent copies; a don't is in the gallery only.
      example.code = copyable.get(example.id) ?? example.inner.replaceAll("../icons.svg#", "icons.svg#");
    }
    if (examples.length === 0) throw new Error(`${item.name}: no examples found in its gallery page.`);
    return { ...item, kind, category: kind === "pattern" ? "Page patterns" : byName.get(item.name) ?? "More", galleryExamples: examples };
  };
  const components = data.components.map((item) => entry(item, "component"));
  const patterns = data.patterns.map((item) => entry(item, "pattern"));
  const used = [...order, "More"].filter((title) => components.some((item) => item.category === title));
  return { components, patterns, categories: used };
}

/** Every token with its value in each theme and mode. */
export function loadTokens() {
  const themes = { default: JSON.parse(read("tokens.json")) };
  for (const name of themeNames()) themes[name] = JSON.parse(read("themes", `${name}.tokens.json`));
  const show = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "object" && "hex" in value) return value.hex.toUpperCase();
    if (Array.isArray(value)) return value.map(show).join(", ");
    if (typeof value === "object" && "value" in value && "unit" in value) return `${value.value}${value.unit}`;
    // A shadow, as CSS writes it.
    if (typeof value === "object" && "offsetX" in value) {
      const { components, alpha } = value.color;
      return `${["offsetX", "offsetY", "blur", "spread"].map((key) => show(value[key])).join(" ")} rgb(${components.map((part) => Math.round(part * 255)).join(" ")} / ${alpha})`;
    }
    if (typeof value === "object" && Array.isArray(value.components)) return `rgb(${value.components.join(" ")})`;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };
  const groups = [];
  for (const [group, tokens] of Object.entries(themes.default)) {
    if (group.startsWith("$")) continue;
    const rows = [];
    for (const [name, token] of Object.entries(tokens)) {
      if (name.startsWith("$") || typeof token !== "object" || !("$value" in token)) continue;
      const values = {};
      for (const [theme, data] of Object.entries(themes)) {
        const own = data[group]?.[name] ?? token;
        const light = show(own.$value);
        values[theme] = { light, dark: show(own.$extensions?.["design-system"]?.dark) ?? light };
      }
      rows.push({ name: `--ds-${group}-${name}`, type: token.$type ?? group, description: token.$description ?? null, values });
    }
    if (rows.length > 0) groups.push({ group, rows });
  }
  return { groups, themes: Object.keys(themes) };
}

export const themeNames = () => {
  const names = [];
  for (const name of ["botbench"]) if (existsSync(join(vendor, "themes", `${name}.css`))) names.push(name);
  return names;
};
export const themeInfo = (name) => JSON.parse(read("themes", `${name}.json`));

/** The checker's rules as checker-rules.md lists them: group, id, meaning and fix. */
export function loadRules() {
  const text = read("rules", "checker-rules.md");
  const groups = [];
  for (const section of text.split(/^## /m).slice(1)) {
    const title = section.slice(0, section.indexOf("\n")).trim();
    const rules = [...section.matchAll(/^\| `([a-z-]+)` \| (.*?) \| (.*?) \|$/gm)].map(([, id, meaning, fix]) => ({ id, meaning, fix }));
    if (rules.length > 0) groups.push({ title, rules });
  }
  const manifest = JSON.parse(read("manifest.json"));
  const listed = new Set(groups.flatMap((group) => group.rules.map((rule) => rule.id)));
  const missing = manifest.rules.filter((id) => !listed.has(id));
  if (missing.length > 0) throw new Error(`checker-rules.md does not describe: ${missing.join(", ")}`);
  return { groups, count: manifest.rules.length, tokenCount: Object.values(manifest.tokens).flat().length, manifest };
}

/** Inline markdown as the rules files use it: code spans and links only. */
export const inlineMarkdown = (text) =>
  escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
