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
      target.innerHTML = `
        <div class="container-fluid pe-shell py-2">
          <div class="alert alert-warning mb-0">
            No fue posible cargar ${name}.html. Usa Live Server o GitHub Pages.
          </div>
        </div>`;
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

  async function initNavigation() {
    const footer = document.querySelector("#site-footer");
    const dock = document.createElement("div");
    dock.id = "site-navigation";
    if (footer) footer.insertAdjacentElement("afterend", dock);
    else document.body.append(dock);
    await loadComponent("#site-navigation", "navigation");
    const nav = dock.querySelector(".ed-bottom-nav");
    if (!nav) return;

    const path = decodeURIComponent(window.location.pathname);
    const file = path.split("/").pop() || "index.html";
    const isPage = path.includes("/pages/");
    const selected = file === "actividades.html" || file === "detalle.html" ? "activities"
      : file === "bibliografia.html" ? "bibliography"
      : isPage ? "topics" : "home";
    nav.querySelectorAll(`[data-nav="${selected}"]`).forEach(link => link.setAttribute("aria-current", "page"));

    const index = isPage ? topicFiles.indexOf(file) : -1;
    if (index !== -1) {
      const sequence = nav.querySelector("[data-sequence]");
      const previous = index > 0 ? new URL(`pages/${topicFiles[index - 1]}`, siteRoot).href : new URL("index.html#temas", siteRoot).href;
      const next = index < topicFiles.length - 1 ? new URL(`pages/${topicFiles[index + 1]}`, siteRoot).href : new URL("actividades.html", siteRoot).href;
      const previousLabel = index > 0 ? "← Anterior" : "← Temas";
      const nextLabel = index < topicFiles.length - 1 ? "Siguiente →" : "Actividades →";
      const prevLink = document.createElement("a");
      prevLink.className = "ed-nav-button ed-sequence-button";
      prevLink.href = previous;
      prevLink.textContent = previousLabel;
      const nextLink = document.createElement("a");
      nextLink.className = "ed-nav-button ed-sequence-button ed-next-button";
      nextLink.href = next;
      nextLink.textContent = nextLabel;
      sequence.append(prevLink, nextLink);
    }

    const toggle = nav.querySelector(".ed-nav-toggle");
    const menu = nav.querySelector("#ed-mobile-menu");
    const closeMenu = () => { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") { closeMenu(); toggle.focus(); }
    });
    document.addEventListener("click", event => {
      if (!nav.contains(event.target)) closeMenu();
    });
    window.matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);
  }

  async function initMasterLayout() {
    await Promise.all([
      loadComponent("#site-header", "header"),
      loadComponent("#site-footer", "footer"),
      loadComponent("#course-info", "course-info")
    ]);
    await initNavigation();
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
