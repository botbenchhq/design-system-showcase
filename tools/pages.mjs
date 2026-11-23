// The pages, as functions from the design system's data to HTML.
// Every component name, purpose, example, rule and token value on these pages is read from the
// vendored design system at build time. The sentences around them are written here.

import { escapeHtml as h, inlineMarkdown, pin, sourceUrl, treeUrl } from "./lib.mjs";

export const SITE = {
  name: "Botbench design system",
  url: "https://botbenchhq.github.io/design-system-showcase/",
  repository: "https://github.com/botbenchhq/design-system-showcase",
  headline: "Interfaces built by agents. Consistent by design.",
  description:
    "A design system for AI-built interfaces, with reusable components, shared themes, and automated rules that prevent visual drift.",
};

const NAV = [
  ["components.html", "Components"],
  ["patterns.html", "Patterns"],
  ["themes.html", "Themes"],
  ["rules.html", "Rules and checker"],
  ["get-started.html", "Get started"],
  ["docs.html", "Docs"],
];

const short = pin.commit.slice(0, 7);
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The helpers a page needs, bound to how deep the page sits under the site's root. */
function kit(rel) {
  const icon = (name, cls = "ds-button__icon") => `<svg class="${cls}" aria-hidden="true"><use href="${rel}ds/icons.svg#ds-icon-${name}"></use></svg>`;
  const arrow = (href, text) => `<a class="ds-link" href="${href}">${h(text)} ${icon("arrow-right", "ds-link__icon")}</a>`;
  const outside = (href, text) => `<a class="ds-link" href="${href}">${h(text)} ${icon("external-link", "ds-link__icon")}</a>`;

  let codeCount = 0;
  /** A block of code with a button that copies it. */
  const code = (text, { caption = null, copy = "Copy", label = "the code", scroll = false } = {}) => {
    const id = `code-${++codeCount}`;
    const body = scroll
      ? `<pre class="ds-code-block__body" tabindex="0" role="group" aria-label="${h(caption ?? label)}"><code id="${id}">${h(text)}</code></pre>`
      : `<pre class="ds-code-block__body"><code id="${id}">${h(text)}</code></pre>`;
    return `<div class="ds-stack ds-gap-xs">
<figure class="ds-code-block${scroll ? " ds-code-block--scroll" : ""}">${caption ? `\n<figcaption class="ds-code-block__caption">${h(caption)}</figcaption>` : ""}
${body}
</figure>${
      copy === null
        ? ""
        : `
<span class="ds-copy-button">
<button type="button" class="ds-button ds-button--quiet ds-button--small" data-sc-copy="${id}" aria-label="Copy ${h(label)}">${icon("copy")}${h(copy)}</button>
<span class="ds-copy-button__status" role="status"></span>
</span>`
    }
</div>`;
  };

  /** A live preview: one example of the design system's gallery, in its own document. */
  const frame = (path, title, options = {}) => {
    const { height = 240, min = null, max = null, brand = null, mode = null, fit = false, fixed = false, resizable = false, id = null, swap = null, quiet = false, base = "ds/frames/" } = options;
    const attributes = [
      `class="sc-frame"`,
      "data-frame",
      `data-src="${rel}${base}${path}"`,
      `title="Live preview: ${h(title)}"`,
      `height="${height}"`,
      'loading="lazy"',
      id ? `id="${id}"` : "",
      min ? `data-min="${min}"` : "",
      max ? `data-max="${max}"` : "",
      brand ? `data-brand="${brand}"` : "",
      mode ? `data-mode="${mode}"` : "",
      fit ? "data-fit" : "",
      fixed ? "data-fixed" : "",
      resizable ? "data-resizable" : "",
      swap ? `data-sc-swap-target="${swap}"` : "",
      // A thumbnail is a picture of the component: the link under it is the way in.
      quiet ? 'tabindex="-1" aria-hidden="true" inert' : "",
    ];
    return `<iframe ${attributes.filter(Boolean).join(" ")}></iframe>`;
  };

  const segmented = (legend, name, options, attribute) => `<fieldset class="ds-segmented-control">
<legend class="ds-segmented-control__legend">${h(legend)}</legend>
<div class="ds-segmented-control__options">
${options
  .map(
    ({ value, label, checked = false, data = "" }) =>
      `<label class="ds-segmented-control__option"><input class="ds-segmented-control__input" type="radio" name="${name}" value="${h(value)}"${checked ? " checked" : ""} ${attribute}${data ? ` ${data}` : ""}><span class="ds-segmented-control__label">${h(label)}</span></label>`,
  )
  .join("\n")}
</div>
</fieldset>`;

  const brandControl = (name) =>
    segmented("Theme", name, [{ value: "default", label: "Default" }, { value: "botbench", label: "Botbench", checked: true }], 'data-sc-preview="brand"');
  const modeControl = (name) =>
    segmented("Mode", name, [{ value: "light", label: "Light" }, { value: "dark", label: "Dark", checked: true }], 'data-sc-preview="mode"');

  return { icon, arrow, outside, code, frame, segmented, brandControl, modeControl };
}

const MARK = `<svg class="sc-header__mark" viewBox="3 3 18 18" aria-hidden="true"><path class="sc-header__mark-a" d="M13 4H6A2 2 0 0 0 4 6V17A2 2 0 0 0 6 19H8V9H13Z"/><path class="sc-header__mark-b" d="M11 20H18A2 2 0 0 0 20 18V7A2 2 0 0 0 18 5H16V15H11Z"/></svg>`;

/** The document around a page's content. */
export function layout({ rel = "", path, title, description, current = null, body, theme, noindex = false }) {
  const k = kit(rel);
  const canonical = SITE.url + (path === "index.html" ? "" : path);
  const fullTitle = path === "index.html" ? `${SITE.name}: ${SITE.headline}` : `${title} · ${SITE.name}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(fullTitle)}</title>
<meta name="description" content="${h(description)}">${noindex ? '\n<meta name="robots" content="noindex">' : `\n<link rel="canonical" href="${canonical}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${h(SITE.name)}">
<meta property="og:title" content="${h(fullTitle)}">
<meta property="og:description" content="${h(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}assets/social-preview.png">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="640">
<meta property="og:image:alt" content="${h(SITE.headline)} Three live components of the design system beside the headline.">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${theme.themeColor.dark}" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="${theme.themeColor.light}" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/svg+xml" href="${rel}assets/favicon.svg">
<link rel="stylesheet" href="${rel}ds/design-system.css">
<link rel="stylesheet" href="${rel}ds/themes/${theme.name}.css">
<link rel="stylesheet" href="${rel}assets/site.css">
<script src="${rel}assets/theme.js"></script>
<script type="module" src="${rel}assets/site.js"></script>
</head>
<body>
<a class="ds-button ds-button--small sc-skip" href="#main">Skip to the page</a>
<header class="sc-header">
<div class="sc-wrap sc-header__inner">
<a class="sc-header__brand" href="${rel}index.html" aria-label="Botbench design system, home">${MARK}<span>Botbench <span class="sc-header__sub">Design system</span></span></a>
<nav class="sc-header__nav" aria-label="Pages">
${NAV.map(([href, text]) => `<a class="sc-header__link" href="${rel}${href}"${current === href ? ' aria-current="page"' : ""}>${h(text)}</a>`).join("\n")}
</nav>
<div class="sc-header__actions">
<button type="button" class="ds-button ds-button--small ds-toggle-button" aria-pressed="true" data-sc-mode-toggle>Dark mode</button>
<a class="ds-button ds-button--small sc-header__wide" href="${pin.repository}">GitHub ${k.icon("external-link")}</a>
</div>
</div>
</header>
<main id="main">
${body}
</main>
<footer class="sc-footer">
<div class="sc-wrap sc-footer__grid">
<div class="sc-footer__about">
<p class="sc-footer__title">Botbench design system</p>
<p>Built from version ${h(pin.version)} of the design system, release <a href="${pin.repository}/releases/tag/${pin.tag}">${h(pin.tag)}</a> at commit <a href="${pin.repository}/commit/${pin.commit}"><code>${short}</code></a>. Every component and pattern is still marked draft and may change.</p>
<p>Apache License 2.0. This site sets no cookies and counts no visits.</p>
</div>
<nav class="sc-footer__cols" aria-label="Site map">
<div class="sc-footer__col"><p class="sc-footer__title">Showcase</p><a href="${rel}components.html">Components</a><a href="${rel}patterns.html">Patterns</a><a href="${rel}themes.html">Themes</a><a href="${rel}rules.html">Rules and checker</a></div>
<div class="sc-footer__col"><p class="sc-footer__title">Use it</p><a href="${rel}get-started.html">Install and check</a><a href="${rel}docs.html">Docs</a><a href="${rel}ds/gallery/index.html">The plain gallery</a></div>
<div class="sc-footer__col"><p class="sc-footer__title">Project</p><a href="${pin.repository}">Design system on GitHub</a><a href="${SITE.repository}">Source of this site</a><a href="https://botbenchhq.github.io/">Botbench</a><a href="${pin.repository}/issues">Issues</a></div>
</nav>
</div>
</footer>
</body>
</html>
`;
}

const noscript = (rel) =>
  `<noscript><div class="ds-alert ds-alert--warning"><div class="ds-alert__content"><p class="ds-alert__label">Warning</p><p class="ds-alert__body">The live previews need JavaScript. <a href="${rel}ds/gallery/index.html">The design system's plain gallery</a> shows every example without it.</p></div></div></noscript>`;

const pageHead = ({ eyebrow, title, lead, extra = "" }) => `<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">${eyebrow}</p>
<h1 class="sc-type-display">${title}</h1>
<p class="sc-type-lead">${lead}</p>
</div>${extra}
</div>
</section>`;

const framePath = (item, example) => `${item.name}--${example.id}.html`;
const firstShown = (item) => item.galleryExamples.find((example) => example.verdict !== "dont") ?? item.galleryExamples[0];
const detailHref = (item) => `${item.kind === "pattern" ? "patterns" : "components"}/${item.name}.html`;

/* ------------------------------------------------------------------ Home */

export function home({ catalogue, rules, theme, demos }) {
  const k = kit("");
  const find = (name) => [...catalogue.components, ...catalogue.patterns].find((item) => item.name === name);
  const pick = (name, id = null) => {
    const item = find(name);
    if (!item) throw new Error(`The home page shows ${name}, which the design system no longer has.`);
    const example = id ? item.galleryExamples.find((entry) => entry.id === id) : firstShown(item);
    if (!example) throw new Error(`The home page shows ${name}/${id}, which the design system no longer has.`);
    return { item, example };
  };
  const stage = [pick("approval"), pick("tool-call"), pick("run-timeline")];
  const examples = catalogue.components.reduce((sum, item) => sum + item.galleryExamples.length, 0);
  const fail = demos.find((demo) => demo.id === "gradient-emoji");
  const agentNames = ["approval", "tool-call", "step-group", "run-timeline", "now-doing", "reasoning", "review-decision", "pending-tray", "composer"];
  const agent = agentNames.map(find).filter(Boolean);
  const run = pick("agent-run");
  const dont = pick("button", null);
  const buttonDont = dont.item.galleryExamples.find((example) => example.verdict === "dont");
  const buttonDo = dont.item.galleryExamples.find((example) => example.verdict === "do") ?? dont.example;

  const body = `<section class="sc-section">
<div class="sc-wrap sc-hero">
<div class="sc-hero__copy">
<p class="sc-type-eyebrow">Open source · version ${h(pin.version)} · every component draft</p>
<h1 class="sc-type-display">Interfaces built by agents. <span class="sc-type-display__quiet">Consistent by design.</span></h1>
<p class="sc-type-lead">${h(SITE.description)}</p>
<div class="ds-cluster">
<a class="ds-button ds-button--primary" href="components.html">Explore components ${k.icon("arrow-right")}</a>
<a class="ds-button" href="get-started.html">Get started</a>
</div>
<p class="sc-type-facts">${catalogue.components.length} components · ${catalogue.patterns.length} page patterns · ${rules.count} checker rules · ${rules.tokenCount} tokens · no runtime dependency</p>
</div>
<div class="sc-hero__stage">
<div class="sc-stage">
<div class="sc-stage__bar" data-sc-swap="hero">
${k.segmented(
  "Component",
  "hero-component",
  stage.map(({ item, example }, index) => ({
    value: item.name,
    label: item.title,
    checked: index === 0,
    data: `data-frame="ds/frames/${framePath(item, example)}" data-label="${h(item.title)}" data-caption="${h(item.purpose)}" data-href="${detailHref(item)}" data-link-text="Every ${h(item.title.toLowerCase())} example"`,
  })),
  "",
)}
${k.brandControl("hero-brand")}
</div>
<div class="sc-stage__well">${k.frame(framePath(stage[0].item, stage[0].example), stage[0].item.title, { height: 420, fixed: true, swap: "hero" })}</div>
<p class="sc-stage__caption"><span data-sc-swap-target="hero">${h(stage[0].item.purpose)}</span> Live, from the design system's own gallery. Change the theme: the markup stays the same.</p>
</div>
</div>
</div>
</section>

<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">More than a component library</p>
<h2 class="sc-type-heading">Give your coding agents a design language, then hold every screen to it.</h2>
<p class="sc-type-lead">An agent left alone styles each screen from scratch, and the screens drift apart. This system gives it a closed vocabulary to choose from and a checker that fails the build when it steps outside.</p>
</div>
<div class="sc-points sc-points--three">
<div class="sc-point"><h3 class="sc-type-subheading">A vocabulary agents can read</h3><p class="sc-point__text">One short rules file, a machine-readable index of every component, and example markup to copy. The agent chooses; it does not invent.</p>${k.arrow("components.html", `Browse ${catalogue.components.length} components`)}</div>
<div class="sc-point"><h3 class="sc-type-subheading">Rules that fail the build</h3><p class="sc-point__text">${rules.count} rules: raw colours, off-scale sizes, unknown classes, gradients, a second primary action, nested cards, emoji as icons. A finding exits 1.</p>${k.arrow("rules.html", "See the checker catch one")}</div>
<div class="sc-point"><h3 class="sc-type-subheading">One place to change the brand</h3><p class="sc-point__text">A theme changes the value of a token and never its name, so the look of every screen changes without touching its markup.</p>${k.arrow("themes.html", "Compare the themes")}</div>
</div>
</div>
</section>

<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-duo">
<div class="sc-section__head">
<p class="sc-type-eyebrow">Enforcement, not advice</p>
<h2 class="sc-type-heading">The checker says what is wrong, where, and what to use in its place.</h2>
<p class="sc-type-lead">This is its real output for a button an agent decorated with a gradient and an emoji. The scan reads CSS, HTML, JSX, TSX and class names in script, and it runs in the app's own test command.</p>
<div class="sc-prose">
<ul>
<li><strong>Consistency.</strong> Agents work from a defined vocabulary and stop inventing styling on each screen.</li>
<li><strong>Enforcement.</strong> A static scan and a check of the rendered page catch what the vocabulary does not allow.</li>
<li><strong>Portability.</strong> Plain CSS classes on ordinary HTML, from React, another framework or none.</li>
</ul>
</div>
${k.arrow("rules.html", "Break a rule yourself")}
</div>
<div class="ds-stack">
${k.code(fail.changed, { caption: "try.html, line 12", copy: null })}
${k.code(fail.output, { caption: `node dist/checker/check.mjs try.html · exit ${fail.exit}`, copy: null })}
<p class="sc-type-note">Recorded when this site was built, by running checker ${h(pin.version)} on the file. Nothing here is a mock-up.</p>
</div>
</div>
</div>
</section>

<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">Why a constraint helps</p>
<h2 class="sc-type-heading">Every component says what to do, and what not to.</h2>
<p class="sc-type-lead">Each of the ${catalogue.components.length} components ships its guidance beside its markup: when to use it, when not, and worked examples of both. ${examples} examples in all, each one live in the catalogue.</p>
</div>
<div class="sc-duo sc-duo--even">
<article class="sc-example" aria-labelledby="home-do">
<h3 class="sc-example__title" id="home-do"><span class="sc-example__verdict sc-example__verdict--do">${k.icon("check", "sc-example__icon")}Do</span> ${h(buttonDo.title)}</h3>
<div class="sc-stage"><div class="sc-stage__well">${k.frame(framePath(dont.item, buttonDo), `Do: ${buttonDo.title}`, { height: 160, min: 120, max: 360 })}</div></div>
<p class="sc-example__reason">${buttonDo.reason ?? ""}</p>
</article>
${
  buttonDont
    ? `<article class="sc-example sc-example--dont" aria-labelledby="home-dont">
<h3 class="sc-example__title" id="home-dont"><span class="sc-example__verdict sc-example__verdict--dont">${k.icon("x", "sc-example__icon")}Don't</span> ${h(buttonDont.title)}</h3>
<div class="sc-stage"><div class="sc-stage__well">${k.frame(framePath(dont.item, buttonDont), `Don't: ${buttonDont.title}`, { height: 160, min: 120, max: 360 })}</div></div>
<p class="sc-example__reason">${buttonDont.reason ?? ""}</p>
</article>`
    : ""
}
</div>
</div>
</section>

<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-duo sc-duo--reverse">
<div class="sc-stage">
<div class="sc-stage__well">${k.frame(framePath(run.item, run.example), `${run.item.title}: ${run.example.title}`, { height: 560, fixed: true })}</div>
<p class="sc-stage__caption">The agent-run page pattern: ${h(run.item.purpose)}</p>
</div>
<div class="ds-stack">
<div class="sc-section__head">
<p class="sc-type-eyebrow">Made for agent workflows</p>
<h2 class="sc-type-heading">Components for the screens agent products need.</h2>
<p class="sc-type-lead">Transcripts, tool calls, approvals, long runs and the decision at the end. These are not in a general-purpose library.</p>
</div>
<ul class="ds-list ds-list--dense">
${agent
  .map(
    (item) => `<li class="ds-list__row"><a class="ds-list__link" href="${detailHref(item)}"><span class="ds-list__body"><span class="ds-list__primary">${h(item.title)}</span><span class="ds-list__secondary">${h(item.purpose)}</span></span></a></li>`,
  )
  .join("\n")}
</ul>
${k.arrow("components.html?category=Agent+surfaces", "All agent surfaces")}
</div>
</div>
</div>
</section>

<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">Where it stands</p>
<h2 class="sc-type-heading">Early, and plain about it.</h2>
</div>
<div class="sc-points">
<div class="sc-point"><h3 class="sc-type-subheading">Everything is draft</h3><p class="sc-point__text">All ${catalogue.components.length} components and ${catalogue.patterns.length} patterns may still change. Version ${h(pin.version)} is not a stable API.</p></div>
<div class="sc-point"><h3 class="sc-type-subheading">One app uses it</h3><p class="sc-point__text"><a href="https://botbenchhq.github.io/">Botbench</a>, a workbench for coding agents, is the only consumer so far. This site is built with it too, and passes the same checker.</p></div>
<div class="sc-point"><h3 class="sc-type-subheading">Tested in desktop browsers</h3><p class="sc-point__text">The gallery is tested in Chrome, with a subset in Playwright's WebKit and Firefox. Nothing has been tried on a real iPhone or with a screen reader.</p></div>
<div class="sc-point"><h3 class="sc-type-subheading">Copied, not installed</h3><p class="sc-point__text">There is no npm package. An app syncs a copy of <code>dist/</code> into its own repository, and the checker verifies the copy was not edited.</p></div>
</div>
<div class="ds-cluster">
${k.outside(`${pin.repository}#status-and-limits`, "Status and limits, in full")}
${k.outside(pin.repository, "The design system on GitHub")}
</div>
</div>
</section>`;

  return layout({ path: "index.html", title: SITE.name, description: SITE.description, body: noscript("") + body, theme });
}

/* ------------------------------------------------------------- Catalogue */

function catalogueList(items, k, { rel = "" } = {}) {
  return items
    .map((item) => {
      const example = firstShown(item);
      const text = [item.name, item.title, item.purpose, item.category, ...item.classes].join(" ").toLowerCase();
      return `<li class="sc-specimen" data-sc-item data-category="${h(item.category)}" data-text="${h(text)}">
<div class="sc-specimen__preview">${k.frame(framePath(item, example), item.title, { height: 200, fit: true, fixed: true, quiet: true })}</div>
<div class="sc-specimen__body">
<a class="sc-specimen__name" href="${rel}${detailHref(item)}">${h(item.title)}</a>
<p class="sc-specimen__purpose">${h(item.purpose)}</p>
<p class="sc-specimen__meta">${h(item.category)} · ${plural(item.galleryExamples.length, "example")} · ${h(item.status)}</p>
</div>
</li>`;
    })
    .join("\n");
}

export function components({ catalogue, theme }) {
  const k = kit("");
  const chips = [{ value: "", label: "All", checked: true }, ...catalogue.categories.map((title) => ({ value: title, label: title }))];
  const body = `${pageHead({
    eyebrow: `Components · ${catalogue.components.length} · all draft`,
    title: "Every component, live.",
    lead: `Each one is drawn by the design system's own stylesheet from its own example markup, version ${h(pin.version)}. Open a component for every variant and state, its guidance and the markup to copy.`,
  })}
<section class="sc-section sc-section--plain">
<div class="sc-wrap sc-section__body">
${noscript("")}
<div class="sc-controls">
<form class="ds-search-field sc-controls__grow" role="search" aria-label="Components">
<label class="ds-search-field__label" for="catalogue-search">Search components</label>
<div class="ds-search-field__box">
<input class="ds-field__control ds-search-field__input" type="search" id="catalogue-search" name="q" placeholder="Name, purpose or class" autocomplete="off" data-sc-search aria-describedby="catalogue-hint">
<button type="button" class="ds-search-field__clear" data-sc-search-clear hidden><span class="ds-visually-hidden">Clear the search</span></button>
</div>
<p class="ds-search-field__count" aria-live="polite" data-sc-count>${catalogue.components.length} components</p>
</form>
<p class="sc-type-note" id="catalogue-hint">Press <kbd class="ds-kbd">/</kbd> to search.</p>
</div>
<fieldset class="ds-filter-chips">
<legend class="ds-filter-chips__legend">Category</legend>
<div class="ds-filter-chips__list">
${chips.map((chip) => `<label class="ds-filter-chips__chip"><input class="ds-filter-chips__input" type="radio" name="category" value="${h(chip.value)}"${chip.checked ? " checked" : ""} data-sc-category> ${h(chip.label)}</label>`).join("\n")}
</div>
</fieldset>
<ul class="sc-specimens" data-sc-catalogue data-sc-noun="components">
${catalogueList(catalogue.components, k)}
</ul>
<div class="ds-empty-state" data-sc-empty hidden>
<h2 class="ds-empty-state__title">No component matches</h2>
<p class="ds-empty-state__body">Try a shorter word, or a need such as "status" or "upload". The design system's guide to choosing a component maps needs to names.</p>
<div class="ds-empty-state__action"><button type="button" class="ds-button" data-sc-reset>Show every component</button></div>
</div>
</div>
</section>`;
  return layout({
    path: "components.html",
    title: "Components",
    description: `A searchable catalogue of the design system's ${catalogue.components.length} components, each drawn live with its variants, states, guidance and markup.`,
    current: "components.html",
    body,
    theme,
  });
}

/* ----------------------------------------------------- Component detail */

const list = (items) => `<ul>\n${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("\n")}\n</ul>`;

export function detail({ item, theme, siblings }) {
  const rel = "../";
  const k = kit(rel);
  const isPattern = item.kind === "pattern";
  const folder = `${isPattern ? "patterns" : "components"}/${item.name}`;
  const states = [...new Set(item.galleryExamples.map((example) => example.state).filter(Boolean))];
  const counts = { do: item.galleryExamples.filter((example) => example.verdict === "do").length, dont: item.galleryExamples.filter((example) => example.verdict === "dont").length };
  const at = siblings.indexOf(item);
  const previous = siblings[at - 1];
  const next = siblings[at + 1];

  const examples = item.galleryExamples
    .map((example) => {
      const dont = example.verdict === "dont";
      const verdict =
        example.verdict === "do"
          ? `<span class="sc-example__verdict sc-example__verdict--do">${k.icon("check", "sc-example__icon")}Do</span> `
          : dont
            ? `<span class="sc-example__verdict sc-example__verdict--dont">${k.icon("x", "sc-example__icon")}Don't</span> `
            : "";
      return `<article class="sc-example${dont ? " sc-example--dont" : ""}" id="example-${h(example.id)}" aria-labelledby="example-${h(example.id)}-title" data-sc-example data-verdict="${example.verdict}" data-state="${h(example.state ?? "")}">
<div class="sc-example__head">
<h3 class="sc-example__title" id="example-${h(example.id)}-title">${verdict}${h(example.title)}</h3>
${example.state ? `<p class="sc-type-note">State: <code>${h(example.state)}</code></p>` : ""}
${example.reason ? `<p class="sc-example__reason">${example.reason}</p>` : ""}
</div>
<div class="sc-stage"><div class="sc-stage__well">${k.frame(framePath(item, example), `${item.title}: ${example.title}`, { height: isPattern ? 560 : 200, min: 96, max: isPattern ? 1400 : 1200, resizable: true })}</div></div>
<details class="ds-disclosure">
<summary class="ds-disclosure__summary">Markup${dont ? ", shown to be recognised" : ""}</summary>
<div class="ds-disclosure__content ds-stack ds-gap-sm">
${dont ? '<p class="sc-type-note">A don\'t is in the gallery so that a reviewer knows it on sight. It is left out of the index agents copy from.</p>' : ""}
${k.code(example.code, { copy: dont ? null : "Copy markup", label: `the markup of ${example.title}`, scroll: true, caption: `${item.title}: ${example.title}` })}
</div>
</details>
</article>`;
    })
    .join("\n");

  const variantList = (entries) =>
    `<dl class="ds-key-value">\n${entries
      .map(
        (entry) =>
          `<div class="ds-key-value__item"><dt class="ds-key-value__label">${h(entry.name)}${entry.class ? ` <code>${h(entry.class)}</code>` : ""}</dt><dd class="ds-key-value__value">${inlineMarkdown(entry.use ?? "")}</dd></div>`,
      )
      .join("\n")}\n</dl>`;

  const guidance = [
    item.whenToUse?.length ? `<section class="sc-prose" aria-labelledby="g-use"><h3 class="sc-type-subheading" id="g-use">When to use it</h3>${list(item.whenToUse)}</section>` : "",
    item.whenNotToUse?.length ? `<section class="sc-prose" aria-labelledby="g-not"><h3 class="sc-type-subheading" id="g-not">When not to use it</h3>${list(item.whenNotToUse)}</section>` : "",
  ].join("\n");

  const reference = [
    item.variants?.length ? `<section class="sc-prose" aria-labelledby="r-variants"><h3 class="sc-type-subheading" id="r-variants">Variants</h3>${variantList(item.variants)}</section>` : "",
    item.sizes?.length ? `<section class="sc-prose" aria-labelledby="r-sizes"><h3 class="sc-type-subheading" id="r-sizes">Sizes</h3>${variantList(item.sizes)}</section>` : "",
    item.accessibility?.length ? `<section class="sc-prose" aria-labelledby="r-a11y"><h3 class="sc-type-subheading" id="r-a11y">Accessibility</h3>${list(item.accessibility)}</section>` : "",
    `<section class="sc-prose" aria-labelledby="r-classes"><h3 class="sc-type-subheading" id="r-classes">Classes</h3><p>${item.classes.map((name) => `<code>${h(name)}</code>`).join(" ")}</p>${
      item.states?.length ? `<p>States: ${item.states.map((name) => `<code>${h(name)}</code>`).join(" ")}</p>` : ""
    }</section>`,
  ].join("\n");

  const body = `<section class="sc-section">
<div class="sc-wrap sc-section__body">
<nav class="ds-breadcrumb" aria-label="Breadcrumb">
<ol class="ds-breadcrumb__list">
<li class="ds-breadcrumb__item"><a class="ds-breadcrumb__link" href="${rel}${isPattern ? "patterns.html" : "components.html"}">${isPattern ? "Patterns" : "Components"}</a></li>
${isPattern ? "" : `<li class="ds-breadcrumb__item"><a class="ds-breadcrumb__link" href="${rel}components.html?category=${encodeURIComponent(item.category)}">${h(item.category)}</a></li>`}
<li class="ds-breadcrumb__item"><span class="ds-breadcrumb__current" aria-current="page">${h(item.title)}</span></li>
</ol>
</nav>
<div class="sc-section__head">
<h1 class="sc-type-display">${h(item.title)}</h1>
<p class="sc-type-lead">${h(item.purpose)}</p>
<div class="ds-cluster"><span class="ds-badge">${h(item.status[0].toUpperCase() + item.status.slice(1))}</span><span class="sc-type-note">${isPattern ? "Page pattern" : h(item.category)} · ${plural(item.galleryExamples.length, "example")}${counts.do ? ` · ${counts.do} do` : ""}${counts.dont ? ` · ${plural(counts.dont, "don't", "don'ts")}` : ""} · may still change</span></div>
</div>
<div class="ds-cluster">
${k.outside(treeUrl(folder), "Source")}
${k.outside(sourceUrl(`${folder}/meta.json`), "Guidance as data")}
<a class="ds-link" href="${rel}ds/gallery/${item.name}.html">The plain gallery page</a>
</div>
</div>
</section>
<section class="sc-section">
<div class="sc-wrap sc-section__body">
${noscript(rel)}
<div class="sc-controls sc-controls--sticky">
${k.brandControl("preview-brand")}
${k.modeControl("preview-mode")}
${k.segmented("Width", "preview-size", [{ value: "phone", label: "Phone" }, { value: "tablet", label: "Tablet" }, { value: "full", label: "Full", checked: true }], "data-sc-size")}
<div class="ds-field">
<label class="ds-field__label" for="state-filter">Show</label>
<div class="ds-select">
<select class="ds-field__control ds-select__control" id="state-filter" data-sc-state>
<option value="">Every example</option>
${counts.do ? '<option value="do">Do</option>' : ""}
${counts.dont ? '<option value="dont">Don\'t</option>' : ""}
${states.map((state) => `<option value="${h(state)}">State: ${h(state)}</option>`).join("\n")}
</select>
</div>
</div>
<p class="sc-type-note" aria-live="polite" data-sc-state-count>${plural(item.galleryExamples.length, "example")}</p>
</div>
<h2 class="ds-visually-hidden">Examples</h2>
${examples}
</div>
</section>
<section class="sc-section">
<div class="sc-wrap sc-section__body">
<h2 class="sc-type-heading">Guidance</h2>
<div class="sc-duo sc-duo--even">
${guidance}
</div>
${reference}
</div>
</section>
<section class="sc-section sc-section--plain">
<div class="sc-wrap">
<nav class="ds-cluster" aria-label="Neighbouring ${isPattern ? "patterns" : "components"}">
${previous ? `<a class="ds-link" href="${previous.name}.html">${k.icon("arrow-left", "ds-link__icon")} ${h(previous.title)}</a>` : ""}
${next ? `<a class="ds-link" href="${next.name}.html">${h(next.title)} ${k.icon("arrow-right", "ds-link__icon")}</a>` : ""}
</nav>
</div>
</section>`;

  return layout({
    rel,
    path: `${isPattern ? "patterns" : "components"}/${item.name}.html`,
    title: `${item.title}${isPattern ? " pattern" : ""}`,
    description: item.purpose,
    current: isPattern ? "patterns.html" : "components.html",
    body,
    theme,
  });
}

/* --------------------------------------------------------------- Patterns */

export function patterns({ catalogue, theme }) {
  const k = kit("");
  const order = ["agent-run", "app-shell", "master-detail", "filter-results", "settings-page", "multi-step-form", "sign-in", "not-found"];
  const sorted = [...catalogue.patterns].sort((a, b) => (order.indexOf(a.name) + 99) % 99 - ((order.indexOf(b.name) + 99) % 99));
  const body = `${pageHead({
    eyebrow: `Patterns · ${catalogue.patterns.length} · all draft`,
    title: "Whole screens, composed from the catalogue.",
    lead: "A page pattern is a screen built from the components, to the same contract: its own examples, guidance and checks. An agent starts a new screen from one. Every pattern here is the design system's own, drawn from its gallery; none is a mock-up made for this site.",
  })}
${noscript("")}
${sorted
  .map((item, index) => {
    const example = firstShown(item);
    const uses = [...new Set(item.classes.map((name) => name.replace(/^ds-/, "").split("__")[0].split("--")[0]))];
    return `<section class="sc-section${index === sorted.length - 1 ? " sc-section--plain" : ""}">
<div class="sc-wrap sc-section__body">
<div class="sc-duo sc-duo--aside">
<div class="ds-stack">
<h2 class="sc-type-heading">${h(item.title)}</h2>
<p class="sc-example__reason">${h(item.purpose)}</p>
<p class="sc-type-note">${plural(item.galleryExamples.length, "example")} · ${h(item.status)}</p>
${k.arrow(detailHref(item), `Open ${item.title.toLowerCase()}`)}
</div>
<div class="sc-stage">
<div class="sc-stage__well">${k.frame(framePath(item, example), `${item.title}: ${example.title}`, { height: 520, min: 240, max: 900 })}</div>
<p class="sc-stage__caption">${h(example.title)}${uses.length ? "" : ""}</p>
</div>
</div>
</div>
</section>`;
  })
  .join("\n")}`;
  return layout({
    path: "patterns.html",
    title: "Patterns",
    description: `The design system's ${catalogue.patterns.length} page patterns, drawn live: the screen of one agent run, the app shell, master and detail, filter and results, settings, a multi-step form, sign in and not found.`,
    current: "patterns.html",
    body,
    theme,
  });
}

/* ----------------------------------------------------------------- Themes */

const GROUP_TITLES = {
  color: ["Colour", "Surfaces, text, borders and the tone of each status. A status always carries its icon and its word as well."],
  font: ["Typefaces", "One for interface text and one for mono text."],
  text: ["Type sizes", "Six sizes. A size outside this scale fails the check."],
  leading: ["Line heights", "One for each type size."],
  weight: ["Weights", "Three."],
  space: ["Spacing", "Every margin, padding, gap and inset is one of these."],
  radius: ["Radii", "Three corner radii."],
  "border-width": ["Border", "One width."],
  shadow: ["Shadow", "One, for overlays only: menus, popovers, dialogs and toasts."],
  duration: ["Motion", "Three durations. Every transition stops when the reader asks for reduced motion."],
  ease: ["Easing", "One curve."],
  z: ["Layers", "Four layers, in order."],
  size: ["Sizes", "The pointer target and the three column widths."],
  breakpoint: ["Breakpoint", "One. The compact layout is styled first."],
};

export function themes({ catalogue, tokens, theme }) {
  const k = kit("");
  const find = (name) => catalogue.components.find((item) => item.name === name);
  const specimens = [
    ["button", null],
    ["badge", null],
    ["approval", null],
    ["alert", null],
    ["field", null],
    ["run-status", null],
    ["tabs", null],
    ["usage-meter", null],
  ]
    .map(([name]) => find(name))
    .filter(Boolean)
    .map((item) => ({ item, example: firstShown(item) }));
  const cells = [
    ["default", "light", "Default · light"],
    ["botbench", "light", "Botbench · light"],
    ["default", "dark", "Default · dark"],
    ["botbench", "dark", "Botbench · dark"],
  ];
  const swatch = (hex) => `<svg class="sc-swatch" viewBox="0 0 16 16" aria-hidden="true"><rect class="sc-swatch__fill" x="0.5" y="0.5" width="15" height="15" rx="3" fill="${h(hex)}"/></svg>`;
  const value = (text, colour) => `<span class="sc-token-value">${colour && /^#[0-9A-F]{6}$/.test(text) ? swatch(text) : ""}${h(text)}</span>`;
  const columns = cells.map(([brand, mode, label]) => ({ brand, mode, label }));

  const tables = tokens.groups
    .map(({ group, rows }) => {
      const [title, note] = GROUP_TITLES[group] ?? [group, ""];
      const colour = group === "color";
      // A group whose values do not differ by mode is shown once for each theme.
      const modal = rows.some((row) => Object.values(row.values).some((pair) => pair.light !== pair.dark));
      const shown = modal ? columns : columns.filter((column) => column.mode === "light").map((column) => ({ ...column, label: column.brand === "default" ? "Default" : "Botbench" }));
      return `<section class="ds-stack" aria-labelledby="tokens-${group}">
<div class="sc-section__head"><h3 class="sc-type-subheading" id="tokens-${group}">${h(title)}</h3><p class="sc-example__reason">${h(note)}</p></div>
<table class="ds-data-table">
<caption class="ds-data-table__caption">${h(title)}: ${plural(rows.length, "token")}</caption>
<thead><tr><th scope="col">Token</th>${shown.map((column) => `<th scope="col">${h(column.label)}</th>`).join("")}</tr></thead>
<tbody>
${rows
  .map(
    (row) =>
      `<tr><th scope="row"><code>${h(row.name)}</code></th>${shown
        .map((column) => `<td data-label="${h(column.label)}">${value(row.values[column.brand][column.mode], colour)}</td>`)
        .join("")}</tr>`,
  )
  .join("\n")}
</tbody>
</table>
</section>`;
    })
    .join("\n");

  const total = tokens.groups.reduce((sum, group) => sum + group.rows.length, 0);
  const body = `${pageHead({
    eyebrow: "Themes · Default and Botbench · light and dark",
    title: "One markup. A theme changes only the values.",
    lead: `A theme is one file that sets the values of the system's ${total} tokens in light and dark. It cannot add a name, so every component and every checker rule works the same under it, and an app's markup does not change when its brand does.`,
  })}
<section class="sc-section">
<div class="sc-wrap sc-section__body">
${noscript("")}
<div class="sc-controls">
<div class="ds-field">
<label class="ds-field__label" for="theme-specimen">Component to compare</label>
<div class="ds-select">
<select class="ds-field__control ds-select__control" id="theme-specimen" data-sc-swap="matrix">
${specimens.map(({ item, example }) => `<option value="${item.name}" data-frame="ds/frames/${framePath(item, example)}" data-label="${h(item.title)}">${h(item.title)}: ${h(example.title)}</option>`).join("\n")}
</select>
</div>
</div>
<p class="sc-type-note">The four previews below load the same file. Only the stylesheet of the theme and the <code>data-theme</code> attribute differ.</p>
</div>
<div class="sc-matrix">
${cells
  .map(
    ([brand, mode, label]) => `<div class="sc-stage">
<div class="sc-stage__bar"><h2 class="sc-type-subheading">${h(label)}</h2></div>
<div class="sc-stage__well">${k.frame(framePath(specimens[0].item, specimens[0].example), `${specimens[0].item.title}, ${label}`, { height: 240, min: 120, max: 720, brand, mode, swap: "matrix" })}</div>
</div>`,
  )
  .join("\n")}
</div>
</div>
</section>
<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-duo">
<div class="sc-section__head">
<p class="sc-type-eyebrow">How a theme is held to the system</p>
<h2 class="sc-type-heading">The build refuses a theme that breaks a guarantee.</h2>
<div class="sc-prose">
<ul>
<li>It may set only the names of existing tokens.</li>
<li>It must give light and dark values, and its dark and <code>auto</code> blocks must agree.</li>
<li>Every colour is six-digit hex.</li>
<li>Every text pair reaches 4.5:1 and every border and focus pair 3:1, in both modes.</li>
</ul>
</div>
<div class="ds-cluster">
${k.outside(sourceUrl("themes/botbench.css"), "The Botbench theme, with its reasons")}
${k.outside(sourceUrl("docs/consumer-guide.md") + "#12-themes", "Write a theme")}
</div>
</div>
<div class="ds-stack">
${k.code(`<link rel="stylesheet" href="/vendor/design-system/design-system.css">\n<link rel="stylesheet" href="/vendor/design-system/themes/botbench.css">`, { caption: "Load a theme after the system's stylesheet", label: "the two stylesheet links" })}
${k.code(`<html lang="en" data-theme="auto">`, { caption: "Choose the mode: light, dark, or auto to follow the device", label: "the data-theme attribute" })}
<p class="sc-type-note">Botbench is the one theme shipped. Its default mode is dark; with no <code>data-theme</code> the page is dark.</p>
</div>
</div>
</div>
</section>
<section class="sc-section sc-section--plain">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">Token values</p>
<h2 class="sc-type-heading">${total} tokens, and what each theme sets them to.</h2>
<p class="sc-type-lead">Read from <code>tokens.json</code> and <code>themes/botbench.tokens.json</code> of version ${h(pin.version)}. The vocabulary is closed: an app cannot add a token.</p>
</div>
${tables}
</div>
</section>`;
  return layout({
    path: "themes.html",
    title: "Themes",
    description: "Compare the design system's Default and Botbench themes in light and dark on the same markup, and read the value of every token under each.",
    current: "themes.html",
    body,
    theme,
  });
}

/* ------------------------------------------------------------------ Rules */

// The checker reads the waiver keyword wherever it stands, also in a sentence that only quotes it.
// A line-break opportunity inside the word keeps this page's quotation from being read as a waiver.
const quoteWaiver = (html) => html.replaceAll("ds-waive", "ds-<wbr>waive");

export function rulesPage({ rules, demos, catalogue, theme }) {
  const k = kit("");
  const pass = demos.find((demo) => demo.id === "pass");
  const scenarios = demos;
  const donts = [];
  for (const item of catalogue.components) {
    for (const example of item.galleryExamples) {
      const rule = /Checker rule: <code>([a-z-]+)<\/code>/.exec(example.reason ?? "")?.[1];
      if (example.verdict === "dont" && rule) donts.push({ item, example, rule });
    }
  }
  const body = `${pageHead({
    eyebrow: `Rules and checker · ${rules.count} rules · no setting turns one off`,
    title: "The part that keeps agent-built screens consistent.",
    lead: "Guidance alone does not hold: an agent that has read every rule will still reach for a gradient. So the vocabulary is closed, and two checks fail the build when a screen steps outside it. One reads the app's source. The other reads the page as it is drawn.",
  })}
<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-points sc-points--three">
<div class="sc-point"><h2 class="sc-type-subheading">1. Rules an agent reads</h2><p class="sc-point__text">One short file, <code>rules/core.md</code>, says the vocabulary is closed and in what order to choose. Seven longer files are opened only when needed.</p>${k.outside(sourceUrl("rules/core.md"), "core.md")}</div>
<div class="sc-point"><h2 class="sc-type-subheading">2. A static scan</h2><p class="sc-point__text"><code>checker/check.mjs</code> reads CSS, HTML, JSX, TSX and class names in script. No dependencies. Exit 0 clean, 1 on findings, 2 when it could not run.</p>${k.outside(treeUrl("checker"), "The checker's source")}</div>
<div class="sc-point"><h2 class="sc-type-subheading">3. A check of the rendered page</h2><p class="sc-point__text"><code>check-dom.js</code> defines <code>dsCheckDom()</code>, which an app's end-to-end tests call on each screen and each open overlay.</p>${k.outside(sourceUrl("docs/consumer-guide.md") + "#6-run-the-rendered-check-in-the-end-to-end-tests", "How to call it")}</div>
</div>
</div>
</section>
<section class="sc-section" id="break-a-rule">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">Try it</p>
<h2 class="sc-type-heading">Break a rule.</h2>
<p class="sc-type-lead">Start from a page that passes, then choose what an unconstrained agent might do to it. You see the source, the page it draws, and what each check says.</p>
</div>
<div class="ds-alert">
<div class="ds-alert__content">
<p class="ds-alert__label">What is real here</p>
<p class="ds-alert__body">The static scan needs Node, so it does not run in your browser: its output below was recorded when this site was built, by running checker ${h(pin.version)} on exactly the source shown. The rendered check is the real <code>check-dom.js</code>, and the button runs it in your browser on the preview. Neither is imitated.</p>
</div>
</div>
${noscript("")}
<div data-sc-switch="demo">
<fieldset class="ds-filter-chips">
<legend class="ds-filter-chips__legend">What happens to the page</legend>
<div class="ds-filter-chips__list">
${scenarios.map((demo, index) => `<label class="ds-filter-chips__chip"><input class="ds-filter-chips__input" type="radio" name="demo" value="${demo.id}"${index === 0 ? " checked" : ""}> ${h(demo.label)}</label>`).join("\n")}
</div>
</fieldset>
</div>
${scenarios
  .map(
    (demo, index) => `<div class="sc-duo sc-duo--even" data-sc-panel="demo:${demo.id}"${index === 0 ? "" : " hidden"}>
<div class="ds-stack">
<h3 class="sc-type-subheading">${h(demo.title)}</h3>
<p class="sc-example__reason">${h(demo.why)}</p>
${demo.files.map((file) => k.code(file.text, { caption: file.name, label: file.name, copy: null, scroll: true })).join("\n")}
</div>
<div class="ds-stack">
<div class="sc-stage">
<div class="sc-stage__bar"><p class="sc-type-note">The page this source draws</p></div>
<div class="sc-stage__well">${k.frame(`${demo.id}/index.html`, `the page of the scenario: ${demo.label}`, { height: 200, min: 140, max: 520, id: `demo-frame-${demo.id}`, base: "demos/", brand: "default" })}</div>
</div>
<div class="sc-output">
<div class="sc-output__exit"><span class="ds-badge ${demo.exit === 0 ? "ds-badge--success" : "ds-badge--danger"}">${demo.exit === 0 ? "Passed" : "Failed"}</span><span class="sc-type-note">Static scan · exit ${demo.exit} · recorded at build</span></div>
${k.code(demo.output, { caption: demo.command, label: "the output", copy: null, scroll: true })}
</div>
<div class="sc-output">
<div class="ds-cluster"><button type="button" class="ds-button" data-sc-check="demo-frame-${demo.id}" data-sc-output="demo-result-${demo.id}" data-sc-prefix="app">Run the rendered check on this page</button><span class="sc-type-note">Runs check-dom.js in your browser</span></div>
<div data-sc-result hidden>
<figure class="ds-code-block ds-code-block--scroll">
<figcaption class="ds-code-block__caption">dsCheckDom(document.documentElement, { appPrefix: "app" })</figcaption>
<pre class="ds-code-block__body" tabindex="0" role="group" aria-label="Result of the rendered check"><code id="demo-result-${demo.id}" aria-live="polite"></code></pre>
</figure>
</div>
</div>
</div>
</div>`,
  )
  .join("\n")}
<p class="sc-type-note">The two checks overlap but are not the same. The rendered check holds the rules about structure and copy and does not read computed styles, so a raw colour in a stylesheet is the static scan's to catch.</p>
</div>
</section>
<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">In the catalogue</p>
<h2 class="sc-type-heading">Every don't names the rule that catches it.</h2>
<p class="sc-type-lead">${donts.length} of the gallery's don'ts are tied to a checker rule. The design system's own tests run the checker over them and expect exactly that finding.</p>
</div>
<ul class="ds-list ds-list--dense">
${donts
  .slice(0, 400)
  .filter((entry, index, all) => all.findIndex((other) => other.rule === entry.rule) === index)
  .slice(0, 12)
  .map(
    ({ item, example, rule }) =>
      `<li class="ds-list__row"><a class="ds-list__link" href="${detailHref(item)}#example-${h(example.id)}"><span class="ds-list__body"><span class="ds-list__primary">${h(example.title)}</span><span class="ds-list__secondary">${h(item.title)}</span></span><span class="ds-list__meta"><code>${h(rule)}</code></span></a></li>`,
  )
  .join("\n")}
</ul>
</div>
</section>
<section class="sc-section">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">Supported and not</p>
<h2 class="sc-type-heading">All ${rules.count} rules.</h2>
<p class="sc-type-lead">From <code>rules/checker-rules.md</code>. The one exception to a rule is an inline waiver that gives a reason, and every run prints each waiver.</p>
</div>
${rules.groups
  .map(
    (group) => `<table class="ds-data-table">
<caption class="ds-data-table__caption">${h(group.title)}</caption>
<thead><tr><th scope="col">Rule</th><th scope="col">Not supported</th><th scope="col">Use in its place</th></tr></thead>
<tbody>
${group.rules.map((rule) => `<tr id="rule-${rule.id}"><th scope="row"><code>${rule.id}</code></th><td data-label="Not supported">${quoteWaiver(inlineMarkdown(rule.meaning))}</td><td data-label="Use in its place">${quoteWaiver(inlineMarkdown(rule.fix))}</td></tr>`).join("\n")}
</tbody>
</table>`,
  )
  .join("\n")}
</div>
</section>
<section class="sc-section sc-section--plain" id="ci">
<div class="sc-wrap sc-section__body">
<div class="sc-section__head">
<p class="sc-type-eyebrow">In CI</p>
<h2 class="sc-type-heading">The checks run where the tests run.</h2>
<p class="sc-type-lead">There is no service and no plugin. The scan is a Node script in the app's test command; the rendered check is one call in its end-to-end tests. Whatever runs the tests, a person, an agent or a pipeline, runs the checks.</p>
</div>
<div class="sc-duo sc-duo--even">
<div class="ds-stack">
${k.code(`{\n  "scripts": {\n    "test": "node vendor/design-system/checker/check.mjs --config design-system.config.json && node --test"\n  }\n}`, { caption: "package.json: the static scan gates the test command", label: "the test script" })}
${k.code(pass.output.trim(), { caption: "The summary line, for the pull request description", copy: null })}
</div>
<div class="ds-stack">
${k.code(`import { readFileSync } from "node:fs";\nimport { expect, test } from "@playwright/test";\n\nconst checkDom = readFileSync("vendor/design-system/check-dom.js", "utf8");\n\nasync function expectNoDesignFindings(page) {\n  await page.evaluate(checkDom);\n  expect(await page.evaluate(() => dsCheckDom(document.documentElement, { appPrefix: "app" }))).toEqual([]);\n}`, { caption: "Playwright: the rendered check on each screen", label: "the Playwright helper", scroll: true })}
</div>
</div>
<div class="sc-prose">
<p>This site is held to the same rules. Its CI syncs the pinned release, builds the pages, runs the static scan over every page and stylesheet it wrote, and runs <code>dsCheckDom()</code> and axe on each page in a browser. A finding fails the deployment.</p>
</div>
<div class="ds-cluster">
${k.outside(`${SITE.repository}/blob/main/.github/workflows/pages.yml`, "This site's workflow")}
${k.outside(sourceUrl("rules/checker-rules.md"), "checker-rules.md")}
${k.outside(sourceUrl("docs/consumer-guide.md") + "#9-optional-a-claude-code-hook", "The Claude Code hook")}
</div>
</div>
</section>`;
  return layout({
    path: "rules.html",
    title: "Rules and checker",
    description: `How the design system keeps agent-built interfaces consistent: ${rules.count} rules, a static scan, a check of the rendered page, and a demonstration with the checker's real output.`,
    current: "rules.html",
    body,
    theme,
  });
}

/* ------------------------------------------------------------ Get started */

export function getStarted({ demos, rules, catalogue, theme }) {
  const k = kit("");
  const pass = demos.find((demo) => demo.id === "pass");
  const fail = demos.find((demo) => demo.id === "gradient-emoji");
  const step = (id, title, text, body) => `<li class="sc-step" id="${id}">
<div class="ds-stack ds-gap-sm"><h2 class="sc-type-subheading sc-step__title">${title}</h2><p class="sc-example__reason">${text}</p></div>
<div class="sc-step__body">${body}</div>
</li>`;
  const body = `${pageHead({
    eyebrow: "Get started · Node 24 or later · nothing to install",
    title: "From a clone to a failing check in a few minutes.",
    lead: `The design system is not on npm. An app keeps a copy of its <code>dist/</code> folder, which is committed, so there is nothing to build. These are the commands of version ${h(pin.version)}; this site's own build runs the sync and the checker with them on every deployment.`,
  })}
<section class="sc-section sc-section--plain">
<div class="sc-wrap">
<ol class="sc-steps">
${step(
  "obtain",
  "Get the design system",
  "Clone it beside your app, at the release this site was built from.",
  k.code(`git clone https://github.com/botbenchhq/design-system.git\ncd design-system\ngit checkout ${pin.tag}`, { label: "the clone commands" }),
)}
${step(
  "explore",
  "Explore the gallery",
  "Serve the folder and open the gallery: every component and pattern in every variant and state, with its guidance. Icons do not load from a file: URL, so use a server.",
  `${k.code(`python3 -m http.server`, { label: "the server command" })}
<p class="sc-type-note">Then open <code>http://localhost:8000/dist/gallery/</code>. Add <code>?theme=dark</code> for dark mode and <code>?brand=botbench</code> for the Botbench theme. Or browse <a href="components.html">the catalogue on this site</a>, which draws the same examples.</p>`,
)}
${step(
  "use",
  "Use the styles and components",
  "From your app's root, sync a copy into your repository, commit it and never edit it. Then link the stylesheet and write components as class names on ordinary elements.",
  `${k.code(`node ../design-system/scripts/sync.mjs --to vendor/design-system`, { label: "the sync command" })}
${k.code(pass.files[0].text.replace("dist/design-system.css", "/vendor/design-system/design-system.css"), { caption: "A first page", label: "the page", scroll: true })}
<p class="sc-type-note">Keep <code>fonts/</code> and <code>icons.svg</code> beside the stylesheet. With Tailwind 3 there is a preset; see the <a href="${sourceUrl("docs/consumer-guide.md")}#tailwind-3">consumer guide</a>.</p>`,
)}
${step(
  "theme",
  "Configure a theme",
  "Link a theme after the system's stylesheet and choose the mode on the root element. Without a theme the page uses the default look.",
  `${k.code(`<link rel="stylesheet" href="/vendor/design-system/themes/botbench.css">`, { label: "the theme link" })}
${k.code(`<html lang="en" data-theme="auto">`, { label: "the data-theme attribute" })}
<p class="sc-type-note"><a href="themes.html">Compare the themes</a> and the value of every token.</p>`,
)}
${step(
  "agents",
  "Give the rules to your coding agent",
  "Say this in the app's agent instructions: AGENTS.md, CLAUDE.md or the like. The first file is under 2,400 characters and says when to open the others.",
  `${k.code(
    `## Interface work\n\n- Read \`vendor/design-system/rules/core.md\` before any interface work.\n- Choose a component or a page pattern from \`vendor/design-system/components-index.json\`. Then open that one entry in \`vendor/design-system/components.json\` for its guidance and markup. The file is large: search it for the entry's name.\n- Never edit \`vendor/design-system/\`.`,
    { caption: "AGENTS.md", label: "the agent instructions", scroll: true },
  )}
<p class="sc-type-note">An optional Claude Code hook blocks edits to the copy and scans each edited file. See <a href="${sourceUrl("docs/consumer-guide.md")}#9-optional-a-claude-code-hook">the guide</a>.</p>`,
)}
${step(
  "check",
  "Run the checker",
  "Add the config file and an empty gaps file, then run the scan. It names the file, the line, the rule and the fix.",
  `${k.code(`{\n  "paths": ["src"],\n  "appPrefix": "app",\n  "gaps": "design-gaps.json",\n  "vendorDir": "vendor/design-system"\n}`, { caption: "design-system.config.json", label: "the config file" })}
${k.code(`{ "gaps": [] }`, { caption: "design-gaps.json", label: "the gaps file" })}
${k.code(`node vendor/design-system/checker/check.mjs --config design-system.config.json`, { label: "the checker command" })}
${k.code(pass.output.trim(), { caption: "A page that passes · exit 0", copy: null })}
${k.code(fail.output.trim(), { caption: `The same page with a gradient and an emoji · exit ${fail.exit}`, copy: null, scroll: true })}
<p class="sc-type-note">Both outputs were recorded from the real checker when this site was built. <a href="rules.html#break-a-rule">Break other rules</a> on the rules page.</p>`,
)}
${step(
  "ci",
  "Make it part of CI",
  "Put the scan in the test command, and call the rendered check in the end-to-end tests on each screen and each open overlay. Anything that runs your tests then runs the checks.",
  `${k.code(`{\n  "scripts": {\n    "test": "node vendor/design-system/checker/check.mjs --config design-system.config.json && node --test"\n  }\n}`, { caption: "package.json", label: "the test script" })}
${k.code(`await page.evaluate(readFileSync("vendor/design-system/check-dom.js", "utf8"));\nexpect(await page.evaluate(() => dsCheckDom(document.documentElement, { appPrefix: "app" }))).toEqual([]);`, { caption: "In a Playwright test", label: "the rendered check", scroll: true })}
<p class="sc-type-note">To update later, run the sync again: it prints what was added, changed and removed. <a href="rules.html#ci">More on CI</a>.</p>`,
)}
</ol>
</div>
</section>`;
  return layout({
    path: "get-started.html",
    title: "Get started",
    description: "Clone the design system, explore its gallery, sync it into an app, choose a theme, give its rules to a coding agent, run the checker and add it to CI.",
    current: "get-started.html",
    body,
    theme,
  });
}

/* ------------------------------------------------------------------- Docs */

export function docs({ theme, rules, catalogue }) {
  const k = kit("");
  const guide = sourceUrl("docs/consumer-guide.md");
  const groups = [
    [
      "Use it in an app",
      "The consumer guide is the one document to read in full.",
      [
        [guide, "Consumer guide", "Every step, from the first sync to an upgrade."],
        [`${guide}#1-sync-the-copy`, "Sync the copy", "How an app takes dist/ and how the copy is verified."],
        [`${guide}#2-load-the-stylesheet`, "Load the stylesheet", "Plain HTML, the behaviour modules, React source and Tailwind 3."],
        [`${guide}#4-when-no-component-fits`, "When no component fits", "Composing, app-local components and the gaps file."],
        [`${guide}#10-update`, "Update", "What a sync prints and what to read before committing it."],
        [sourceUrl("CHANGELOG.md"), "Changelog", "What each version holds and what an app must do to upgrade."],
      ],
    ],
    [
      "Components",
      `${catalogue.components.length} components and ${catalogue.patterns.length} page patterns, each a folder of styles, examples and guidance.`,
      [
        [treeUrl("components"), "Component source", "One folder each: the CSS, examples.html and meta.json."],
        [treeUrl("patterns"), "Pattern source", "The page patterns, built to the same contract."],
        [sourceUrl("rules/choosing-components.md"), "Choosing a component", "A need on the left, the component for it on the right."],
        [sourceUrl("dist/components-index.json"), "components-index.json", "One short entry for each: what an agent reads first."],
        [sourceUrl("docs/authoring.md"), "Authoring contract", "What a component must hold for the build to accept it."],
      ],
    ],
    [
      "Themes",
      "A theme sets token values and nothing else.",
      [
        [`${guide}#12-themes`, "Themes", "Load one, choose the mode, write your own."],
        [sourceUrl("themes/botbench.css"), "The Botbench theme", "The worked example, with the reason for each choice in its header."],
        [sourceUrl("tokens/tokens.css"), "tokens.css", "The single source of every token."],
        [sourceUrl("tokens/pairs.json"), "Contrast pairs", "The foreground and background pairs every theme must pass."],
      ],
    ],
    [
      "Rules for agents",
      "Eight files. An agent reads the first and opens the others when the first says to.",
      [
        [sourceUrl("rules/core.md"), "core.md", "The closed vocabulary, the order of choice and the disclosure limits."],
        [sourceUrl("rules/principles.md"), "principles.md", "For laying out a new screen."],
        [sourceUrl("rules/disclosure.md"), "disclosure.md", "What a view shows first and what it hides."],
        [sourceUrl("rules/never.md"), "never.md", "The marks of a generated interface, and what catches each."],
        [sourceUrl("rules/content.md"), "content.md", "Labels, messages and the words for each status."],
        [sourceUrl("rules/review-rubric.md"), "review-rubric.md", "For reviewing a finished screen."],
        [`${guide}#8-tell-agents-where-the-rules-are`, "Tell agents where the rules are", "What to write in AGENTS.md."],
      ],
    ],
    [
      "Checker",
      `${rules.count} rules in a static scan and a check of the rendered page.`,
      [
        [sourceUrl("rules/checker-rules.md"), "checker-rules.md", "Every rule, what it means and how to fix it."],
        [`${guide}#3-add-the-config-file-and-the-gaps-file`, "Config and gaps files", "The four keys, and how an app-local component is declared."],
        [`${guide}#5-run-the-static-scan-in-the-test-command`, "The static scan", "Exit codes, waivers and the summary line."],
        [`${guide}#6-run-the-rendered-check-in-the-end-to-end-tests`, "The rendered check", "dsCheckDom(), and what it does not see."],
        [`${guide}#9-optional-a-claude-code-hook`, "Claude Code hook", "Findings for the agent as it edits."],
        [treeUrl("checker"), "Checker source", "No dependencies."],
      ],
    ],
    [
      "Browser support and limits",
      "What was tested, in what, and what is still open.",
      [
        [sourceUrl("docs/browser-support.md"), "Browser support", "Results for each feature and component in Chrome, WebKit and Firefox."],
        [`${pin.repository}#status-and-limits`, "Status and limits", "Draft status, the one consumer, and the audit's open findings."],
        [`${pin.repository}#when-it-is-not-a-fit`, "When it is not a fit", "Six cases in which to choose something else."],
        [sourceUrl("docs/audits/2026-11-22-independent-audit.md"), "Independent audit", "Version 0.7.0, scored on ten dimensions."],
        [sourceUrl("docs/trial-report.md"), "Blind-build trial", "Two agents, three screens each, from a synced copy alone."],
      ],
    ],
  ];
  const body = `${pageHead({
    eyebrow: `Docs · design system ${h(pin.version)}`,
    title: "The documentation lives with the source.",
    lead: `This site does not keep a second copy of the docs to go stale. Each link below opens the document in the design system's repository at release ${h(pin.tag)}, the release these pages were built from.`,
  })}
${groups
  .map(
    ([title, note, links], index) => `<section class="sc-section${index === groups.length - 1 ? " sc-section--plain" : ""}">
<div class="sc-wrap">
<div class="sc-duo">
<div class="sc-section__head"><h2 class="sc-type-heading" id="docs-${slug(title)}">${h(title)}</h2><p class="sc-example__reason">${h(note)}</p></div>
<ul class="ds-list" aria-labelledby="docs-${slug(title)}">
${links.map(([href, name, text]) => `<li class="ds-list__row"><a class="ds-list__link" href="${href}"><span class="ds-list__body"><span class="ds-list__primary">${h(name)}</span><span class="ds-list__secondary">${h(text)}</span></span></a></li>`).join("\n")}
</ul>
</div>
</div>
</section>`,
  )
  .join("\n")}`;
  return layout({
    path: "docs.html",
    title: "Docs",
    description: "Where each part of the design system is documented: the consumer guide, component references, themes, the rules for agents, the checker, browser support and known limits.",
    current: "docs.html",
    body,
    theme,
  });
}

/* -------------------------------------------------------------------- 404 */

export function notFound({ theme, base }) {
  const k = kit(base);
  const body = `<section class="sc-section sc-section--plain">
<div class="sc-wrap sc-section__body">
<div class="ds-empty-state">
<h1 class="ds-empty-state__title">There is no page at this address</h1>
<p class="ds-empty-state__body">It may have moved when the design system renamed a component. The catalogue lists every component and pattern of version ${h(pin.version)}.</p>
<div class="ds-empty-state__action"><a class="ds-button ds-button--primary" href="${base}components.html">Open the catalogue</a></div>
</div>
<div class="ds-cluster">${k.arrow(`${base}index.html`, "Home")}${k.arrow(`${base}docs.html`, "Docs")}</div>
</div>
</section>`;
  return layout({ rel: base, path: "404.html", title: "Page not found", description: "There is no page at this address.", body, theme, noindex: true });
}
