#!/usr/bin/env node
// Fetches the design system at the commit pinned in upstream.json and syncs its dist/ into vendor/design-system
// with the design system's own sync script, which records the hash of every file.
//
// Usage: node tools/fetch-upstream.mjs
//   DESIGN_SYSTEM_DIR=<checkout>  read the pinned commit from a local clone instead of the network.
//
// It stops when the commit cannot be fetched, when the tag no longer names the pinned commit,
// or when dist/VERSION is not the pinned version. Nothing is taken from a branch.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pin = JSON.parse(readFileSync(join(root, "upstream.json"), "utf8"));
const checkout = join(root, ".upstream");
const vendor = join(root, "vendor", "design-system");
const run = (command, args, options = {}) => execFileSync(command, args, { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8", ...options });
const stop = (message) => {
  console.error(`fetch-upstream: ${message}`);
  process.exit(1);
};

if (!/^[0-9a-f]{40}$/.test(pin.commit)) stop("upstream.json must pin a full 40-character commit.");

const have = () => existsSync(join(checkout, ".git")) && run("git", ["-C", checkout, "rev-parse", "HEAD"]).trim() === pin.commit;
if (!have()) {
  rmSync(checkout, { recursive: true, force: true });
  mkdirSync(checkout, { recursive: true });
  run("git", ["init", "-q", checkout]);
  const local = process.env.DESIGN_SYSTEM_DIR;
  const source = local ? resolve(local) : `${pin.repository}.git`;
  try {
    if (local) run("git", ["-C", checkout, "fetch", "-q", "--depth", "1", source, pin.tag]);
    else run("git", ["-C", checkout, "fetch", "-q", "--depth", "1", source, pin.commit]);
  } catch {
    stop(`could not fetch ${local ? pin.tag : pin.commit} from ${source}.`);
  }
  const fetched = run("git", ["-C", checkout, "rev-parse", "FETCH_HEAD^{commit}"]).trim();
  if (fetched !== pin.commit) stop(`${source} gave ${fetched}, and upstream.json pins ${pin.commit}.`);
  run("git", ["-C", checkout, "checkout", "-q", "--detach", fetched]);
}

// A release tag can be moved. The commit is what is fetched; the tag is asked for only to notice that.
if (!process.env.DESIGN_SYSTEM_DIR) {
  let listed = "";
  try {
    listed = run("git", ["ls-remote", `${pin.repository}.git`, `refs/tags/${pin.tag}`, `refs/tags/${pin.tag}^{}`]);
  } catch {
    stop(`could not ask ${pin.repository} what ${pin.tag} names.`);
  }
  const named = listed.trim().split("\n").filter(Boolean).map((line) => line.split("\t")[0]);
  if (named.length === 0) stop(`${pin.repository} has no tag ${pin.tag}.`);
  if (named.at(-1) !== pin.commit) stop(`${pin.tag} now names ${named.at(-1)}, and upstream.json pins ${pin.commit}. A release tag was moved: look at it before changing the pin.`);
}

const version = readFileSync(join(checkout, "dist", "VERSION"), "utf8").trim();
if (version !== pin.version) stop(`the pinned commit holds version ${version}, and upstream.json says ${pin.version}.`);

// A fresh copy each time, so the vendored folder is exactly the pinned dist/ and never a hand-edited one.
rmSync(vendor, { recursive: true, force: true });
process.stdout.write(run("node", [join(checkout, "scripts", "sync.mjs"), "--to", vendor]));
console.log(`Design system ${version} at ${pin.commit.slice(0, 7)} (${pin.tag}) is in vendor/design-system.`);
