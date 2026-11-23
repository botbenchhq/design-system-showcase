#!/usr/bin/env node
// Writes the site into _site/ from the vendored design system and the files under src/.
// Usage: node tools/build.mjs
//   SITE_BASE=/design-system-showcase/   the path the site is served under (used by 404.html only;
//                                        every other link is relative, so the pages work under any path).
//
// It stops, saying what is missing, when the vendored copy is absent or is not the pinned version,
// when the gallery no longer has an example a page shows, or when the checker does not give a
// recorded scenario the result the page says it gives.

import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { escapeHtml as h, loadCatalogue, loadRules, loadTokens, pin, read, root, themeInfo, vendor } from "./lib.mjs";
import * as pages from "./pages.mjs";

const out = join(root, "_site");
const base = process.env.SITE_BASE ?? "/design-system-showcase/";
const stop = (message) => {
  console.error(`build: ${message}`);
  process.exit(1);
};

if (!existsSync(join(vendor, "VERSION"))) stop("vendor/design-system is missing. Run: node tools/fetch-upstream.mjs");
if (read("VERSION").trim() !== pin.version) stop(`vendor/design-system holds ${read("VERSION").trim()}, and upstream.json pins ${pin.version}. Run: node tools/fetch-upstream.mjs`);
for (const required of ["design-system.css", "components.json", "tokens.json", "check-dom.js", "icons.svg", "gallery/gallery.js", "gallery/gallery.css", "checker/check.mjs", "themes/botbench.css", "rules/checker-rules.md", "rules/choosing-components.md"]) {
  if (!existsSync(join(vendor, required))) stop(`the design system no longer ships ${required}, which this site is built from.`);
}

const write = (path, text) => {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. The design system itself, untouched, under ds/. The gallery pages keep working at ds/gallery/.
cpSync(vendor, join(out, "ds"), { recursive: true });
rmSync(join(out, "ds", "hashes.json"), { force: true });

// 2. The showcase's own files.
for (const name of ["site.css", "site.js", "theme.js", "frame.js", "frame.css"]) cpSync(join(root, "src", name), join(out, "assets", name));
for (const name of readdirSync(join(root, "src", "assets"))) cpSync(join(root, "src", "assets", name), join(out, "assets", name));
if (!existsSync(join(out, "assets", "favicon.svg"))) stop("src/assets/favicon.svg is missing.");
if (!existsSync(join(out, "assets", "social-preview.png"))) stop("src/assets/social-preview.png is missing. Run: node tools/social-preview.mjs");

const catalogue = loadCatalogue();
const rules = loadRules();
const tokens = loadTokens();
const theme = themeInfo("botbench");

// 3. One small document for each example of the gallery, for the live previews.
const behaviors = readdirSync(join(vendor, "behaviors")).filter((name) => name.endsWith(".js")).sort();
let frames = 0;
for (const item of [...catalogue.components, ...catalogue.patterns]) {
  for (const example of item.galleryExamples) {
    write(
      `ds/frames/${item.name}--${example.id}.html`,
      `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${h(item.title)}: ${h(example.title)} (preview)</title>
<link rel="stylesheet" href="../design-system.css">
<link rel="stylesheet" href="../gallery/gallery.css">
<link rel="stylesheet" href="../../assets/frame.css">
<script src="../gallery/gallery.js"></script>
${behaviors.map((name) => `<script type="module" src="../behaviors/${name}"></script>`).join("\n")}
<script src="../../assets/frame.js"></script>
</head>
<body>
<main>
<h1 class="ds-visually-hidden">${h(item.title)}: ${h(example.title)}</h1>
<figure data-gallery="${example.verdict}">
${example.wrapper}
</figure>
</main>
</body>
</html>
`,
    );
    frames++;
  }
}

// 4. The rule scenarios: each is checked by the real checker now, and its output is put on the page.
const scenarios = JSON.parse(readFileSync(join(root, "src", "demos", "scenarios.json"), "utf8"));
const demos = scenarios.map((scenario) => {
  const source = join(root, "src", "demos", scenario.id);
  const work = mkdtempSync(join(tmpdir(), "showcase-demo-"));
  cpSync(source, work, { recursive: true });
  // The file is called try.html in the design system's quickstart, and here too.
  cpSync(join(work, "page.html"), join(work, "try.html"));
  rmSync(join(work, "page.html"));
  writeFileSync(join(work, "design-system.config.json"), JSON.stringify({ paths: ["."], appPrefix: "app", gaps: "design-gaps.json", vendorDir: vendor }));
  writeFileSync(join(work, "design-gaps.json"), '{"gaps":[]}');
  const names = readdirSync(source).sort((a, b) => (a === "page.html" ? -1 : b === "page.html" ? 1 : a.localeCompare(b)));
  const single = names.length === 1;
  const args = single ? ["try.html"] : ["--config", "design-system.config.json"];
  const result = spawnSync("node", [join(vendor, "checker", "check.mjs"), ...args], { cwd: work, encoding: "utf8" });
  rmSync(work, { recursive: true, force: true });
  if (result.status !== 0 && result.status !== 1) stop(`the checker could not run on the scenario ${scenario.id}: ${result.stderr || result.stdout}`);
  if ((scenario.id === "pass") !== (result.status === 0)) stop(`the scenario ${scenario.id} ${result.status === 0 ? "passes" : "fails"} the checker, and the page says the opposite.`);
  const files = names.map((name) => ({ name: name === "page.html" ? "try.html" : name, text: readFileSync(join(source, name), "utf8").trimEnd() }));
  const line = /^try\.html:(\d+)/m.exec(result.stdout)?.[1];
  // The preview: the same source, with the stylesheet's address pointed at this site's copy and the frame script added.
  const page = readFileSync(join(source, "page.html"), "utf8")
    .replace('href="dist/design-system.css"', 'href="../../ds/design-system.css"')
    .replace("</head>", '  <meta name="robots" content="noindex">\n  <script src="../../assets/frame.js" data-standalone data-themes="../../ds/themes/" data-checker="../../ds/check-dom.js"></script>\n</head>');
  if (!page.includes("../../ds/design-system.css")) stop(`the scenario ${scenario.id} does not link dist/design-system.css.`);
  write(`demos/${scenario.id}/index.html`, page);
  for (const name of names) if (name !== "page.html") cpSync(join(source, name), join(out, "demos", scenario.id, name));
  return {
    ...scenario,
    files,
    output: result.stdout.trimEnd(),
    exit: result.status,
    command: single ? "node dist/checker/check.mjs try.html" : "node dist/checker/check.mjs --config design-system.config.json",
    changed: line ? files[0].text.split("\n")[Number(line) - 1].trim() : "",
  };
});

// 5. The pages.
const data = { catalogue, rules, tokens, theme, demos };
const written = [];
const page = (path, html) => {
  write(path, html);
  written.push(path);
};
page("index.html", pages.home(data));
page("components.html", pages.components(data));
page("patterns.html", pages.patterns(data));
page("themes.html", pages.themes(data));
page("rules.html", pages.rulesPage(data));
page("get-started.html", pages.getStarted(data));
page("docs.html", pages.docs(data));
for (const item of catalogue.components) page(`components/${item.name}.html`, pages.detail({ item, theme, siblings: catalogue.components }));
for (const item of catalogue.patterns) page(`patterns/${item.name}.html`, pages.detail({ item, theme, siblings: catalogue.patterns }));
write("404.html", pages.notFound({ theme, base }));

// 6. What a crawler and GitHub Pages read.
const built = execFileSync("git", ["-C", root, "log", "-1", "--format=%cs"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || new Date().toISOString().slice(0, 10);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map((path) => `<url><loc>${pages.SITE.url}${path === "index.html" ? "" : path}</loc><lastmod>${built}</lastmod></url>`).join("\n")}
</urlset>
`,
);
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /design-system-showcase/ds/frames/\nDisallow: /design-system-showcase/demos/\n\nSitemap: ${pages.SITE.url}sitemap.xml\n`);
write(".nojekyll", "");
write("version.json", `${JSON.stringify({ designSystem: pin, pages: written.length, previews: frames }, null, 2)}\n`);

console.log(`Built ${written.length} pages and ${frames} previews from design system ${pin.version} (${pin.tag}, ${pin.commit.slice(0, 7)}) into _site/`);
