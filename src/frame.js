// Runs inside a live preview, after the gallery's own script.
// It keeps the preview safe (nothing in it submits or leaves the page), follows the theme and mode
// the showcase page asks for, tells the page how tall the example is, and runs the design system's
// rendered check on the example when the page asks.
(() => {
  const BRAND_ID = "sc-brand";
  const params = new URLSearchParams(location.search);
  // A gallery example sits in ds/frames/, beside the themes. A page elsewhere says where they are.
  const own = document.currentScript?.dataset ?? {};
  const themes = own.themes ?? "../themes/";
  const checker = own.checker ?? "../check-dom.js";
  if (params.has("fit")) document.documentElement.dataset.scFit = "";

  // A preview demonstrates and does nothing: no form is sent and no link leaves the frame.
  document.addEventListener("submit", (event) => event.preventDefault(), true);
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link && !link.getAttribute("href").startsWith("#")) event.preventDefault();
    },
    true,
  );

  const brandLink = () => document.getElementById(BRAND_ID) ?? [...document.querySelectorAll('link[href*="/themes/"]')].at(-1) ?? null;

  function apply({ brand, mode }) {
    let link = brandLink();
    if (brand && brand !== "default") {
      if (!link) {
        link = document.createElement("link");
        link.rel = "stylesheet";
        document.head.append(link);
      }
      link.id = BRAND_ID;
      const href = `${themes}${brand}.css`;
      if (link.getAttribute("href") !== href) link.href = href;
    } else if (link) {
      link.remove();
    }
    document.documentElement.dataset.theme = mode === "dark" ? "dark" : "light";
  }

  const report = () => parent.postMessage({ type: "sc-height", height: Math.ceil(document.documentElement.getBoundingClientRect().height) }, "*");

  async function check(appPrefix) {
    if (typeof globalThis.dsCheckDom !== "function") {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = checker;
        script.onload = resolve;
        script.onerror = () => reject(new Error("check-dom.js did not load"));
        document.head.append(script);
      });
    }
    return globalThis.dsCheckDom(document.documentElement, appPrefix ? { appPrefix } : {});
  }

  // The gallery's script reads ?theme and ?brand for a gallery example. A page without it is set here.
  if ("standalone" in own) apply({ brand: /^[a-z][a-z0-9-]*$/.test(params.get("brand") ?? "") ? params.get("brand") : "default", mode: params.get("theme") ?? "light" });

  addEventListener("message", (event) => {
    if (event.source !== parent || typeof event.data !== "object" || event.data === null) return;
    if (event.data.type === "sc-theme" && /^[a-z][a-z0-9-]*$/.test(event.data.brand ?? "default")) apply(event.data);
    if (event.data.type === "sc-check") {
      check(event.data.appPrefix).then(
        (findings) => parent.postMessage({ type: "sc-findings", id: event.data.id, findings }, "*"),
        (error) => parent.postMessage({ type: "sc-findings", id: event.data.id, error: String(error.message ?? error) }, "*"),
      );
    }
  });

  addEventListener("DOMContentLoaded", () => {
    new ResizeObserver(report).observe(document.documentElement);
    report();
    parent.postMessage({ type: "sc-ready" }, "*");
  });
})();
