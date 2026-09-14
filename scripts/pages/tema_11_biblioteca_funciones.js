(() => {
  "use strict";

  async function copiarCodigo(id, boton) {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    const texto = elemento.textContent;
    const original = boton.textContent;

    try {
      await navigator.clipboard.writeText(texto);
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }

    boton.textContent = "¡Copiado!";
    setTimeout(() => boton.textContent = original, 1400);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-copy-target]").forEach((boton) => {
      boton.addEventListener("click", () => copiarCodigo(boton.dataset.copyTarget, boton));
    });

    document.querySelectorAll(".quiz-q").forEach((pregunta) => {
      const correcta = pregunta.dataset.answer;
      const feedback = pregunta.querySelector(".quiz-feedback");

      pregunta.querySelectorAll("button[data-opt]").forEach((boton) => {
        boton.addEventListener("click", () => {
          pregunta.querySelectorAll("button[data-opt]").forEach((b) => b.classList.remove("is-correct","is-wrong"));
          const acierto = boton.dataset.opt === correcta;
          boton.classList.add(acierto ? "is-correct" : "is-wrong");
          feedback.textContent = acierto ? "✓ Correcto" : "✗ Revisa el concepto e intenta nuevamente.";
          feedback.style.color = acierto ? "#0f6b45" : "#a32828";
        });
      });
    });
  });
})();
