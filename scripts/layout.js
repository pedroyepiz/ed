(() => {
  "use strict";

  const scriptEl = document.currentScript;
  const scriptUrl = scriptEl
    ? new URL(scriptEl.src, window.location.href)
    : new URL("scripts/layout.js", window.location.href);

  const siteRoot = new URL("../", scriptUrl);

  async function loadComponent(selector, name) {
    const target = document.querySelector(selector);
    if (!target) return;

    try {
      const response = await fetch(new URL(`components/${name}.html`, siteRoot), { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      let markup = await response.text();
      markup = markup.replaceAll("{{ROOT}}", siteRoot.href);
      target.innerHTML = markup;

      if (name === "course-info") {
        const topic = target.dataset.topic || "";
        const topicRow = target.querySelector("[data-topic-row]");
        const topicValue = target.querySelector("[data-topic-value]");
        if (topic && topicValue) topicValue.textContent = topic;
        else if (topicRow) topicRow.remove();
      }
    } catch (error) {
      console.error(`No fue posible cargar ${name}.html`, error);
      // El sitio conserva el contenido y el menú aun cuando falle una plantilla.
      target.replaceChildren();
    }
  }

  function updateYear() {
    document.querySelectorAll("[data-current-year], #currentYear").forEach(el => {
      el.textContent = new Date().getFullYear();
    });
  }

  const topicFiles = [
    "tema_00_introduccion.html", "tema_01_listas.html", "tema_02_pilas.html",
    "tema_03_colas.html", "tema_04_arboles.html", "tema_05_monticulos.html",
    "tema_06_hash.html"
  ];

  function initNavigation() {
    const file = decodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
    const inPages = window.location.pathname.includes("/pages/");
    // Actividades ya incluye su navegación discreta; el índice y Admin no la necesitan.
    if (!inPages && ["index.html", "actividades.html", "admin.html"].includes(file)) return;
    const header = document.querySelector("#site-header");
    const nav = document.createElement("nav");
    nav.className = "ed-inline-nav";
    nav.setAttribute("aria-label", "Navegación del curso");
    const link = (label, url, icon = "") => {
      const a = document.createElement("a");
      a.href = new URL(url, siteRoot).href;
      if (icon) {
        const symbol = document.createElement("span");
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = icon;
        a.append(symbol, " ");
      }
      a.append(label);
      return a;
    };
    const current = topicFiles.indexOf(file);
    if (current > 0) nav.append(link("Tema anterior", `pages/${topicFiles[current - 1]}`, "←"));
    nav.append(link("Inicio", "index.html", "⌂"));
    if (file !== "bibliografia.html" && current !== topicFiles.length - 1) nav.append(link("Actividades", "actividades.html", "☑"));
    if (current !== -1) nav.append(link(current < topicFiles.length - 1 ? "Tema siguiente" : "Actividades", current < topicFiles.length - 1 ? `pages/${topicFiles[current + 1]}` : "actividades.html", "→"));
    if (header) header.insertAdjacentElement("afterend", nav);
    else document.body.prepend(nav);
  }

  async function initMasterLayout() {
    initNavigation();
    await Promise.all([
      loadComponent("#site-header", "header"),
      loadComponent("#site-footer", "footer"),
      loadComponent("#course-info", "course-info")
    ]);
    updateYear();
    document.dispatchEvent(new CustomEvent("masterlayout:ready", {
      detail: { siteRoot: siteRoot.href }
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMasterLayout, { once: true });
  } else {
    initMasterLayout();
  }
})();
