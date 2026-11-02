document.addEventListener("DOMContentLoaded", () => {
  const STATIC_CAPACITY = 7;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  class StackPlaybackController {
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

      this.range?.addEventListener("input", () => this.updateSpeedLabel());

      this.pauseButton?.addEventListener("click", () => {
        if (!this.running) return;

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
        if (!this.paused) this.releaseWait("resume");
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
      if (!this.waitResolver) return;
      const resolve = this.waitResolver;
      this.waitResolver = null;
      resolve(signal);
    }

    getDelay() {
      return Number(this.range?.value || 2500);
    }

    updateSpeedLabel() {
      if (!this.label) return;
      const seconds = this.getDelay() / 1000;
      this.label.textContent = `${seconds.toFixed(2)} s / paso`;
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

        this.stepButton.classList.toggle("active-step-mode", this.manualMode);
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

          if (!this.manualMode && !this.paused) break;
        }
      }

      await sleep(this.getDelay() * multiplier);
    }
  }

  function readInteger(input) {
    const raw = input?.value.trim() ?? "";
    if (!raw) return null;
    const value = Number(raw);
    return Number.isInteger(value) ? value : null;
  }

  function setStatus(element, text, isError = false) {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle("error", isError);
  }

  function clearSteps(element) {
    if (element) element.innerHTML = "";
  }

  function addStep(element, text) {
    if (!element) return;

    element.querySelectorAll("li.current").forEach((item) => {
      item.classList.remove("current");
    });

    const li = document.createElement("li");
    li.className = "current";
    li.textContent = text;
    element.appendChild(li);
    element.scrollTop = element.scrollHeight;
  }

  function setBusy(selector, busy) {
    document.querySelectorAll(selector).forEach((button) => {
      button.disabled = busy;
    });
  }

  /* =========================
     PILA ESTÁTICA
     ========================= */

  const staticPlayback = new StackPlaybackController("static");
  let staticStack = [];

  const s = {
    input: document.getElementById("static-value"),
    visual: document.getElementById("static-stack-visual"),
    top: document.getElementById("static-top"),
    count: document.getElementById("static-count"),
    steps: document.getElementById("static-steps"),
    status: document.getElementById("static-status")
  };

  function renderStatic(options = {}) {
    if (!s.visual) return;

    const { arrivingIndex = -1, leavingIndex = -1 } = options;
    const column = document.createElement("div");
    column.className = "static-stack-column";

    for (let i = 0; i < STATIC_CAPACITY; i++) {
      const wrap = document.createElement("div");
      wrap.className = "static-stack-cell-wrap";

      const cell = document.createElement("div");
      let cls = "static-stack-cell";
      const value = staticStack[i];

      if (value !== undefined) cls += " used";
      if (i === staticStack.length - 1 && staticStack.length) cls += " top-cell";
      if (i === arrivingIndex) cls += " arriving";
      if (i === leavingIndex) cls += " leaving";

      cell.className = cls;
      cell.textContent = value === undefined ? "—" : value;

      if (i === staticStack.length - 1 && staticStack.length) {
        const p = document.createElement("span");
        p.className = "static-top-pointer";
        p.textContent = "← TOPE";
        wrap.appendChild(p);
      }

      wrap.appendChild(cell);
      column.appendChild(wrap);
    }

    s.visual.innerHTML = "";
    s.visual.appendChild(column);

    if (s.top) s.top.textContent = staticStack.length - 1;
    if (s.count) s.count.textContent = staticStack.length;
  }

  async function staticPush(value) {
    if (staticStack.length >= STATIC_CAPACITY) {
      addStep(s.steps, "La pila está llena: ocurre overflow.");
      setStatus(s.status, "No se puede PUSH: pila estática llena.", true);
      return;
    }

    addStep(s.steps, `Verificar espacio: tope=${staticStack.length - 1}, capacidad=${STATIC_CAPACITY}.`);
    await staticPlayback.wait();

    const newTop = staticStack.length;
    addStep(s.steps, `Incrementar tope: ${newTop - 1} + 1 = ${newTop}.`);
    await staticPlayback.wait();

    staticStack.push(value);
    addStep(s.steps, `Guardar ${value} en pila[${newTop}].`);
    renderStatic({ arrivingIndex: newTop });
    await staticPlayback.wait();

    setStatus(s.status, `PUSH(${value}) terminado. tope=${newTop}.`);
  }

  async function staticPop() {
    if (!staticStack.length) {
      addStep(s.steps, "tope = -1. La pila está vacía: underflow.");
      setStatus(s.status, "No se puede POP: pila vacía.", true);
      return;
    }

    const topIndex = staticStack.length - 1;
    const value = staticStack[topIndex];

    addStep(s.steps, `Leer pila[${topIndex}] = ${value}; ese es el elemento del tope.`);
    renderStatic({ leavingIndex: topIndex });
    await staticPlayback.wait();

    staticStack.pop();
    addStep(s.steps, `Decrementar tope: ${topIndex} - 1 = ${staticStack.length - 1}.`);
    renderStatic();
    await staticPlayback.wait();

    setStatus(s.status, `POP() devolvió ${value}.`);
  }

  async function runStatic(action) {
    if (staticPlayback.running) return;

    const value = readInteger(s.input);

    if (action === "push" && value === null) {
      setStatus(s.status, "Escribe un número entero válido.", true);
      return;
    }

    staticPlayback.begin();
    setBusy("[data-static-action]", true);
    clearSteps(s.steps);

    try {
      if (action === "push") await staticPush(value);
      if (action === "pop") await staticPop();

      if (action === "peek") {
        if (!staticStack.length) {
          addStep(s.steps, "La pila está vacía; no existe elemento en el tope.");
          setStatus(s.status, "TOPE: pila vacía.", true);
        } else {
          const valueTop = staticStack[staticStack.length - 1];
          addStep(s.steps, `Consultar el tope no elimina datos: valor=${valueTop}.`);
          renderStatic();
          await staticPlayback.wait();
          setStatus(s.status, `TOPE = ${valueTop}.`);
        }
      }

      if (action === "clear") {
        staticStack = [];
        renderStatic();
        addStep(s.steps, "Se restableció la pila: tope = -1.");
        setStatus(s.status, "Pila estática vacía.");
      }

      if (action === "example") {
        staticStack = [];
        renderStatic();
        addStep(s.steps, "Ejemplo: PUSH(10), PUSH(20), PUSH(30) y después POP().");
        await staticPlayback.wait();

        for (const item of [10, 20, 30]) {
          await staticPush(item);
        }

        await staticPop();
        addStep(s.steps, "Ejemplo terminado: 30 salió primero porque fue el último en entrar.");
      }
    } finally {
      staticPlayback.end();
      setBusy("[data-static-action]", false);
      if (s.input) s.input.value = "";
    }
  }

  document.querySelectorAll("[data-static-action]").forEach((button) => {
    button.addEventListener("click", () => runStatic(button.dataset.staticAction));
  });

  s.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runStatic("push");
  });

  renderStatic();

  /* =========================
     PILA DINÁMICA
     ========================= */

  const dynamicPlayback = new StackPlaybackController("dynamic");
  let dynamicStack = [];

  const d = {
    input: document.getElementById("dynamic-value"),
    visual: document.getElementById("dynamic-stack-visual"),
    top: document.getElementById("dynamic-top"),
    count: document.getElementById("dynamic-count"),
    steps: document.getElementById("dynamic-steps"),
    status: document.getElementById("dynamic-status")
  };

  function renderDynamic(options = {}) {
    if (!d.visual) return;

    const { pendingValue = null, leavingIndex = -1 } = options;
    const column = document.createElement("div");
    column.className = "dynamic-stack-column";

    if (pendingValue !== null) {
      const wrap = document.createElement("div");
      wrap.className = "dynamic-stack-node-wrap";

      const node = document.createElement("div");
      node.className = "dynamic-stack-node new-node";

      const data = document.createElement("div");
      data.className = "data";
      data.textContent = pendingValue;

      const next = document.createElement("div");
      next.className = "next";
      next.textContent = "○";

      node.append(data, next);
      wrap.appendChild(node);
      column.appendChild(wrap);

      const arrow = document.createElement("div");
      arrow.className = "dynamic-stack-arrow";
      arrow.textContent = "↓";
      column.appendChild(arrow);
    }

    dynamicStack.forEach((value, index) => {
      const wrap = document.createElement("div");
      wrap.className = "dynamic-stack-node-wrap";

      const node = document.createElement("div");
      let cls = "dynamic-stack-node";

      if (index === 0) cls += " top-node";
      if (index === leavingIndex) cls += " leaving";

      node.className = cls;

      const data = document.createElement("div");
      data.className = "data";
      data.textContent = value;

      const next = document.createElement("div");
      next.className = "next";
      next.textContent = index === dynamicStack.length - 1 ? "∅" : "○";

      node.append(data, next);

      if (index === 0) {
        const p = document.createElement("span");
        p.className = "dynamic-top-pointer";
        p.textContent = "← TOPE";
        wrap.appendChild(p);
      }

      wrap.appendChild(node);
      column.appendChild(wrap);

      const arrow = document.createElement("div");
      arrow.className = "dynamic-stack-arrow";
      arrow.textContent = "↓";
      column.appendChild(arrow);
    });

    const nullNode = document.createElement("div");
    nullNode.className = "dynamic-stack-null";
    nullNode.textContent = "NULL";
    column.appendChild(nullNode);

    d.visual.innerHTML = "";
    d.visual.appendChild(column);

    if (d.top) d.top.textContent = dynamicStack.length ? dynamicStack[0] : "NULL";
    if (d.count) d.count.textContent = dynamicStack.length;
  }

  async function dynamicPush(value) {
    addStep(d.steps, `Reservar memoria para un nuevo nodo y guardar ${value}.`);
    renderDynamic({ pendingValue: value });
    await dynamicPlayback.wait();

    const oldTop = dynamicStack.length ? dynamicStack[0] : "NULL";
    addStep(d.steps, `nuevo->siguiente = tope actual (${oldTop}).`);
    await dynamicPlayback.wait();

    dynamicStack.unshift(value);
    addStep(d.steps, `Mover tope al nuevo nodo ${value}.`);
    renderDynamic();
    await dynamicPlayback.wait();

    setStatus(d.status, `PUSH(${value}) terminado. TOPE=${value}.`);
  }

  async function dynamicPop() {
    if (!dynamicStack.length) {
      addStep(d.steps, "tope = NULL. La pila está vacía: underflow.");
      setStatus(d.status, "No se puede POP: pila vacía.", true);
      return;
    }

    const value = dynamicStack[0];

    addStep(d.steps, `Guardar temporalmente el nodo del tope (${value}).`);
    renderDynamic({ leavingIndex: 0 });
    await dynamicPlayback.wait();

    const next = dynamicStack.length > 1 ? dynamicStack[1] : "NULL";
    addStep(d.steps, `Mover tope a tope->siguiente (${next}).`);
    dynamicStack.shift();
    renderDynamic();
    await dynamicPlayback.wait();

    addStep(d.steps, `Liberar el nodo retirado (${value}); en C corresponde a free(tmp).`);
    await dynamicPlayback.wait();

    setStatus(d.status, `POP() devolvió ${value}.`);
  }

  async function runDynamic(action) {
    if (dynamicPlayback.running) return;

    const value = readInteger(d.input);

    if (action === "push" && value === null) {
      setStatus(d.status, "Escribe un número entero válido.", true);
      return;
    }

    dynamicPlayback.begin();
    setBusy("[data-dynamic-action]", true);
    clearSteps(d.steps);

    try {
      if (action === "push") await dynamicPush(value);
      if (action === "pop") await dynamicPop();

      if (action === "peek") {
        if (!dynamicStack.length) {
          addStep(d.steps, "tope = NULL. La pila dinámica está vacía.");
          setStatus(d.status, "TOPE: NULL.", true);
        } else {
          addStep(d.steps, `Consultar el tope no elimina nodos: valor=${dynamicStack[0]}.`);
          renderDynamic();
          await dynamicPlayback.wait();
          setStatus(d.status, `TOPE = ${dynamicStack[0]}.`);
        }
      }

      if (action === "clear") {
        dynamicStack = [];
        renderDynamic();
        addStep(d.steps, "Se liberaron todos los nodos y tope = NULL.");
        setStatus(d.status, "Pila dinámica vacía.");
      }

      if (action === "example") {
        dynamicStack = [];
        renderDynamic();
        addStep(d.steps, "Ejemplo: PUSH(10), PUSH(20), PUSH(30) y después POP().");
        await dynamicPlayback.wait();

        for (const item of [10, 20, 30]) {
          await dynamicPush(item);
        }

        await dynamicPop();
        addStep(d.steps, "Ejemplo terminado: 30 salió primero porque fue el último nodo agregado.");
      }
    } finally {
      dynamicPlayback.end();
      setBusy("[data-dynamic-action]", false);
      if (d.input) d.input.value = "";
    }
  }

  document.querySelectorAll("[data-dynamic-action]").forEach((button) => {
    button.addEventListener("click", () => runDynamic(button.dataset.dynamicAction));
  });

  d.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runDynamic("push");
  });

  renderDynamic();
});
