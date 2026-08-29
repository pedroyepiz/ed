document.addEventListener("DOMContentLoaded", () => {
  const triggers = [...document.querySelectorAll("[data-infografia]")];
  const lb = document.querySelector(".infografia-lightbox");

  if (!lb || triggers.length === 0) return;

  const img = lb.querySelector(".lb-stage img");
  const stage = lb.querySelector(".lb-stage");
  const title = lb.querySelector(".lb-title");
  const closeBtn = lb.querySelector("[data-lb-close]");
  const prevBtn = lb.querySelector("[data-lb-prev]");
  const nextBtn = lb.querySelector("[data-lb-next]");
  const zoomInBtn = lb.querySelector("[data-lb-zoom-in]");
  const zoomOutBtn = lb.querySelector("[data-lb-zoom-out]");
  const resetBtn = lb.querySelector("[data-lb-reset]");

  // Agrupar los disparadores por imagen para no contar dos veces
  // la miniatura y el botón "Ver y ampliar".
  const items = [];
  triggers.forEach(trigger => {
    const src = trigger.dataset.src;
    const titleText = trigger.dataset.title || "Infografía";
    if (!items.some(item => item.src === src)) {
      items.push({ src, title: titleText });
    }
  });

  let current = 0;
  let zoom = 100;

  function baseWidth() {
    // Ancho inicial visible. A partir de aquí el zoom trabaja en píxeles,
    // evitando problemas de navegadores con vw/min().
    return Math.min(window.innerWidth * 0.94, 1250);
  }

  function applyZoom() {
    zoom = Math.max(40, Math.min(250, zoom));
    const width = Math.round(baseWidth() * (zoom / 100));
    img.style.width = width + "px";
    img.style.height = "auto";
    img.style.maxWidth = "none";
    resetBtn.textContent = zoom + "%";
  }

  function render() {
    const item = items[current];
    img.src = item.src;
    img.alt = item.title;
    title.textContent = item.title;
    zoom = 100;
    applyZoom();

    // Regresar el visor al inicio de la imagen.
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  }

  function openItem(src) {
    const found = items.findIndex(item => item.src === src);
    current = found >= 0 ? found : 0;
    render();
    lb.classList.add("abierto");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.classList.remove("abierto");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  triggers.forEach(trigger => {
    const activate = () => openItem(trigger.dataset.src);

    trigger.addEventListener("click", activate);
    trigger.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });

  closeBtn.addEventListener("click", close);

  prevBtn.addEventListener("click", () => {
    current = (current - 1 + items.length) % items.length;
    render();
  });

  nextBtn.addEventListener("click", () => {
    current = (current + 1) % items.length;
    render();
  });

  zoomInBtn.addEventListener("click", () => {
    zoom += 20;
    applyZoom();
  });

  zoomOutBtn.addEventListener("click", () => {
    zoom -= 20;
    applyZoom();
  });

  resetBtn.addEventListener("click", () => {
    zoom = 100;
    applyZoom();
  });

  // Zoom con rueda del ratón + Ctrl dentro del visor.
  stage.addEventListener("wheel", event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoom += event.deltaY < 0 ? 10 : -10;
    applyZoom();
  }, { passive:false });

  // Doble clic: alterna entre 100% y 160%.
  img.addEventListener("dblclick", () => {
    zoom = zoom === 100 ? 160 : 100;
    applyZoom();
  });

  lb.addEventListener("click", event => {
    if (event.target === lb) close();
  });

  document.addEventListener("keydown", event => {
    if (!lb.classList.contains("abierto")) return;

    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft") prevBtn.click();
    else if (event.key === "ArrowRight") nextBtn.click();
    else if (event.key === "+" || event.key === "=") zoomInBtn.click();
    else if (event.key === "-") zoomOutBtn.click();
    else if (event.key === "0") resetBtn.click();
  });

  window.addEventListener("resize", () => {
    if (lb.classList.contains("abierto")) applyZoom();
  });
});
