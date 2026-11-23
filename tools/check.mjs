#!/usr/bin/env node
// Checks the built site without a browser: every link, script, stylesheet, image and preview resolves.
// Usage: node tools/check.mjs [--online]
//
// - A link inside the site must name a file in _site/, and its #fragment an id on that page.
// - A link into the design system's repository at the pinned release must name a file or folder in
//   .upstream/ (the checkout tools/fetch-upstream.mjs made), and its #fragment a heading of that file.
// - With --online, every other outside address is asked, and one that does not answer is a failure.
// Exit codes: 0 clean, 1 something does not resolve.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { pin, root } from "./lib.mjs";

const site = join(root, "_site");
const upstream = join(root, ".upstream");
const online = process.argv.includes("--online");
if (!existsSync(join(site, "index.html"))) {
  console.error("check: _site/ is missing. Run: node tools/build.mjs");
  process.exit(1);
}

const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const pages = walk(site).filter((file) => file.endsWith(".html") && !relative(site, file).startsWith(join("ds", "gallery")));
const problems = [];
const outside = new Map();
const idsOf = new Map();
const ids = (file) => {
  if (!idsOf.has(file)) idsOf.set(file, new Set([...readFileSync(file, "utf8").matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])));
  return idsOf.get(file);
};
// The slug GitHub gives a heading.
const githubSlug = (heading) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
const headingsOf = new Map();
const headings = (file) => {
  if (!headingsOf.has(file)) headingsOf.set(file, new Set([...readFileSync(file, "utf8").matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => githubSlug(match[1].replace(/`/g, "")))));
  return headingsOf.get(file);
};
const repo = `${pin.repository}/`;

let links = 0;
for (const page of pages) {
  const shown = relative(site, page);
  const whole = readFileSync(page, "utf8");
  // A preview holds the gallery's example, whose links name the pages of an imagined app and go nowhere
  // (src/frame.js stops them). Only what the preview itself loads is checked.
  const html = shown.startsWith(join("ds", "frames")) || shown.startsWith("demos") ? whole.slice(0, whole.indexOf("</head>")) : whole;
  const base = shown === "404.html" ? site : dirname(page);
  const targets = [
    ...[...html.matchAll(/\s(?:href|src|data-src)="([^"]*)"/g)].map((match) => match[1]),
    ...[...html.matchAll(/\sdata-frame="([^"]*)"/g)].map((match) => match[1]),
  ];
  for (const raw of targets) {
    const target = raw.replace(/&amp;/g, "&");
    links++;
    if (target.startsWith("mailto:") || target === "") continue;
    if (/^https?:\/\//.test(target)) {
      if (target.startsWith(repo) && existsSync(upstream)) {
        const [, kind, ref, rest = ""] = /^(blob|tree|commit|releases\/tag|issues)(?:\/([^/#]+))?(?:\/([^#]*))?/.exec(target.slice(repo.length)) ?? [];
        if (kind === "blob" || kind === "tree") {
          if (ref !== pin.tag) problems.push(`${shown}: ${target} is not at the pinned release ${pin.tag}`);
          const file = join(upstream, rest);
          if (!existsSync(file)) problems.push(`${shown}: ${target} names nothing in the design system at ${pin.tag}`);
          const fragment = target.split("#")[1];
          if (fragment && existsSync(file) && file.endsWith(".md") && !headings(file).has(fragment)) problems.push(`${shown}: ${target} names no heading of that file`);
          continue;
        }
      }
      if (target.startsWith(`${pin.repository}#`) && existsSync(upstream)) {
        if (!headings(join(upstream, "README.md")).has(target.split("#")[1])) problems.push(`${shown}: ${target} names no heading of the README`);
        continue;
      }
      // The site's own address, in a canonical link, is the page being checked.
      if (target.startsWith("https://botbenchhq.github.io/design-system-showcase/")) continue;
      if (!outside.has(target.split("#")[0])) outside.set(target.split("#")[0], shown);
      continue;
    }
    // In the scenario sources on the rules page, a path is text inside a code block and never an attribute, so every attribute here is a real address.
    const [path, fragment] = target.split("#");
    const clean = path.split("?")[0];
    // 404.html is served at any depth, so its addresses start at the site's path.
    const file = clean === "" ? page : clean.startsWith("/") ? join(site, clean.replace(/^\/design-system-showcase\//, "")) : resolve(base, clean);
    if (!existsSync(file) || statSync(file).isDirectory()) {
      problems.push(`${shown}: ${raw} does not exist`);
      continue;
    }
    if (fragment && file.endsWith(".html") && !ids(file).has(fragment)) problems.push(`${shown}: ${raw} names no id on that page`);
  }
  if (shown !== "404.html" && !shown.startsWith("ds") && !shown.startsWith("demos")) {
    for (const needed of ["<title>", 'name="description"', 'rel="canonical"', 'property="og:image"', 'rel="icon"', "<h1"]) {
      if (!html.includes(needed)) problems.push(`${shown}: has no ${needed}`);
    }
  }
}

for (const needed of ["sitemap.xml", "robots.txt", "404.html", ".nojekyll", "assets/favicon.svg", "assets/social-preview.png", "version.json"]) {
  if (!existsSync(join(site, needed))) problems.push(`_site/${needed} is missing`);
}
for (const [, address] of readFileSync(join(site, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = address.replace(/^https:\/\/botbenchhq\.github\.io\/design-system-showcase\//, "") || "index.html";
  if (!existsSync(join(site, path))) problems.push(`sitemap.xml: ${address} is not a page of the site`);
}

if (online) {
  for (const [address, from] of outside) {
    try {
      const response = await fetch(address, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "design-system-showcase-link-check" } });
      if (!response.ok) problems.push(`${from}: ${address} answered ${response.status}`);
    } catch (error) {
      problems.push(`${from}: ${address} did not answer (${error.cause?.code ?? error.name})`);
    }
  }
}

for (const problem of problems) console.error(problem);
console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"}, ${links} addresses on ${pages.length} pages and previews${online ? `, ${outside.size} outside addresses asked` : `, ${outside.size} outside addresses not asked (use --online)`}`);
process.exit(problems.length > 0 ? 1 : 0);
