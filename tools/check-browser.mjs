#!/usr/bin/env node
// Opens the built site in real browsers and checks what a reader would meet.
// Usage: node tools/check-browser.mjs
//   BROWSERS=chromium,firefox,webkit   which of Playwright's browsers to use (default: chromium)
//   SITE_URL=https://…/                 check a deployed copy instead of serving _site/ here
//   SHOTS=0                             do not write screenshots to shots/
//
// On every page, at three widths, in light and dark: no script error, no request that failed, no sideways
// scroll, no axe violation, and no finding from the design system's own rendered check, dsCheckDom().
// Then the interactions: mode persistence, search and filter, theme and width of the previews, the
// state filter, copying markup, the rendered check on the rules page, the keyboard, reduced motion and 404.
// Exit codes: 0 clean, 1 a check failed.

import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { root, vendor } from "./lib.mjs";
import { BASE, serve } from "./serve.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const checkDom = readFileSync(join(vendor, "check-dom.js"), "utf8");

const browsers = (process.env.BROWSERS ?? "chromium").split(",").map((name) => name.trim()).filter(Boolean);
const shots = process.env.SHOTS !== "0";
const server = process.env.SITE_URL ? null : await serve(4188);
const site = process.env.SITE_URL ?? `http://localhost:4188${BASE}`;
const PAGES = ["index.html", "components.html", "components/approval.html", "components/data-table.html", "patterns.html", "patterns/agent-run.html", "themes.html", "rules.html", "get-started.html", "docs.html"];
const WIDTHS = [390, 768, 1280];
const failures = [];
let checks = 0;
const expect = (condition, message) => {
  checks++;
  if (!condition) failures.push(message);
};
if (shots) mkdirSync(join(root, "shots"), { recursive: true });

async function open(context, path, { mode = null } = {}) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`script error: ${error.message}`));
  page.on("console", (message) => message.type() === "error" && errors.push(`console: ${message.text()}`));
  page.on("requestfailed", (request) => !request.url().includes("favicon.ico") && errors.push(`request failed: ${request.url()}`));
  page.on("response", (response) => response.status() >= 400 && !response.url().includes("/nothing-here/") && errors.push(`${response.status()}: ${response.url()}`));
  if (mode) await page.addInitScript((value) => localStorage.getItem("showcase-mode") ?? localStorage.setItem("showcase-mode", value), mode);
  await page.goto(site + path, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  return { page, errors };
}

/** Scrolls through the page so that every lazy preview loads, then waits for the previews to settle. */
async function settle(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(300);
}

const frameOf = async (page, selector) => (await page.locator(selector).first().elementHandle()).contentFrame();

for (const name of browsers) {
  // Behind a proxy (HTTPS_PROXY), a deployed copy is reached through it.
  const proxy = process.env.SITE_URL && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  const browser = await playwright[name].launch(proxy);
  const tag = (text) => `[${name}] ${text}`;

  /* Every page, at every width, in both modes. */
  for (const mode of ["dark", "light"]) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: mode });
      for (const path of PAGES) {
        const { page, errors } = await open(context, path, { mode });
        const where = tag(`${path} at ${width}px, ${mode}`);
        await settle(page);
        expect(errors.length === 0, `${where}: ${errors.slice(0, 3).join("; ")}`);
        expect((await page.evaluate(() => document.documentElement.dataset.scMode)) === mode, `${where}: the page is not in ${mode} mode`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow <= 1, `${where}: the page scrolls sideways by ${overflow}px`);
        await page.evaluate(axeSource);
        const violations = await page.evaluate(() => axe.run(document, { iframes: false, resultTypes: ["violations"] }).then((result) => result.violations.map((violation) => `${violation.id} (${violation.nodes.length}: ${violation.nodes[0].target.join(" ")})`)));
        expect(violations.length === 0, `${where}: axe: ${violations.join(", ")}`);
        await page.evaluate(checkDom);
        const findings = await page.evaluate(() => dsCheckDom(document.documentElement, { appPrefix: "sc" }).map((finding) => `${finding.rule}: ${finding.snippet}`));
        expect(findings.length === 0, `${where}: design rules: ${findings.slice(0, 3).join(" | ")}`);
        const blank = await page.evaluate(() => [...document.querySelectorAll("iframe[data-frame]")].filter((frame) => !frame.src).length);
        expect(blank === 0, `${where}: ${blank} previews have no address`);
        if (shots && name === browsers[0] && (width === 1280 || width === 390) && !path.includes("data-table")) {
          await page.screenshot({ path: join(root, "shots", `${path.replace(/\.html$/, "").replace(/\//g, "-")}-${width}-${mode}.png`) });
        }
        await page.close();
      }
      await context.close();
    }
  }

  /* Interactions, at a desktop width. */
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark", ...(name === "chromium" ? { permissions: ["clipboard-read", "clipboard-write"] } : {}) });

  {
    // The mode is kept across pages, and the previews follow it.
    const { page } = await open(context, "index.html");
    await page.getByRole("button", { name: "Dark mode" }).click();
    expect((await page.evaluate(() => document.documentElement.dataset.theme)) === "light", tag("the mode button did not switch the page to light"));
    await page.goto(`${site}components/button.html`);
    await page.waitForLoadState("networkidle").catch(() => {});
    expect((await page.evaluate(() => document.documentElement.dataset.theme)) === "light", tag("the mode was not kept on the next page"));
    expect((await page.getByRole("button", { name: "Dark mode" }).getAttribute("aria-pressed")) === "false", tag("the mode button does not say the mode is light"));
    const frame = await frameOf(page, "iframe[data-frame]");
    await frame.waitForLoadState("load");
    expect((await frame.evaluate(() => document.documentElement.dataset.theme)) === "light", tag("a preview did not follow the page's mode"));

    // Theme, mode and width of the previews.
    await page.getByRole("radio", { name: "Default" }).check();
    await page.waitForTimeout(300);
    expect((await frame.evaluate(() => document.querySelectorAll('link[href*="/themes/"]').length)) === 0, tag("choosing the default theme left the Botbench stylesheet in a preview"));
    await page.getByRole("radio", { name: "Botbench" }).check();
    await page.getByRole("radio", { name: "Dark", exact: true }).check();
    await page.waitForTimeout(300);
    expect((await page.evaluate(() => document.documentElement.dataset.theme)) === "dark", tag("the Mode control did not change the page's mode with the previews"));
    expect((await frame.evaluate(() => document.documentElement.dataset.theme)) === "dark" && (await frame.evaluate(() => document.querySelectorAll('link[href*="/themes/botbench.css"]').length)) === 1, tag("the previews did not take the Botbench theme in dark"));
    await page.getByRole("radio", { name: "Phone" }).check();
    const drawn = await page.locator("iframe[data-frame]").first().evaluate((element) => element.contentWindow.innerWidth);
    expect(drawn === 390, tag(`the Phone width drew the previews ${drawn}px wide`));
    await page.getByRole("radio", { name: "Full" }).check();

    // The state filter.
    const all = await page.locator("[data-sc-example]:visible").count();
    await page.getByLabel("Show").selectOption("dont");
    const donts = await page.locator("[data-sc-example]:visible").count();
    expect(donts > 0 && donts < all && (await page.locator('[data-sc-example]:visible:not([data-verdict="dont"])').count()) === 0, tag("the Show filter did not narrow the examples to the don'ts"));
    await page.getByLabel("Show").selectOption("");

    // Copying markup.
    const first = page.locator("[data-sc-example]").first();
    await first.locator("summary").click();
    await first.getByRole("button", { name: /^Copy the markup/ }).click();
    await page.waitForFunction((status) => status.textContent !== "", await first.locator('[role="status"]').elementHandle(), { timeout: 3000 }).catch(() => {});
    const said = await first.locator('[role="status"]').textContent();
    expect(said !== "", tag("the copy button said nothing"));
    if (name === "chromium") {
      expect(said === "Copied", tag(`the copy button said "${said}"`));
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied === (await first.locator("pre code").textContent()), tag("the clipboard does not hold the example's markup"));
    }
    await page.close();
  }

  {
    // The catalogue: search, category, the address, the / key and the empty state.
    const { page } = await open(context, "components.html");
    const total = await page.locator("[data-sc-item]").count();
    await page.keyboard.press("/");
    expect(await page.evaluate(() => document.activeElement?.id === "catalogue-search"), tag("the / key did not focus the search"));
    await page.keyboard.type("approval");
    const found = await page.locator("[data-sc-item]:visible").count();
    expect(found > 0 && found < total, tag(`searching "approval" shows ${found} of ${total}`));
    expect((await page.locator("[data-sc-count]").textContent()).startsWith(`${found} of ${total} components match "approval"`), tag("the count does not say what the search found"));
    expect(new URL(page.url()).searchParams.get("q") === "approval", tag("the search is not in the address"));
    await page.reload();
    expect((await page.locator("[data-sc-item]:visible").count()) === found, tag("the search was not restored from the address"));
    await page.getByRole("button", { name: "Clear the search" }).click();
    await page.getByRole("radio", { name: "Forms" }).check();
    const forms = await page.locator("[data-sc-item]:visible").count();
    expect(forms > 0 && forms === (await page.locator('[data-sc-item][data-category="Forms"]').count()), tag("the Forms category does not show exactly the form components"));
    await page.getByLabel("Search components").fill("zzzz-nothing");
    expect(await page.getByRole("heading", { name: "No component matches" }).isVisible(), tag("no empty state when nothing matches"));
    await page.getByRole("button", { name: "Show every component" }).click();
    expect((await page.locator("[data-sc-item]:visible").count()) === total, tag("the reset did not show every component"));
    await page.locator(".sc-specimen__name").first().click();
    expect(page.url().includes("/components/"), tag("a specimen did not open its component"));
    await page.close();
  }

  {
    // The home page's stage, and the rules page's two checks.
    const { page } = await open(context, "index.html");
    await page.getByRole("radio", { name: "Tool call" }).check();
    await page.waitForTimeout(500);
    expect((await (await frameOf(page, ".sc-hero iframe")).evaluate(() => location.pathname)).includes("tool-call--"), tag("the stage did not change to the tool call"));
    const before = page.url();
    await page.goto(`${site}docs.html`);
    await page.goBack();
    expect(page.url() === before, tag("Back after changing the stage did not return to the home page"));
    await page.goto(`${site}rules.html`);
    await page.getByRole("radio", { name: "Three primary buttons" }).check();
    const panel = page.locator('[data-sc-panel="demo:two-primary"]');
    expect(await panel.isVisible(), tag("the scenario's panel did not show"));
    await (await frameOf(page, "#demo-frame-two-primary")).waitForLoadState("load");
    await page.waitForTimeout(400);
    await panel.getByRole("button", { name: "Run the rendered check on this page" }).click();
    await panel.locator("#demo-result-two-primary").waitFor({ state: "visible" });
    const result = await panel.locator("#demo-result-two-primary").textContent();
    expect(result.includes("one-primary-action") && result.includes("3 findings"), tag(`the rendered check on three primary buttons said: ${result.slice(0, 120)}`));
    await page.getByRole("radio", { name: "Nothing: it passes" }).check();
    const passing = page.locator('[data-sc-panel="demo:pass"]');
    await passing.getByRole("button", { name: "Run the rendered check on this page" }).click();
    await passing.locator("#demo-result-pass").waitFor({ state: "visible" });
    expect((await passing.locator("#demo-result-pass").textContent()).startsWith("0 findings"), tag("the rendered check did not pass the page that passes"));
    await page.close();
  }

  {
    // The keyboard: the skip link comes first and is drawn; focus is always visible.
    const { page } = await open(context, "index.html");
    await page.keyboard.press("Tab");
    const skip = await page.evaluate(() => {
      const element = document.activeElement;
      const box = element.getBoundingClientRect();
      return { text: element.textContent.trim(), shown: box.top >= 0 && box.bottom <= innerHeight && box.width > 0 };
    });
    expect(skip.text === "Skip to the page" && skip.shown, tag("the first Tab does not reach a visible skip link"));
    for (let step = 0; step < 12; step++) {
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        const ring = element.closest(".sc-specimen") ? getComputedStyle(element.closest(".sc-specimen")) : style;
        return { name: element.tagName === "IFRAME" ? "preview" : (element.textContent || element.getAttribute("aria-label") || element.tagName).trim().slice(0, 30), visible: element.tagName === "IFRAME" || style.outlineStyle !== "none" || ring.outlineStyle !== "none" || style.boxShadow !== "none" };
      });
      expect(focus.visible, tag(`no visible focus on "${focus.name}"`));
    }
    await page.close();
  }

  {
    // Reduced motion, and the page for an address that does not exist.
    const calm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const { page } = await open(calm, "index.html");
    const moving = await page.evaluate(() => [...document.querySelectorAll("a, button, summary, input")].filter((element) => parseFloat(getComputedStyle(element).transitionDuration) > 0.01 || getComputedStyle(element).animationName !== "none").length);
    expect(moving === 0, tag(`${moving} controls still move when the reader asks for reduced motion`));
    const response = await page.goto(`${site}nothing-here/deeper.html`);
    expect(response.status() === 404, tag(`an unknown address answered ${response.status()}`));
    expect(await page.getByRole("heading", { name: "There is no page at this address" }).isVisible(), tag("the 404 page has no heading"));
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".ds-button--primary")).borderRadius !== "0px"), tag("the 404 page lost its stylesheet at a deeper address"));
    await page.getByRole("link", { name: "Open the catalogue" }).click();
    expect(page.url().endsWith("components.html"), tag("the 404 page's link does not reach the catalogue"));
    await calm.close();
  }

  await context.close();
  await browser.close();
}

server?.close();
for (const failure of failures) console.error(failure);
console.log(`${failures.length} failure${failures.length === 1 ? "" : "s"} in ${checks} checks: ${browsers.join(", ")}; ${PAGES.length} pages at ${WIDTHS.join(", ")}px in light and dark`);
process.exit(failures.length > 0 ? 1 : 0);
