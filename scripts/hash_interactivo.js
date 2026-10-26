document.addEventListener("DOMContentLoaded", () => {
  const TABLE_SIZE = 13;
  const simulator = document.querySelector("[data-hash-simulator]");

  if (simulator) {
    const keyInput = document.getElementById("hash-key");
    const methodSelect = document.getElementById("hash-method");
    const insertButton = document.getElementById("hash-insert");
    const clearButton = document.getElementById("hash-clear");
    const hashValueOutput = document.getElementById("hash-value");
    const hashIndexOutput = document.getElementById("hash-index");
    const loadOutput = document.getElementById("hash-load");
    const tableVisual = document.getElementById("hash-table-visual");
    const log = document.getElementById("hash-animation-log");

    let table = Array.from({ length: TABLE_SIZE }, () => []);

    function djb2(text) {
      let hash = 5381 >>> 0;
      for (const char of text) {
        hash = (((hash << 5) + hash) + char.charCodeAt(0)) >>> 0;
      }
      return hash >>> 0;
    }

    function calculateHash(key) {
      if (/^-?\d+$/.test(key)) {
        return Math.abs(Number(key));
      }
      return djb2(key);
    }

    function render(activeIndex = -1) {
      tableVisual.innerHTML = "";

      table.forEach((bucket, index) => {
        const row = document.createElement("div");
        row.className = `hash-slot${index === activeIndex ? " active" : ""}`;

        const indexBox = document.createElement("div");
        indexBox.className = "hash-slot-index";
        indexBox.textContent = index;

        const content = document.createElement("div");
        content.className = "hash-slot-content";

        if (bucket.length === 0) {
          const empty = document.createElement("span");
          empty.textContent = "vacío";
          content.appendChild(empty);
        } else {
          bucket.forEach((key, nodeIndex) => {
            const node = document.createElement("span");
            node.className = "hash-node";
            node.textContent = key;
            content.appendChild(node);

            if (nodeIndex < bucket.length - 1) {
              const arrow = document.createElement("span");
              arrow.textContent = "→";
              content.appendChild(arrow);
            }
          });
        }

        row.append(indexBox, content);
        tableVisual.appendChild(row);
      });

      const elements = table.reduce((sum, bucket) => sum + bucket.length, 0);
      loadOutput.textContent = (elements / TABLE_SIZE).toFixed(2);
    }

    function isOccupied(index) {
      return table[index].length > 0;
    }

    function insertChain(key, index) {
      table[index].push(key);
      return {
        finalIndex: index,
        message: table[index].length > 1
          ? `Colisión en ${index}. Se resolvió agregando la clave a la cadena.`
          : `La clave se insertó directamente en el índice ${index}.`
      };
    }

    function insertLinear(key, baseIndex) {
      let attempt = 0;

      while (attempt < TABLE_SIZE) {
        const index = (baseIndex + attempt) % TABLE_SIZE;

        if (!isOccupied(index)) {
          table[index] = [key];
          return {
            finalIndex: index,
            message: attempt === 0
              ? `No hubo colisión. Se insertó en ${index}.`
              : `Hubo colisión. Sondeo lineal: se avanzaron ${attempt} posiciones hasta ${index}.`
          };
        }

        attempt++;
      }

      return {
        finalIndex: -1,
        message: "La tabla está llena para direccionamiento abierto."
      };
    }

    function insertQuadratic(key, baseIndex) {
      for (let attempt = 0; attempt < TABLE_SIZE; attempt++) {
        const index = (baseIndex + (attempt * attempt)) % TABLE_SIZE;

        if (!isOccupied(index)) {
          table[index] = [key];
          return {
            finalIndex: index,
            message: attempt === 0
              ? `No hubo colisión. Se insertó en ${index}.`
              : `Hubo colisión. Sondeo cuadrático con i=${attempt}: índice final ${index}.`
          };
        }
      }

      return {
        finalIndex: -1,
        message: "No se encontró una posición libre con sondeo cuadrático."
      };
    }

    insertButton.addEventListener("click", () => {
      const key = keyInput.value.trim();

      if (!key) {
        log.textContent = "Escribe una clave antes de insertar.";
        return;
      }

      const hash = calculateHash(key);
      const baseIndex = hash % TABLE_SIZE;
      const method = methodSelect.value;

      hashValueOutput.textContent = hash;
      hashIndexOutput.textContent = baseIndex;

      let result;

      if (method === "chain") {
        result = insertChain(key, baseIndex);
      } else if (method === "linear") {
        result = insertLinear(key, baseIndex);
      } else {
        result = insertQuadratic(key, baseIndex);
      }

      render(result.finalIndex);

      log.textContent =
        `Clave "${key}". Hash=${hash}. Índice inicial=${baseIndex}. ${result.message}`;

      keyInput.value = "";
      keyInput.focus();
    });

    clearButton.addEventListener("click", () => {
      table = Array.from({ length: TABLE_SIZE }, () => []);
      hashValueOutput.textContent = "—";
      hashIndexOutput.textContent = "—";
      log.textContent = "Tabla limpiada.";
      render();
    });

    keyInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        insertButton.click();
      }
    });

    render();
  }

  const analyzeQuiz = document.getElementById("hash-quiz-analyze");
  const resetQuiz = document.getElementById("hash-quiz-reset");

  analyzeQuiz?.addEventListener("click", () => {
    let correct = 0;

    document.querySelectorAll(".hash-question[data-correct]").forEach((question) => {
      const selected = question.querySelector("input[type='radio']:checked");
      const feedback = question.querySelector(".hash-feedback");

      if (!selected) {
        feedback.textContent = "Sin responder.";
        feedback.className = "hash-feedback bad";
        return;
      }

      if (selected.value === question.dataset.correct) {
        correct++;
        feedback.textContent = "Correcto.";
        feedback.className = "hash-feedback ok";
      } else {
        feedback.textContent = "Incorrecto. Revisa el concepto correspondiente.";
        feedback.className = "hash-feedback bad";
      }
    });

    const result = document.getElementById("hash-quiz-result");
    result.textContent =
      `${correct} de 8 respuestas correctas. ` +
      (correct >= 7
        ? "Dominio muy bueno de los conceptos principales."
        : correct >= 5
          ? "Buen avance. Conviene revisar las respuestas incorrectas."
          : "Revisa función hash, colisiones y estrategias de resolución.");
  });

  resetQuiz?.addEventListener("click", () => {
    document.querySelectorAll(".hash-question input[type='radio']").forEach((input) => {
      input.checked = false;
    });

    document.querySelectorAll(".hash-feedback").forEach((feedback) => {
      feedback.textContent = "";
      feedback.className = "hash-feedback";
    });

    const result = document.getElementById("hash-quiz-result");
    if (result) {
      result.textContent = "";
    }
  });
});
