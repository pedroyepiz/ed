(() => {
  "use strict";

  function initInfografiaLightbox() {
    const lightbox = document.querySelector(".infografia-lightbox");
    if (!lightbox) return;

    const lbImg = lightbox.querySelector(".lb-stage img");
    const lbTitle = lightbox.querySelector(".lb-title");
    const btnPrev = lightbox.querySelector("[data-lb-prev]");
    const btnNext = lightbox.querySelector("[data-lb-next]");
    const btnClose = lightbox.querySelector("[data-lb-close]");
    const btnZoomIn = lightbox.querySelector("[data-lb-zoom-in]");
    const btnZoomOut = lightbox.querySelector("[data-lb-zoom-out]");
    const btnReset = lightbox.querySelector("[data-lb-reset]");

    const thumbs = Array.from(
      document.querySelectorAll(".infografia-thumb[data-infografia]")
    );

    if (!thumbs.length || !lbImg) return;

    let currentIndex = 0;
    let scale = 1;

    function setZoom(value) {
      scale = Math.min(4, Math.max(0.5, value));
      lbImg.style.transformOrigin = "center center";
      lbImg.style.transform = `scale(${scale})`;
      if (btnReset) btnReset.textContent = `${Math.round(scale * 100)}%`;
    }

    function openAt(index) {
      currentIndex = (index + thumbs.length) % thumbs.length;
      const item = thumbs[currentIndex];

      lbImg.src = item.dataset.src || item.src;
      lbImg.alt = item.alt || item.dataset.title || "Infografía";
      if (lbTitle) lbTitle.textContent = item.dataset.title || item.alt || "Infografía";

      setZoom(1);
      lightbox.classList.add("is-open", "open", "active");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open", "open", "active");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      setZoom(1);
    }

    function indexForTrigger(trigger) {
      const src = trigger.dataset.src;
      const title = trigger.dataset.title;

      const index = thumbs.findIndex(img =>
        (src && img.dataset.src === src) ||
        (title && img.dataset.title === title)
      );

      return index >= 0 ? index : 0;
    }

    thumbs.forEach((img, index) => {
      img.addEventListener("click", () => openAt(index));
      img.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openAt(index);
        }
      });
    });

    document.querySelectorAll(".ver-btn[data-infografia]").forEach(btn => {
      btn.addEventListener("click", () => openAt(indexForTrigger(btn)));
    });

    btnPrev?.addEventListener("click", () => openAt(currentIndex - 1));
    btnNext?.addEventListener("click", () => openAt(currentIndex + 1));
    btnClose?.addEventListener("click", closeLightbox);

    btnZoomIn?.addEventListener("click", () => setZoom(scale + 0.25));
    btnZoomOut?.addEventListener("click", () => setZoom(scale - 0.25));
    btnReset?.addEventListener("click", () => setZoom(1));

    lightbox.addEventListener("click", event => {
      if (event.target === lightbox || event.target.classList.contains("lb-stage")) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", event => {
      if (lightbox.getAttribute("aria-hidden") !== "false") return;

      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") openAt(currentIndex - 1);
      if (event.key === "ArrowRight") openAt(currentIndex + 1);
      if (event.key === "+" || event.key === "=") setZoom(scale + 0.25);
      if (event.key === "-") setZoom(scale - 0.25);
      if (event.key === "0") setZoom(1);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInfografiaLightbox);
  } else {
    initInfografiaLightbox();
  }
})();