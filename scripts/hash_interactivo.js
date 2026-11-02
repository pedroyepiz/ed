document.addEventListener("DOMContentLoaded", () => {
  const TABLE_SIZE = 13;
  const simulator = document.querySelector("[data-hash-simulator]");

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  class HashPlaybackController {
    constructor() {
      this.range = document.getElementById("hash-speed");
      this.label = document.getElementById("hash-speed-label");
      this.pauseButton = document.getElementById("hash-pause");
      this.stepButton = document.getElementById("hash-step");

      this.running = false;
      this.paused = false;
      this.manualMode = false;
      this.pendingStep = false;
      this.waitResolver = null;

      this.updateSpeedLabel();
      this.updateButtons();

      this.range?.addEventListener("input", () => {
        this.updateSpeedLabel();
      });

      this.pauseButton?.addEventListener("click", () => {
        if (!this.running) {
          return;
        }

        if (this.manualMode) {
          this.manualMode = false;
          this.paused = false;
          this.pendingStep = false;
          this.updateButtons();
          this.releaseWait("resume");
          return;
        }

        this.paused = !this.paused;
        this.updateButtons();

        if (!this.paused) {
          this.releaseWait("resume");
        }
      });

      this.stepButton?.addEventListener("click", () => {
        if (!this.running) {
          this.manualMode = !this.manualMode;
          this.paused = this.manualMode;
          this.pendingStep = false;
          this.updateButtons();
          return;
        }

        this.manualMode = true;
        this.paused = true;
        this.pendingStep = true;
        this.updateButtons();
        this.releaseWait("step");
      });
    }

    releaseWait(signal) {
      if (!this.waitResolver) {
        return;
      }

      const resolve = this.waitResolver;
      this.waitResolver = null;
      resolve(signal);
    }

    getDelay() {
      if (!this.range) {
        return 350;
      }

      return Number(this.range.value || 2000);
    }

    updateSpeedLabel() {
      if (!this.label) {
        return;
      }

      const seconds = this.getDelay() / 1000;
      this.label.textContent = `${seconds.toFixed(2)} s / paso`;

      if (this.range) {
        this.range.title = `${seconds.toFixed(2)} segundos por paso`;
        this.range.setAttribute(
          "aria-valuetext",
          `${seconds.toFixed(2)} segundos por paso`
        );
      }
    }

    updateButtons() {
      if (this.pauseButton) {
        this.pauseButton.textContent = this.manualMode
          ? "Continuar automático"
          : (this.paused ? "Reanudar" : "Pausar");
      }

      if (this.stepButton) {
        this.stepButton.textContent = this.manualMode
          ? "Siguiente paso"
          : "Paso a paso";

        this.stepButton.classList.toggle(
          "active-step-mode",
          this.manualMode
        );
      }
    }

    begin() {
      this.running = true;
      this.paused = this.manualMode;
      this.pendingStep = false;
      this.updateButtons();
    }

    end() {
      this.running = false;
      this.paused = false;
      this.manualMode = false;
      this.pendingStep = false;
      this.waitResolver = null;
      this.updateButtons();
    }

    async wait(multiplier = 1) {
      if (this.manualMode || this.paused) {
        while (true) {
          if (this.pendingStep) {
            this.pendingStep = false;
            return;
          }

          const signal = await new Promise((resolve) => {
            this.waitResolver = resolve;
          });

          if (signal === "step") {
            this.pendingStep = false;
            return;
          }

          if (!this.manualMode && !this.paused) {
            break;
          }
        }
      }

      await sleep(this.getDelay() * multiplier);
    }
  }

  if (simulator) {
    const keyInput = document.getElementById("hash-key");
    const methodSelect = document.getElementById("hash-method");
    const insertButton = document.getElementById("hash-insert");
    const exampleButton = document.getElementById("hash-example");
    const clearButton = document.getElementById("hash-clear");

    const keyTypeOutput = document.getElementById("hash-key-type");
    const hashValueOutput = document.getElementById("hash-value");
    const hashIndexOutput = document.getElementById("hash-index");
    const loadOutput = document.getElementById("hash-load");
    const liveFormula = document.getElementById("hash-live-formula");

    const tableVisual = document.getElementById("hash-table-visual");
    const log = document.getElementById("hash-animation-log");
    const stepList = document.getElementById("hash-step-list");

    const playback = new HashPlaybackController();

    let table = Array.from({ length: TABLE_SIZE }, () => []);

    function clearStepList() {
      if (!stepList) {
        return;
      }

      stepList.innerHTML = "";
    }

    function addStep(text) {
      if (stepList) {
        stepList.querySelectorAll("li.current").forEach((item) => {
          item.classList.remove("current");
        });

        const li = document.createElement("li");
        li.textContent = text;
        li.className = "current";
        stepList.appendChild(li);
        stepList.scrollTop = stepList.scrollHeight;
      }

      if (log) {
        log.textContent = text;
      }
    }

    function setFormula(text) {
      if (liveFormula) {
        liveFormula.textContent = text;
      }
    }

    function setBusy(busy) {
      [insertButton, exampleButton, clearButton].forEach((button) => {
        if (button) {
          button.disabled = busy;
        }
      });

      if (keyInput) {
        keyInput.disabled = busy;
      }

      if (methodSelect) {
        methodSelect.disabled = busy;
      }
    }

    function countElements() {
      return table.reduce(
        (sum, bucket) => sum + bucket.length,
        0
      );
    }

    function updateLoad() {
      if (loadOutput) {
        loadOutput.textContent =
          (countElements() / TABLE_SIZE).toFixed(2);
      }
    }

    function containsKey(key) {
      return table.some((bucket) => bucket.includes(key));
    }

    function render(options = {}) {
      if (!tableVisual) {
        return;
      }

      const {
        activeIndex = -1,
        state = "",
        newKey = null
      } = options;

      tableVisual.innerHTML = "";

      table.forEach((bucket, index) => {
        const row = document.createElement("div");

        let rowClass = "hash-slot";

        if (index === activeIndex) {
          rowClass += " active";

          if (state === "probing") {
            rowClass += " probing";
          }

          if (state === "collision") {
            rowClass += " collision";
          }
        }

        row.className = rowClass;

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
            node.className =
              `hash-node${key === newKey ? " new-node" : ""}`;
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

      updateLoad();
    }

    function djb2Steps(text) {
      let hash = 5381 >>> 0;
      const steps = [];

      steps.push({
        formula: "hash inicial = 5381",
        message: "DJB2 inicia con la semilla 5381."
      });

      for (const char of text) {
        const previous = hash >>> 0;
        const code = char.charCodeAt(0);

        hash =
          (((previous << 5) + previous) + code) >>> 0;

        steps.push({
          formula:
            `(${previous} × 33) + ${code} = ${hash}`,
          message:
            `Carácter "${char}" (código ${code}): ` +
            `hash = (hash × 33) + código.`
        });
      }

      return {
        hash: hash >>> 0,
        steps
      };
    }

    function buildHashCalculation(key) {
      if (/^-?\d+$/.test(key)) {
        const numericValue = Math.abs(Number(key));

        return {
          keyType: "Numérica",
          hash: numericValue,
          steps: [
            {
              formula: `h(${key}) = |${key}| = ${numericValue}`,
              message:
                `Clave numérica detectada. Se utiliza ${numericValue} como valor Hash.`
            }
          ]
        };
      }

      const result = djb2Steps(key);

      return {
        keyType: "Texto · DJB2",
        hash: result.hash,
        steps: result.steps
      };
    }

    async function animateHashCalculation(key) {
      const calculation = buildHashCalculation(key);

      if (keyTypeOutput) {
        keyTypeOutput.textContent = calculation.keyType;
      }

      addStep(`Tipo de clave: ${calculation.keyType}.`);
      await playback.wait();

      for (const step of calculation.steps) {
        setFormula(step.formula);
        addStep(step.message);
        await playback.wait();
      }

      const hash = calculation.hash;
      const quotient = Math.floor(hash / TABLE_SIZE);
      const remainder = hash % TABLE_SIZE;

      setFormula(
        `${hash} = ${TABLE_SIZE} × ${quotient} + ${remainder}`
      );

      addStep(
        `División entera: ${hash} = ${TABLE_SIZE} × ` +
        `${quotient} + ${remainder}.`
      );

      await playback.wait();

      setFormula(
        `${hash} MOD ${TABLE_SIZE} = ${remainder}`
      );

      addStep(
        `Módulo: el residuo es ${remainder}; ` +
        `ese es el índice inicial.`
      );

      if (hashValueOutput) {
        hashValueOutput.textContent = hash;
      }

      if (hashIndexOutput) {
        hashIndexOutput.textContent = remainder;
      }

      render({
        activeIndex: remainder,
        state: "probing"
      });

      await playback.wait();

      return {
        hash,
        baseIndex: remainder
      };
    }

    async function insertChain(key, baseIndex) {
      render({
        activeIndex: baseIndex,
        state: table[baseIndex].length > 0
          ? "collision"
          : "probing"
      });

      if (table[baseIndex].length > 0) {
        addStep(
          `Colisión en el índice ${baseIndex}. ` +
          `El encadenamiento agrega la clave al final de la lista.`
        );
        await playback.wait();
      } else {
        addStep(
          `El índice ${baseIndex} está vacío. ` +
          `La clave puede almacenarse directamente.`
        );
        await playback.wait();
      }

      table[baseIndex].push(key);

      render({
        activeIndex: baseIndex,
        newKey: key
      });

      addStep(
        `Clave "${key}" almacenada en el índice ${baseIndex}.`
      );

      await playback.wait(0.55);

      return baseIndex;
    }

    async function insertLinear(key, baseIndex) {
      for (let attempt = 0; attempt < TABLE_SIZE; attempt++) {
        const index =
          (baseIndex + attempt) % TABLE_SIZE;

        setFormula(
          `índice = (${baseIndex} + ${attempt}) MOD ` +
          `${TABLE_SIZE} = ${index}`
        );

        render({
          activeIndex: index,
          state: isOccupied(index)
            ? "collision"
            : "probing"
        });

        if (!isOccupied(index)) {
          addStep(
            attempt === 0
              ? `La posición ${index} está libre.`
              : `Sondeo lineal: posición libre encontrada en ${index}.`
          );

          await playback.wait();

          table[index] = [key];

          render({
            activeIndex: index,
            newKey: key
          });

          addStep(
            `Clave "${key}" almacenada en ${index}.`
          );

          await playback.wait(0.55);

          return index;
        }

        addStep(
          `Colisión en ${index}. ` +
          `Sondeo lineal avanza una posición.`
        );

        await playback.wait();
      }

      addStep(
        "La tabla está llena para direccionamiento abierto."
      );

      return -1;
    }

    async function insertQuadratic(key, baseIndex) {
      for (let attempt = 0; attempt < TABLE_SIZE; attempt++) {
        const jump = attempt * attempt;
        const index =
          (baseIndex + jump) % TABLE_SIZE;

        setFormula(
          `índice = (${baseIndex} + ${attempt}²) MOD ` +
          `${TABLE_SIZE} = ${index}`
        );

        render({
          activeIndex: index,
          state: isOccupied(index)
            ? "collision"
            : "probing"
        });

        if (!isOccupied(index)) {
          addStep(
            attempt === 0
              ? `La posición ${index} está libre.`
              : `Sondeo cuadrático: posición libre encontrada en ${index}.`
          );

          await playback.wait();

          table[index] = [key];

          render({
            activeIndex: index,
            newKey: key
          });

          addStep(
            `Clave "${key}" almacenada en ${index}.`
          );

          await playback.wait(0.55);

          return index;
        }

        addStep(
          `Colisión en ${index}. ` +
          `Se probará el siguiente salto cuadrático.`
        );

        await playback.wait();
      }

      addStep(
        "No se encontró una posición libre con sondeo cuadrático."
      );

      return -1;
    }

    function isOccupied(index) {
      return table[index].length > 0;
    }

    async function insertKey(key, preserveSteps = false) {
      if (!preserveSteps) {
        clearStepList();
      }

      if (containsKey(key)) {
        addStep(
          `La clave "${key}" ya existe. No se insertan repetidos.`
        );
        return;
      }

      const {
        hash,
        baseIndex
      } = await animateHashCalculation(key);

      const method = methodSelect?.value || "chain";

      if (method === "chain") {
        await insertChain(key, baseIndex);
      } else if (method === "linear") {
        await insertLinear(key, baseIndex);
      } else {
        await insertQuadratic(key, baseIndex);
      }

      if (log) {
        log.textContent =
          `Clave "${key}". Hash=${hash}. ` +
          `Índice inicial=${baseIndex}. Operación terminada.`;
      }
    }

    async function runInsert() {
      if (playback.running) {
        return;
      }

      const key = keyInput?.value.trim() || "";

      if (!key) {
        if (log) {
          log.textContent =
            "Escribe una clave antes de insertar.";
        }
        return;
      }

      playback.begin();
      setBusy(true);

      try {
        await insertKey(key);
      } finally {
        playback.end();
        setBusy(false);

        if (keyInput) {
          keyInput.value = "";
          keyInput.focus();
        }
      }
    }

    async function runExample() {
      if (playback.running) {
        return;
      }

      playback.begin();
      setBusy(true);

      try {
        table =
          Array.from({ length: TABLE_SIZE }, () => []);

        clearStepList();

        if (hashValueOutput) {
          hashValueOutput.textContent = "—";
        }

        if (hashIndexOutput) {
          hashIndexOutput.textContent = "—";
        }

        if (keyTypeOutput) {
          keyTypeOutput.textContent = "—";
        }

        setFormula(
          "Ejemplo: 10, 23, 36 y 49 producen el mismo índice inicial."
        );

        render();

        addStep(
          "Ejemplo de colisiones: se insertarán 10, 23, 36 y 49."
        );

        await playback.wait();

        for (const key of ["10", "23", "36", "49"]) {
          addStep(`Nueva clave de ejemplo: ${key}.`);
          await playback.wait(0.5);
          await insertKey(key, true);
        }

        addStep(
          "Ejemplo terminado. Observa cómo el método elegido resolvió las colisiones."
        );
      } finally {
        playback.end();
        setBusy(false);
      }
    }

    function clearSimulator() {
      if (playback.running) {
        return;
      }

      table =
        Array.from({ length: TABLE_SIZE }, () => []);

      if (hashValueOutput) {
        hashValueOutput.textContent = "—";
      }

      if (hashIndexOutput) {
        hashIndexOutput.textContent = "—";
      }

      if (keyTypeOutput) {
        keyTypeOutput.textContent = "—";
      }

      clearStepList();
      setFormula("Inserta una clave para iniciar.");

      if (log) {
        log.textContent = "Tabla limpiada.";
      }

      render();
    }

    insertButton?.addEventListener("click", runInsert);
    exampleButton?.addEventListener("click", runExample);
    clearButton?.addEventListener("click", clearSimulator);

    keyInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        runInsert();
      }
    });

    render();
  }

  /* =========================================================
     QUIZ DEL TEMA PRINCIPAL
     ========================================================= */

  const analyzeQuiz =
    document.getElementById("hash-quiz-analyze");

  const resetQuiz =
    document.getElementById("hash-quiz-reset");

  analyzeQuiz?.addEventListener("click", () => {
    let correct = 0;

    document
      .querySelectorAll(".hash-question[data-correct]")
      .forEach((question) => {
        const selected =
          question.querySelector(
            "input[type='radio']:checked"
          );

        const feedback =
          question.querySelector(".hash-feedback");

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
          feedback.textContent =
            "Incorrecto. Revisa el concepto correspondiente.";
          feedback.className = "hash-feedback bad";
        }
      });

    const result =
      document.getElementById("hash-quiz-result");

    if (result) {
      result.textContent =
        `${correct} de 8 respuestas correctas. ` +
        (
          correct >= 7
            ? "Dominio muy bueno de los conceptos principales."
            : correct >= 5
              ? "Buen avance. Conviene revisar las respuestas incorrectas."
              : "Revisa función hash, colisiones y estrategias de resolución."
        );
    }
  });

  resetQuiz?.addEventListener("click", () => {
    document
      .querySelectorAll(
        ".hash-question input[type='radio']"
      )
      .forEach((input) => {
        input.checked = false;
      });

    document
      .querySelectorAll(".hash-feedback")
      .forEach((feedback) => {
        feedback.textContent = "";
        feedback.className = "hash-feedback";
      });

    const result =
      document.getElementById("hash-quiz-result");

    if (result) {
      result.textContent = "";
    }
  });
});
