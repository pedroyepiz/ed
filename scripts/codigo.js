(() => {
  "use strict";

  async function copiarTexto(id, boton) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    const texto = elemento.textContent;
    const original = boton.textContent;

    try {
      await navigator.clipboard.writeText(texto);
      boton.textContent = "¡Copiado!";
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      boton.textContent = "¡Copiado!";
    }

    window.setTimeout(() => {
      boton.textContent = original;
    }, 1500);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-copy-target]").forEach((boton) => {
      boton.addEventListener("click", () => {
        copiarTexto(boton.dataset.copyTarget, boton);
      });
    });
  });
})();
