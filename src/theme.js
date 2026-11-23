// Runs before the page paints, so the stored mode is the first one drawn.
// "auto" lets the Botbench theme follow the device; data-sc-mode records which mode that is.
(() => {
  let stored = null;
  try {
    stored = localStorage.getItem("showcase-mode");
  } catch {
    // Storage may be blocked. The device's setting is used then.
  }
  const root = document.documentElement;
  const device = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  const mode = stored === "light" || stored === "dark" ? stored : device;
  root.dataset.theme = stored === "light" || stored === "dark" ? stored : "auto";
  root.dataset.scMode = mode;
})();
