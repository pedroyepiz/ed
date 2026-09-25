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
    const footer = document.querySelector("#site-footer");
    const dock = document.createElement("div");
    dock.id = "site-navigation";
    const header = document.querySelector("#site-header");
    if (header) header.insertAdjacentElement("afterend", dock);
    else document.body.prepend(dock);
    const menuLinks = [
      ["home", "⌂", "Inicio", "index.html"],
      ["activities", "☑", "Actividades", "actividades.html"],
      ["bibliography", "▤", "Bibliografía", "pages/bibliografia.html"]
    ];
    const renderLink = ([key, icon, label, url]) => {
      const link = document.createElement("a");
      link.className = "ed-nav-button";
      link.dataset.nav = key;
      link.href = new URL(url, siteRoot).href;
      link.innerHTML = `<span aria-hidden="true">${icon}</span> ${label}`;
      return link;
    };
    const navElement = document.createElement("nav");
    navElement.className = "ed-bottom-nav";
    navElement.setAttribute("aria-label", "Navegación del curso");
    const inner = document.createElement("div");
    inner.className = "ed-bottom-inner";
    const primary = document.createElement("div");
    primary.className = "ed-bottom-primary";
    primary.append(...menuLinks.map(renderLink));
    const sequence = document.createElement("div");
    sequence.className = "ed-bottom-sequence";
    sequence.dataset.sequence = "";
    const toggle = document.createElement("button");
    toggle.className = "ed-nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "ed-mobile-menu");
    toggle.innerHTML = '<span aria-hidden="true">☰</span> Menú';
    inner.append(primary, toggle);
    const menu = document.createElement("div");
    menu.className = "ed-mobile-menu";
    menu.id = "ed-mobile-menu";
    menu.hidden = true;
    menu.append(...menuLinks.map(renderLink));
    navElement.append(inner, menu);
    dock.append(navElement);
    const sequenceDock = document.createElement("nav");
    sequenceDock.className = "ed-sequence-dock";
    sequenceDock.setAttribute("aria-label", "Navegación entre temas");
    sequenceDock.append(sequence);
    if (footer) footer.insertAdjacentElement("afterend", sequenceDock);
    else document.body.append(sequenceDock);
    const nav = dock.querySelector(".ed-bottom-nav");
    if (!nav) return;

    const path = decodeURIComponent(window.location.pathname);
    const file = path.split("/").pop() || "index.html";
    const isPage = path.includes("/pages/");
    const selected = file === "actividades.html" || file === "detalle.html" ? "activities"
      : file === "bibliografia.html" ? "bibliography"
      : "home";
    nav.querySelectorAll(`[data-nav="${selected}"]`).forEach(link => link.setAttribute("aria-current", "page"));

    const index = isPage ? topicFiles.indexOf(file) : -1;
    if (index !== -1) {
      const previous = index > 0 ? new URL(`pages/${topicFiles[index - 1]}`, siteRoot).href : new URL("index.html#temas", siteRoot).href;
      const next = index < topicFiles.length - 1 ? new URL(`pages/${topicFiles[index + 1]}`, siteRoot).href : new URL("actividades.html", siteRoot).href;
      const previousLabel = index > 0 ? "← Anterior" : "← Inicio";
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
    const desktop = window.matchMedia("(min-width: 761px)");
    if (desktop.addEventListener) desktop.addEventListener("change", closeMenu);
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
