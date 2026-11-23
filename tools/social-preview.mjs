#!/usr/bin/env node
// Writes src/assets/social-preview.png: the top of the built home page at 1280 by 640, in dark mode.
// It is a picture of the real page, taken in a browser. Run it after a change to the home page's first screen.
// Usage: node tools/build.mjs && node tools/social-preview.mjs
import { createRequire } from "node:module";
import { join } from "node:path";

import { root } from "./lib.mjs";
import { BASE, serve } from "./serve.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const server = await serve(4187);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, colorScheme: "dark" });
await page.goto(`http://localhost:4187${BASE}index.html`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: join(root, "src", "assets", "social-preview.png") });
await browser.close();
server.close();
console.log("Wrote src/assets/social-preview.png");
