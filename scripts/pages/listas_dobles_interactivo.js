(function () {
  "use strict";

  function initListasDobles() {
    const valueInput = document.getElementById("double-value");
    const track = document.getElementById("double-list-track");
    const status = document.getElementById("double-list-status");
    const currentLabel = document.getElementById("double-current");
    const viewport = document.querySelector(".double-list-viewport");

    if (!valueInput || !track || !status || !currentLabel) {
      console.warn("Listas dobles: no se encontró el simulador en esta página.");
      return;
    }

    const values = [];
    let currentIndex = -1;

    function setStatus(message, isError) {
      status.textContent = message;
      if (isError) status.classList.add("is-error");
      else status.classList.remove("is-error");
    }

    function normalizeCurrent() {
      if (values.length === 0) currentIndex = -1;
      else if (currentIndex < 0) currentIndex = 0;
      else if (currentIndex >= values.length) currentIndex = values.length - 1;
    }

    function render() {
      normalizeCurrent();

      if (values.length === 0) {
        track.innerHTML = '<div class="double-empty">Lista vacía · PRIMERO = NULL · ULTIMO = NULL</div>';
        currentLabel.textContent = "Nodo actual: ninguno";
        return;
      }

      let html = '<span class="double-boundary">NULL</span>';

      values.forEach(function (value, index) {
        let labels = [];
        if (index === 0) labels.push("PRIMERO");
        if (index === values.length - 1) labels.push("ULTIMO");

        html += '<div class="double-node-wrap">';
        html += '<button type="button" class="double-node' + (index === currentIndex ? ' is-current' : '') + '" data-node-index="' + index + '" aria-label="Seleccionar nodo ' + value + '">';
        html += '<span class="prev-cell">←</span>';
        html += '<span class="data-cell">' + value + '</span>';
        html += '<span class="next-cell">→</span>';
        if (labels.length) html += '<span class="double-node-label">' + labels.join(" · ") + '</span>';
        html += '</button>';
        if (index < values.length - 1) html += '<div class="double-link" aria-hidden="true">⇄</div>';
        html += '</div>';
      });

      html += '<span class="double-boundary">NULL</span>';
      track.innerHTML = html;
      currentLabel.textContent = "Nodo actual: " + values[currentIndex] + " · posición " + (currentIndex + 1) + " de " + values.length;
    }

    function centerCurrent() {
      if (!viewport || currentIndex < 0) return;
      window.setTimeout(function () {
        const current = track.querySelector('[data-node-index="' + currentIndex + '"]');
        if (current && current.scrollIntoView) {
          current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }, 30);
    }

    function readValue() {
      const raw = valueInput.value.trim();
      if (raw === "") return null;
      const value = Number(raw);
      return Number.isInteger(value) ? value : null;
    }

    document.addEventListener("click", function (event) {
      const actionButton = event.target.closest("[data-double-action]");
      if (actionButton) {
        const action = actionButton.getAttribute("data-double-action");

        if (action === "clear") {
          values.length = 0;
          currentIndex = -1;
          render();
          setStatus("Lista limpiada. PRIMERO y ULTIMO vuelven a NULL.", false);
          return;
        }

        if (action === "prev") {
          if (values.length === 0) return setStatus("La lista está vacía.", true);
          if (currentIndex <= 0) return setStatus("Ya estás en PRIMERO; no existe un nodo anterior.", true);
          currentIndex--;
          render();
          centerCurrent();
          setStatus("Te moviste al nodo anterior: " + values[currentIndex] + ".", false);
          return;
        }

        if (action === "next") {
          if (values.length === 0) return setStatus("La lista está vacía.", true);
          if (currentIndex >= values.length - 1) return setStatus("Ya estás en ULTIMO; no existe un nodo siguiente.", true);
          currentIndex++;
          render();
          centerCurrent();
          setStatus("Te moviste al nodo siguiente: " + values[currentIndex] + ".", false);
          return;
        }

        const value = readValue();
        if (value === null) return setStatus("Escribe un número entero válido.", true);

        if (action === "remove") {
          const index = values.indexOf(value);
          if (index === -1) return setStatus("El valor " + value + " no existe en la lista.", true);

          values.splice(index, 1);
          if (values.length === 0) currentIndex = -1;
          else if (index < currentIndex) currentIndex--;
          else if (currentIndex >= values.length) currentIndex = values.length - 1;

          render();
          centerCurrent();
          setStatus("Se eliminó " + value + " y se reconectaron anterior y siguiente.", false);
          return;
        }

        if (values.indexOf(value) !== -1) {
          return setStatus("El valor " + value + " ya existe. No se aceptan repetidos.", true);
        }

        if (action === "add-start") {
          values.unshift(value);
          currentIndex = 0;
          render();
          centerCurrent();
          setStatus("Se agregó " + value + " al inicio. Ahora es PRIMERO.", false);
        }

        if (action === "add-end") {
          values.push(value);
          currentIndex = values.length - 1;
          render();
          centerCurrent();
          setStatus("Se agregó " + value + " al final. Ahora es ULTIMO.", false);
        }

        valueInput.value = "";
        valueInput.focus();
        return;
      }

      const nodeButton = event.target.closest("[data-node-index]");
      if (nodeButton && track.contains(nodeButton)) {
        currentIndex = Number(nodeButton.getAttribute("data-node-index"));
        render();
        centerCurrent();
        setStatus("Seleccionaste el nodo " + values[currentIndex] + ".", false);
      }

      const codeButton = event.target.closest("[data-code-answer]");
      if (codeButton) {
        const question = codeButton.closest(".code-analysis-question");
        if (!question) return;
        question.querySelectorAll("[data-code-answer]").forEach(function (b) {
          b.classList.remove("selected");
        });
        codeButton.classList.add("selected");
        question.setAttribute("data-selected-answer", codeButton.getAttribute("data-code-answer"));
      }
    });

    valueInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const addEnd = document.querySelector('[data-double-action="add-end"]');
        if (addEnd) addEnd.click();
      }
    });

    render();

    const analyzeButton = document.getElementById("analyze-double-quiz");
    const resetButton = document.getElementById("reset-double-quiz");

    if (analyzeButton) {
      analyzeButton.addEventListener("click", function () {
        let correct = 0;

        document.querySelectorAll(".quiz-question[data-correct]").forEach(function (question) {
          const chosen = question.querySelector("input[type='radio']:checked");
          const feedback = question.querySelector(".quiz-feedback");
          if (!chosen) {
            feedback.textContent = "Sin responder.";
            feedback.className = "quiz-feedback bad";
          } else if (chosen.value === question.getAttribute("data-correct")) {
            correct++;
            feedback.textContent = "Correcto.";
            feedback.className = "quiz-feedback ok";
          } else {
            feedback.textContent = "Revisa el concepto y vuelve a intentarlo.";
            feedback.className = "quiz-feedback bad";
          }
        });

        document.querySelectorAll(".code-analysis-question").forEach(function (question) {
          const chosen = question.getAttribute("data-selected-answer");
          const expected = question.getAttribute("data-correct");
          const explanation = question.getAttribute("data-explanation") || "";
          const feedback = question.querySelector(".quiz-feedback");

          if (!chosen) {
            feedback.textContent = "Sin analizar.";
            feedback.className = "quiz-feedback bad";
          } else if (chosen === expected) {
            correct++;
            feedback.textContent = "Correcto. " + explanation;
            feedback.className = "quiz-feedback ok";
          } else {
            feedback.textContent = "No es correcto. " + explanation;
            feedback.className = "quiz-feedback bad";
          }
        });

        const score = document.getElementById("double-quiz-score");
        const result = document.getElementById("double-quiz-result");
        if (score) score.textContent = correct + " / 7";
        if (result) {
          result.textContent = correct === 7
            ? "7 de 7 correctas. Dominio completo de la lógica de listas dobles."
            : correct + " de 7 correctas. Revisa las respuestas marcadas.";
        }
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        document.querySelectorAll(".double-quiz input[type='radio']").forEach(function (input) {
          input.checked = false;
        });
        document.querySelectorAll(".code-analysis-question").forEach(function (question) {
          question.removeAttribute("data-selected-answer");
          question.querySelectorAll("[data-code-answer]").forEach(function (b) {
            b.classList.remove("selected");
          });
        });
        document.querySelectorAll(".double-quiz .quiz-feedback").forEach(function (feedback) {
          feedback.textContent = "";
          feedback.className = "quiz-feedback";
        });

        const score = document.getElementById("double-quiz-score");
        const result = document.getElementById("double-quiz-result");
        if (score) score.textContent = "0 / 7";
        if (result) result.textContent = "";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initListasDobles);
  } else {
    initListasDobles();
  }
})();