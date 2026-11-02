document.addEventListener("DOMContentLoaded", () => {
  const STATIC_CAPACITY = 7;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  class QueuePlaybackController {
    constructor(name) {
      this.name = name;
      this.range = document.getElementById(`${name}-speed`);
      this.label = document.getElementById(`${name}-speed-label`);
      this.pauseButton = document.querySelector(
        `[data-playback-action="pause"][data-playback-target="${name}"]`
      );
      this.stepButton = document.querySelector(
        `[data-playback-action="step"][data-playback-target="${name}"]`
      );

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
      return Number(this.range?.value || 2500);
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

  function setStatus(element, text, isError = false) {
    if (!element) {
      return;
    }

    element.textContent = text;
    element.classList.toggle("error", isError);
  }

  function clearSteps(element) {
    if (element) {
      element.innerHTML = "";
    }
  }

  function addStep(element, text) {
    if (!element) {
      return;
    }

    element.querySelectorAll("li.current").forEach((item) => {
      item.classList.remove("current");
    });

    const li = document.createElement("li");
    li.textContent = text;
    li.className = "current";
    element.appendChild(li);
    element.scrollTop = element.scrollHeight;
  }

  function readInteger(input) {
    if (!input) {
      return null;
    }

    const raw = input.value.trim();

    if (raw === "") {
      return null;
    }

    const value = Number(raw);
    return Number.isInteger(value) ? value : null;
  }

  function setButtonsBusy(selector, busy) {
    document.querySelectorAll(selector).forEach((button) => {
      button.disabled = busy;
    });
  }

  /* =========================================================
     COLA ESTÁTICA
     ========================================================= */

  const staticController = new QueuePlaybackController("static");

  const staticElements = {
    input: document.getElementById("static-value"),
    visual: document.getElementById("static-queue-visual"),
    front: document.getElementById("static-front"),
    rear: document.getElementById("static-rear"),
    count: document.getElementById("static-count"),
    steps: document.getElementById("static-steps"),
    status: document.getElementById("static-status")
  };

  let staticQueue = Array(STATIC_CAPACITY).fill(null);
  let staticFront = -1;
  let staticRear = -1;

  function staticActiveCount() {
    return staticFront === -1
      ? 0
      : staticRear - staticFront + 1;
  }

  function updateStaticIndicators(frontOverride = null, rearOverride = null) {
    if (staticElements.front) {
      staticElements.front.textContent =
        frontOverride ?? staticFront;
    }

    if (staticElements.rear) {
      staticElements.rear.textContent =
        rearOverride ?? staticRear;
    }

    if (staticElements.count) {
      staticElements.count.textContent = staticActiveCount();
    }
  }

  function renderStatic(options = {}) {
    if (!staticElements.visual) {
      return;
    }

    const {
      highlightIndex = -1,
      arrivingIndex = -1,
      leavingIndex = -1,
      frontOverride = null,
      rearOverride = null
    } = options;

    const shownFront =
      frontOverride === null ? staticFront : frontOverride;

    const shownRear =
      rearOverride === null ? staticRear : rearOverride;

    const array = document.createElement("div");
    array.className = "static-queue-array";

    staticQueue.forEach((value, index) => {
      const wrap = document.createElement("div");
      wrap.className = "static-cell-wrap";

      const indexLabel = document.createElement("div");
      indexLabel.className = "static-cell-index";
      indexLabel.textContent = index;

      if (index === shownFront && shownFront !== -1) {
        const frontPointer = document.createElement("span");
        frontPointer.className = "static-pointer front";
        frontPointer.textContent = "front ↓";
        wrap.appendChild(frontPointer);
      }

      const cell = document.createElement("div");
      let cellClass = "static-cell";

      if (value !== null) {
        cellClass += " active";
      }

      if (index === shownFront && shownFront !== -1) {
        cellClass += " front-cell";
      }

      if (index === shownRear && shownRear !== -1) {
        cellClass += " rear-cell";
      }

      if (index === arrivingIndex) {
        cellClass += " arriving";
      }

      if (index === leavingIndex) {
        cellClass += " leaving";
      }

      cell.className = cellClass;
      cell.textContent = value === null ? "—" : value;

      if (index === highlightIndex && highlightIndex !== leavingIndex) {
        cell.classList.add("focus-cell");
      }

      if (index === shownRear && shownRear !== -1) {
        const rearPointer = document.createElement("span");
        rearPointer.className = "static-pointer rear";
        rearPointer.textContent = "rear ↑";
        wrap.appendChild(rearPointer);
      }

      wrap.append(indexLabel, cell);
      array.appendChild(wrap);
    });

    staticElements.visual.innerHTML = "";
    staticElements.visual.appendChild(array);
    updateStaticIndicators(frontOverride, rearOverride);
  }

  async function staticEnqueue(value) {
    if (staticRear >= STATIC_CAPACITY - 1) {
      addStep(
        staticElements.steps,
        `rear = ${staticRear}. La última posición del arreglo ya fue alcanzada: overflow.`
      );
      setStatus(
        staticElements.status,
        "No se puede ENQUEUE: la cola estática lineal está llena.",
        true
      );
      return false;
    }

    addStep(
      staticElements.steps,
      `Verificar si la cola está llena: rear (${staticRear}) < ${STATIC_CAPACITY - 1}. Hay espacio.`
    );
    await staticController.wait();

    const newRear = staticRear + 1;

    addStep(
      staticElements.steps,
      `Calcular la nueva posición final: rear = ${staticRear} + 1 = ${newRear}.`
    );
    renderStatic({
      highlightIndex: newRear,
      rearOverride: newRear
    });
    await staticController.wait();

    if (staticFront === -1) {
      addStep(
        staticElements.steps,
        "La cola estaba vacía. front también debe apuntar al primer elemento."
      );
      staticFront = 0;
      renderStatic({
        highlightIndex: newRear,
        frontOverride: 0,
        rearOverride: newRear
      });
      await staticController.wait();
    }

    staticRear = newRear;
    staticQueue[staticRear] = value;

    addStep(
      staticElements.steps,
      `Guardar ${value} en cola[${staticRear}].`
    );
    renderStatic({
      highlightIndex: staticRear,
      arrivingIndex: staticRear
    });
    await staticController.wait();

    setStatus(
      staticElements.status,
      `ENQUEUE(${value}) terminado. front=${staticFront}, rear=${staticRear}.`
    );

    return true;
  }

  async function staticDequeue() {
    if (staticFront === -1 || staticFront > staticRear) {
      addStep(
        staticElements.steps,
        "front = -1. La cola está vacía: underflow."
      );
      setStatus(
        staticElements.status,
        "No se puede DEQUEUE: la cola está vacía.",
        true
      );
      return null;
    }

    addStep(
      staticElements.steps,
      `Verificar si la cola está vacía: front=${staticFront}. Hay un elemento disponible.`
    );
    renderStatic({ highlightIndex: staticFront });
    await staticController.wait();

    const removedValue = staticQueue[staticFront];

    addStep(
      staticElements.steps,
      `Guardar el dato cola[${staticFront}] = ${removedValue}; es el elemento que debe salir primero.`
    );
    renderStatic({
      highlightIndex: staticFront,
      leavingIndex: staticFront
    });
    await staticController.wait();

    staticQueue[staticFront] = null;

    if (staticFront === staticRear) {
      addStep(
        staticElements.steps,
        "Era el último elemento. La cola vuelve a estar vacía: front = rear = -1."
      );
      staticFront = -1;
      staticRear = -1;
      renderStatic();
      await staticController.wait();
    } else {
      const oldFront = staticFront;
      staticFront += 1;

      addStep(
        staticElements.steps,
        `Mover front: ${oldFront} + 1 = ${staticFront}. El siguiente elemento queda al frente.`
      );
      renderStatic({ highlightIndex: staticFront });
      await staticController.wait();
    }

    setStatus(
      staticElements.status,
      `DEQUEUE() devolvió ${removedValue}.`
    );

    return removedValue;
  }

  async function runStaticAction(action) {
    if (staticController.running) {
      return;
    }

    const value = readInteger(staticElements.input);

    if (action === "enqueue" && value === null) {
      setStatus(
        staticElements.status,
        "Escribe un número entero válido.",
        true
      );
      return;
    }

    staticController.begin();
    setButtonsBusy("[data-static-action]", true);
    clearSteps(staticElements.steps);

    try {
      if (action === "enqueue") {
        await staticEnqueue(value);
      }

      if (action === "dequeue") {
        await staticDequeue();
      }

      if (action === "clear") {
        staticQueue = Array(STATIC_CAPACITY).fill(null);
        staticFront = -1;
        staticRear = -1;
        renderStatic();
        addStep(
          staticElements.steps,
          "Se restableció el arreglo y front = rear = -1."
        );
        setStatus(
          staticElements.status,
          "Cola estática vacía."
        );
      }

      if (action === "example") {
        staticQueue = Array(STATIC_CAPACITY).fill(null);
        staticFront = -1;
        staticRear = -1;
        renderStatic();

        addStep(
          staticElements.steps,
          "Ejemplo: se ejecutarán ENQUEUE(10), ENQUEUE(20), ENQUEUE(30) y después DEQUEUE()."
        );
        await staticController.wait();

        for (const item of [10, 20, 30]) {
          await staticEnqueue(item);
        }

        await staticDequeue();

        addStep(
          staticElements.steps,
          "Ejemplo terminado: 10 salió primero porque fue el primer dato en entrar."
        );
      }
    } finally {
      staticController.end();
      setButtonsBusy("[data-static-action]", false);

      if (staticElements.input) {
        staticElements.input.value = "";
      }
    }
  }

  document.querySelectorAll("[data-static-action]").forEach((button) => {
    button.addEventListener("click", () => {
      runStaticAction(button.dataset.staticAction);
    });
  });

  staticElements.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      runStaticAction("enqueue");
    }
  });

  renderStatic();

  /* =========================================================
     COLA DINÁMICA
     ========================================================= */

  const dynamicController = new QueuePlaybackController("dynamic");

  const dynamicElements = {
    input: document.getElementById("dynamic-value"),
    visual: document.getElementById("dynamic-queue-visual"),
    front: document.getElementById("dynamic-front"),
    rear: document.getElementById("dynamic-rear"),
    count: document.getElementById("dynamic-count"),
    steps: document.getElementById("dynamic-steps"),
    status: document.getElementById("dynamic-status")
  };

  let dynamicQueue = [];

  function updateDynamicIndicators(frontText = null, rearText = null) {
    if (dynamicElements.front) {
      dynamicElements.front.textContent =
        frontText ??
        (dynamicQueue.length ? dynamicQueue[0] : "NULL");
    }

    if (dynamicElements.rear) {
      dynamicElements.rear.textContent =
        rearText ??
        (
          dynamicQueue.length
            ? dynamicQueue[dynamicQueue.length - 1]
            : "NULL"
        );
    }

    if (dynamicElements.count) {
      dynamicElements.count.textContent =
        dynamicQueue.length;
    }
  }

  function makeDynamicNode(value, classes = "") {
    const wrap = document.createElement("div");
    wrap.className = "dynamic-node-wrap";

    const node = document.createElement("div");
    node.className = `dynamic-node ${classes}`.trim();

    const data = document.createElement("div");
    data.className = "data";
    data.textContent = value;

    const next = document.createElement("div");
    next.className = "next";
    next.textContent = "○";

    node.append(data, next);
    wrap.appendChild(node);

    return { wrap, node };
  }

  function renderDynamic(options = {}) {
    if (!dynamicElements.visual) {
      return;
    }

    const {
      pendingValue = null,
      pendingOnly = false,
      leavingIndex = -1,
      frontOverride = null,
      rearOverrideIndex = null,
      highlightIndex = -1
    } = options;

    const track = document.createElement("div");
    track.className = "dynamic-queue-track";

    dynamicQueue.forEach((value, index) => {
      let classes = "";

      if (index === 0 && frontOverride !== "none") {
        classes += " front-node";
      }

      const rearIndex =
        rearOverrideIndex === null
          ? dynamicQueue.length - 1
          : rearOverrideIndex;

      if (index === rearIndex && rearIndex >= 0) {
        classes += " rear-node";
      }

      if (index === leavingIndex) {
        classes += " leaving";
      }

      if (index === highlightIndex) {
        classes += " front-node";
      }

      const { wrap } = makeDynamicNode(value, classes.trim());

      if (index === 0 && frontOverride !== "none") {
        const p = document.createElement("span");
        p.className = "dynamic-pointer front";
        p.textContent = "front ↓";
        wrap.appendChild(p);
      }

      if (index === rearIndex && rearIndex >= 0) {
        const p = document.createElement("span");
        p.className = "dynamic-pointer rear";
        p.textContent = "rear ↑";
        wrap.appendChild(p);
      }

      track.appendChild(wrap);

      const arrow = document.createElement("span");
      arrow.className = "dynamic-arrow";
      arrow.textContent = "→";
      track.appendChild(arrow);
    });

    if (pendingValue !== null) {
      const { wrap } = makeDynamicNode(
        pendingValue,
        "new-node"
      );

      if (pendingOnly) {
        const label = document.createElement("span");
        label.className = "dynamic-pointer front";
        label.textContent = "nuevo nodo";
        wrap.appendChild(label);
      }

      track.appendChild(wrap);

      const arrow = document.createElement("span");
      arrow.className = "dynamic-arrow";
      arrow.textContent = "→";
      track.appendChild(arrow);
    }

    const nullNode = document.createElement("span");
    nullNode.className = "dynamic-null";
    nullNode.textContent = "NULL";

    track.appendChild(nullNode);

    if (dynamicQueue.length === 0 && pendingValue === null) {
      const emptyText = document.createElement("div");
      emptyText.className = "dynamic-null";
      emptyText.textContent = "front → NULL · rear → NULL";
      dynamicElements.visual.innerHTML = "";
      dynamicElements.visual.appendChild(emptyText);
    } else {
      dynamicElements.visual.innerHTML = "";
      dynamicElements.visual.appendChild(track);
    }

    updateDynamicIndicators();
  }

  async function dynamicEnqueue(value) {
    addStep(
      dynamicElements.steps,
      `Crear un nuevo nodo y guardar ${value} en su campo dato.`
    );
    renderDynamic({
      pendingValue: value,
      pendingOnly: true,
      rearOverrideIndex: dynamicQueue.length - 1
    });
    await dynamicController.wait();

    if (dynamicQueue.length === 0) {
      addStep(
        dynamicElements.steps,
        "La cola está vacía. front y rear deben apuntar al nuevo nodo."
      );

      dynamicQueue.push(value);
      renderDynamic();
      await dynamicController.wait();

      setStatus(
        dynamicElements.status,
        `ENQUEUE(${value}) terminado. front=rear=${value}.`
      );

      return true;
    }

    const oldRearIndex = dynamicQueue.length - 1;
    const oldRearValue = dynamicQueue[oldRearIndex];

    addStep(
      dynamicElements.steps,
      `Enlazar el nodo actual de rear (${oldRearValue}) con el nuevo nodo ${value}: rear->sig = nuevo.`
    );

    dynamicQueue.push(value);

    renderDynamic({
      rearOverrideIndex: oldRearIndex
    });
    await dynamicController.wait();

    addStep(
      dynamicElements.steps,
      `Mover rear para que apunte al nuevo nodo ${value}.`
    );
    renderDynamic();
    await dynamicController.wait();

    setStatus(
      dynamicElements.status,
      `ENQUEUE(${value}) terminado. rear=${value}.`
    );

    return true;
  }

  async function dynamicDequeue() {
    if (dynamicQueue.length === 0) {
      addStep(
        dynamicElements.steps,
        "front = NULL. La cola dinámica está vacía: underflow."
      );
      setStatus(
        dynamicElements.status,
        "No se puede DEQUEUE: la cola está vacía.",
        true
      );
      return null;
    }

    const removedValue = dynamicQueue[0];

    addStep(
      dynamicElements.steps,
      `Guardar temporalmente el nodo del frente: tmp = front (${removedValue}).`
    );
    renderDynamic({ highlightIndex: 0 });
    await dynamicController.wait();

    if (dynamicQueue.length === 1) {
      addStep(
        dynamicElements.steps,
        "Es el único nodo. Después de retirarlo, front = rear = NULL."
      );
      renderDynamic({ leavingIndex: 0 });
      await dynamicController.wait();

      dynamicQueue.shift();
      renderDynamic();
      await dynamicController.wait();
    } else {
      const nextValue = dynamicQueue[1];

      addStep(
        dynamicElements.steps,
        `Mover front al siguiente nodo: front = front->sig (${nextValue}).`
      );

      renderDynamic({
        leavingIndex: 0,
        frontOverride: "none"
      });
      await dynamicController.wait();

      dynamicQueue.shift();

      renderDynamic();
      await dynamicController.wait();
    }

    addStep(
      dynamicElements.steps,
      `Liberar el nodo eliminado (${removedValue}). En C esta etapa corresponde a free(tmp).`
    );
    await dynamicController.wait();

    setStatus(
      dynamicElements.status,
      `DEQUEUE() devolvió ${removedValue}.`
    );

    return removedValue;
  }

  async function runDynamicAction(action) {
    if (dynamicController.running) {
      return;
    }

    const value = readInteger(dynamicElements.input);

    if (action === "enqueue" && value === null) {
      setStatus(
        dynamicElements.status,
        "Escribe un número entero válido.",
        true
      );
      return;
    }

    dynamicController.begin();
    setButtonsBusy("[data-dynamic-action]", true);
    clearSteps(dynamicElements.steps);

    try {
      if (action === "enqueue") {
        await dynamicEnqueue(value);
      }

      if (action === "dequeue") {
        await dynamicDequeue();
      }

      if (action === "clear") {
        dynamicQueue = [];
        renderDynamic();
        addStep(
          dynamicElements.steps,
          "Se liberaron todos los nodos y front = rear = NULL."
        );
        setStatus(
          dynamicElements.status,
          "Cola dinámica vacía."
        );
      }

      if (action === "example") {
        dynamicQueue = [];
        renderDynamic();

        addStep(
          dynamicElements.steps,
          "Ejemplo: se ejecutarán ENQUEUE(10), ENQUEUE(20), ENQUEUE(30) y después DEQUEUE()."
        );
        await dynamicController.wait();

        for (const item of [10, 20, 30]) {
          await dynamicEnqueue(item);
        }

        await dynamicDequeue();

        addStep(
          dynamicElements.steps,
          "Ejemplo terminado: front avanzó de 10 a 20 y rear permanece en 30."
        );
      }
    } finally {
      dynamicController.end();
      setButtonsBusy("[data-dynamic-action]", false);

      if (dynamicElements.input) {
        dynamicElements.input.value = "";
      }
    }
  }

  document.querySelectorAll("[data-dynamic-action]").forEach((button) => {
    button.addEventListener("click", () => {
      runDynamicAction(button.dataset.dynamicAction);
    });
  });

  dynamicElements.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      runDynamicAction("enqueue");
    }
  });

  renderDynamic();
});
