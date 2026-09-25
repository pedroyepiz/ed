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

  const iconPaths = {
    home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7",
    previous: "M19 12H5m0 0 6-6m-6 6 6 6",
    next: "M5 12h14m0 0-6-6m6 6-6 6"
  };

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("ed-nav-icon");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", iconPaths[name]);
    svg.append(path);
    return svg;
  }

  function link(label, url, iconName, className = "") {
    const anchor = document.createElement("a");
    anchor.href = new URL(url, siteRoot).href;
    anchor.className = className;
    anchor.append(icon(iconName), document.createTextNode(label));
    return anchor;
  }

  function initNavigation() {
    const file = decodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
    const inPages = window.location.pathname.includes("/pages/");
    if (file === "index.html" || file === "admin.html") return;

    // Actividades muestra su propio enlace de Inicio dentro de la tarjeta.
    if (file !== "actividades.html") {
      const top = document.createElement("nav");
      top.className = "ed-inline-nav ed-home-return";
      top.setAttribute("aria-label", "Volver al inicio del curso");
      top.append(link("Inicio del curso", "index.html", "home"));
      const header = document.querySelector("#site-header");
      if (header) header.insertAdjacentElement("afterend", top);
      else document.body.prepend(top);
    }

    const bottom = document.createElement("nav");
    bottom.className = "ed-page-navigation";
    bottom.setAttribute("aria-label", "Continuar navegando el curso");
    const footer = document.querySelector("#site-footer");
    if (footer) footer.insertAdjacentElement("beforebegin", bottom);
    else document.body.append(bottom);

    const setButtons = (previous, next) => {
      bottom.replaceChildren();
      if (previous) bottom.append(link("Anterior", previous, "previous", "ed-page-button"));
      else bottom.append(document.createElement("span"));
      bottom.append(link("Inicio", "index.html", "home", "ed-page-button ed-page-home"));
      if (next) bottom.append(link("Siguiente", next, "next", "ed-page-button"));
      else bottom.append(document.createElement("span"));
    };

    const index = inPages ? topicFiles.indexOf(file) : -1;
    if (index >= 0) {
      setButtons(index > 0 ? `pages/${topicFiles[index - 1]}` : null,
        index < topicFiles.length - 1 ? `pages/${topicFiles[index + 1]}` : "actividades.html");
    } else if (file === "actividades.html") {
      setButtons(`pages/${topicFiles[topicFiles.length - 1]}`, null);
    } else if (file === "detalle.html" && typeof publicData === "function") {
      setButtons("actividades.html", null);
      publicData().then(rows => {
        const id = Number(new URLSearchParams(window.location.search).get("id"));
        const available = rows.filter(row => row.visible && (row.actividad || row.codigo)).sort((a, b) => a.id - b.id);
        const position = available.findIndex(row => row.id === id);
        if (position === -1) return;
        setButtons(position > 0 ? `detalle.html?id=${available[position - 1].id}` : "actividades.html",
          position < available.length - 1 ? `detalle.html?id=${available[position + 1].id}` : null);
      }).catch(error => console.error("No fue posible crear la secuencia de actividades", error));
    } else {
      // Los recursos independientes conservan Inicio, con acceso al índice en la parte superior.
      setButtons(null, null);
    }
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
