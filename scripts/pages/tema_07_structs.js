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
    setTimeout(() => {
      boton.textContent = original;
    }, 1400);
  }

  function iniciarCopiado() {
    document.querySelectorAll("[data-copy-target]").forEach((boton) => {
      boton.addEventListener("click", () => {
        copiarCodigo(boton.dataset.copyTarget, boton);
      });
    });
  }

  function iniciarQuiz() {
    document.querySelectorAll(".quiz-q").forEach((pregunta) => {
      const respuesta = pregunta.dataset.answer;
      const feedback = pregunta.querySelector(".quiz-feedback");

      pregunta.querySelectorAll("button[data-opt]").forEach((boton) => {
        boton.addEventListener("click", () => {
          pregunta.querySelectorAll("button[data-opt]").forEach((b) => {
            b.classList.remove("is-correct", "is-wrong");
          });

          const correcto = boton.dataset.opt === respuesta;
          boton.classList.add(correcto ? "is-correct" : "is-wrong");

          if (correcto) {
            feedback.textContent = "✓ Correcto";
            feedback.style.color = "#0f6b45";
          } else {
            feedback.textContent = "✗ Revisa el concepto e intenta nuevamente.";
            feedback.style.color = "#a32828";
          }
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    iniciarCopiado();
    iniciarQuiz();
  });
})();
