document.addEventListener("DOMContentLoaded", () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  class Playback {
    constructor(id) {
      this.id = id;
      this.range = document.getElementById(`${id}-speed`);
      this.label = document.getElementById(`${id}-speed-label`);
      this.pauseButton = document.querySelector(
        `[data-playback-action="pause"][data-playback-target="${id}"]`
      );
      this.stepButton = document.querySelector(
        `[data-playback-action="step"][data-playback-target="${id}"]`
      );

      this.running = false;
      this.paused = false;
      this.manual = false;
      this.pendingStep = false;
      this.waitResolver = null;

      this.updateLabel();
      this.updateButtons();

      this.range?.addEventListener("input", () => this.updateLabel());

      this.pauseButton?.addEventListener("click", () => {
        if (!this.running) return;

        if (this.manual) {
          this.manual = false;
          this.paused = false;
          this.pendingStep = false;
          this.updateButtons();
          this.release("resume");
          return;
        }

        this.paused = !this.paused;
        this.updateButtons();

        if (!this.paused) this.release("resume");
      });

      this.stepButton?.addEventListener("click", () => {
        if (!this.running) {
          this.manual = !this.manual;
          this.paused = this.manual;
          this.pendingStep = false;
          this.updateButtons();
          return;
        }

        this.manual = true;
        this.paused = true;
        this.pendingStep = true;
        this.updateButtons();
        this.release("step");
      });
    }

    delay() {
      return Number(this.range?.value || 2500);
    }

    updateLabel() {
      if (this.label) {
        this.label.textContent = `${(this.delay() / 1000).toFixed(2)} s / paso`;
      }
    }

    updateButtons() {
      if (this.pauseButton) {
        this.pauseButton.textContent = this.manual
          ? "Continuar automático"
          : (this.paused ? "Reanudar" : "Pausar");
      }

      if (this.stepButton) {
        this.stepButton.textContent = this.manual ? "Siguiente paso" : "Paso a paso";
        this.stepButton.classList.toggle("active-step-mode", this.manual);
      }
    }

    release(signal) {
      if (!this.waitResolver) return;
      const resolve = this.waitResolver;
      this.waitResolver = null;
      resolve(signal);
    }

    begin() {
      this.running = true;
      this.paused = this.manual;
      this.pendingStep = false;
      this.updateButtons();
    }

    end() {
      this.running = false;
      this.paused = false;
      this.manual = false;
      this.pendingStep = false;
      this.waitResolver = null;
      this.updateButtons();
    }

    async wait(multiplier = 1) {
      if (this.manual || this.paused) {
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

          if (!this.manual && !this.paused) break;
        }
      }

      await sleep(this.delay() * multiplier);
    }
  }

  class PriorityQueueSimulator {
    constructor() {
      this.items = [];
      this.sequence = 0;
      this.playback = new Playback("priority");

      this.valueInput = document.getElementById("priority-value");
      this.priorityInput = document.getElementById("priority-level");
      this.visual = document.getElementById("priority-visual");
      this.steps = document.getElementById("priority-steps");
      this.status = document.getElementById("priority-status");
      this.count = document.getElementById("priority-count");
      this.next = document.getElementById("priority-next");

      this.bind();
      this.render();
    }

    bind() {
      document.querySelectorAll("[data-priority-action]").forEach((button) => {
        button.addEventListener("click", () => this.run(button.dataset.priorityAction));
      });
    }

    orderedItems() {
      return [...this.items].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.order - b.order;
      });
    }

    setBusy(busy) {
      document.querySelectorAll("[data-priority-action]").forEach((button) => {
        button.disabled = busy;
      });
    }

    setStatus(text, error = false) {
      this.status.textContent = text;
      this.status.classList.toggle("error", error);
    }

    clearSteps() {
      this.steps.innerHTML = "";
    }

    addStep(text) {
      this.steps.querySelectorAll("li.current").forEach((li) => li.classList.remove("current"));
      const li = document.createElement("li");
      li.className = "current";
      li.textContent = text;
      this.steps.appendChild(li);
      this.steps.scrollTop = this.steps.scrollHeight;
    }

    render(options = {}) {
      const ordered = this.orderedItems();
      this.visual.innerHTML = "";

      if (!ordered.length) {
        this.visual.innerHTML = '<div class="priority-empty">Cola vacía</div>';
      } else {
        ordered.forEach((item, index) => {
          const card = document.createElement("div");
          card.className = "priority-item";
          card.dataset.itemId = item.id;

          if (item.id === options.currentId) card.classList.add("current");
          if (item.id === options.arrivingId) card.classList.add("arriving");
          if (item.id === options.leavingId) card.classList.add("leaving");
          if (index === 0) card.classList.add("next-out");

          const value = document.createElement("div");
          value.className = "priority-item-value";
          value.textContent = item.value;

          const priority = document.createElement("div");
          priority.className = "priority-item-priority";
          priority.textContent = `Prioridad ${item.priority}`;

          const order = document.createElement("div");
          order.className = "priority-item-order";
          order.textContent = `Llegada #${item.order}`;

          card.append(value, priority, order);
          this.visual.appendChild(card);
        });
      }

      this.count.textContent = this.items.length;
      this.next.textContent = ordered.length
        ? `${ordered[0].value} (P${ordered[0].priority})`
        : "—";
    }

    async enqueue() {
      const value = this.valueInput.value.trim();
      const priority = Number(this.priorityInput.value);

      if (!value) {
        this.setStatus("Escribe un valor.", true);
        return;
      }

      if (!Number.isInteger(priority) || priority < 1 || priority > 99) {
        this.setStatus("La prioridad debe ser un entero entre 1 y 99.", true);
        return;
      }

      this.sequence++;
      const item = {
        id: `pq-${Date.now()}-${this.sequence}`,
        value,
        priority,
        order: this.sequence
      };

      this.addStep(`Crear el elemento "${value}" con prioridad ${priority}.`);
      await this.playback.wait();

      this.items.push(item);
      this.addStep("Agregar el elemento a la colección de pendientes.");
      this.render({arrivingId: item.id});
      await this.playback.wait();

      const ordered = this.orderedItems();
      const position = ordered.findIndex((entry) => entry.id === item.id);

      this.addStep(
        position === 0
          ? `"${value}" queda al frente porque tiene la prioridad más alta.`
          : `"${value}" queda en la posición ${position + 1} del orden de atención.`
      );
      this.render({currentId: item.id});
      await this.playback.wait();

      if (ordered.length > 1) {
        this.addStep(
          `El siguiente en salir es "${ordered[0].value}" con prioridad ${ordered[0].priority}.`
        );
        await this.playback.wait();
      }

      this.render();
      this.setStatus(`Se agregó "${value}" con prioridad ${priority}.`);
    }

    async dequeue() {
      const ordered = this.orderedItems();

      if (!ordered.length) {
        this.addStep("La cola está vacía; no hay elementos que atender.");
        this.setStatus("Cola con prioridad vacía.", true);
        return;
      }

      const target = ordered[0];

      this.addStep("Buscar el elemento con mayor prioridad.");
      this.render({currentId: target.id});
      await this.playback.wait();

      this.addStep(
        `"${target.value}" tiene prioridad ${target.priority} y será atendido primero.`
      );
      await this.playback.wait();

      this.render({leavingId: target.id});
      await this.playback.wait(.7);

      this.items = this.items.filter((item) => item.id !== target.id);

      const next = this.orderedItems()[0];
      if (next) {
        this.addStep(
          `Después de retirarlo, "${next.value}" pasa al frente con prioridad ${next.priority}.`
        );
      } else {
        this.addStep("No quedan elementos pendientes.");
      }
      this.render();
      await this.playback.wait();

      this.setStatus(`Se atendió "${target.value}" (prioridad ${target.priority}).`);
    }

    async peek() {
      const ordered = this.orderedItems();

      if (!ordered.length) {
        this.addStep("La cola está vacía.");
        this.setStatus("No existe un primer elemento.", true);
        return;
      }

      const target = ordered[0];
      this.addStep("Consultar el elemento de mayor prioridad sin eliminarlo.");
      this.render({currentId: target.id});
      await this.playback.wait();

      this.addStep(`Resultado: "${target.value}" con prioridad ${target.priority}.`);
      await this.playback.wait();

      this.render();
      this.setStatus(`Primero: "${target.value}" · prioridad ${target.priority}.`);
    }

    async example() {
      this.items = [];
      this.sequence = 0;
      this.render();

      const sample = [
        ["Proceso A", 3],
        ["Proceso B", 8],
        ["Proceso C", 5],
        ["Proceso D", 8]
      ];

      this.addStep("Se cargarán cuatro procesos uno por uno.");
      await this.playback.wait();

      for (const [value, priority] of sample) {
        this.sequence++;
        const item = {
          id: `pq-example-${this.sequence}`,
          value,
          priority,
          order: this.sequence
        };

        this.items.push(item);
        this.addStep(`Llega ${value} con prioridad ${priority}.`);
        this.render({arrivingId: item.id});
        await this.playback.wait();
      }

      this.addStep(
        "B y D tienen la misma prioridad 8: B queda antes porque llegó primero."
      );
      await this.playback.wait();

      this.render();
      this.setStatus("Ejemplo cargado. Presiona Atender para observar el orden de salida.");
    }

    async clear() {
      this.items = [];
      this.sequence = 0;
      this.render();
      this.addStep("Se eliminaron todos los elementos.");
      this.setStatus("Cola con prioridad vacía.");
    }

    async run(action) {
      if (this.playback.running) return;

      this.playback.begin();
      this.setBusy(true);
      this.clearSteps();

      try {
        if (action === "enqueue") await this.enqueue();
        if (action === "dequeue") await this.dequeue();
        if (action === "peek") await this.peek();
        if (action === "example") await this.example();
        if (action === "clear") await this.clear();
      } finally {
        this.playback.end();
        this.setBusy(false);
      }
    }
  }

  class HeapSimulator {
    constructor() {
      this.heap = [];
      this.nextId = 1;
      this.playback = new Playback("heap");

      this.valueInput = document.getElementById("heap-value");
      this.typeSelect = document.getElementById("heap-type");
      this.canvas = document.getElementById("heap-canvas");
      this.array = document.getElementById("heap-array");
      this.steps = document.getElementById("heap-steps");
      this.status = document.getElementById("heap-status");
      this.rootValue = document.getElementById("heap-root-value");
      this.count = document.getElementById("heap-count");
      this.height = document.getElementById("heap-height");
      this.typeLabel = document.getElementById("heap-type-label");
      this.propertyText = document.getElementById("heap-property-text");

      this.bind();
      this.updateTypeLabels();
      this.render();
    }

    bind() {
      document.querySelectorAll("[data-heap-action]").forEach((button) => {
        button.addEventListener("click", () => this.run(button.dataset.heapAction));
      });

      this.typeSelect.addEventListener("change", () => {
        this.heap = [];
        this.nextId = 1;
        this.clearSteps();
        this.addStep("Se cambió el tipo de heap. La estructura se reinició.");
        this.updateTypeLabels();
        this.render();
        this.setStatus("Montículo vacío.");
      });

      this.valueInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") this.run("insert");
      });
    }

    isMax() {
      return this.typeSelect.value === "max";
    }

    higherPriority(a, b) {
      return this.isMax() ? a.value > b.value : a.value < b.value;
    }

    parentIndex(i) {
      return Math.floor((i - 1) / 2);
    }

    leftIndex(i) {
      return (2 * i) + 1;
    }

    rightIndex(i) {
      return (2 * i) + 2;
    }

    setBusy(busy) {
      document.querySelectorAll("[data-heap-action]").forEach((button) => {
        button.disabled = busy;
      });
      this.typeSelect.disabled = busy;
    }

    setStatus(text, error = false) {
      this.status.textContent = text;
      this.status.classList.toggle("error", error);
    }

    clearSteps() {
      this.steps.innerHTML = "";
    }

    addStep(text) {
      this.steps.querySelectorAll("li.current").forEach((li) => li.classList.remove("current"));
      const li = document.createElement("li");
      li.className = "current";
      li.textContent = text;
      this.steps.appendChild(li);
      this.steps.scrollTop = this.steps.scrollHeight;
    }

    updateTypeLabels() {
      this.typeLabel.textContent = this.isMax() ? "MAX-HEAP" : "MIN-HEAP";
      this.propertyText.textContent = this.isMax() ? "Padre ≥ hijos" : "Padre ≤ hijos";
    }

    nodePosition(index) {
      const level = Math.floor(Math.log2(index + 1));
      const firstIndex = (2 ** level) - 1;
      const positionInLevel = index - firstIndex;
      const nodesInLevel = 2 ** level;

      const width = 900;
      const x = 50 + ((positionInLevel + 0.5) * (width / nodesInLevel));
      const y = 72 + (level * 118);

      return {x, y};
    }

    ensureSvgNode(item) {
      const ns = "http://www.w3.org/2000/svg";
      let group = this.canvas.querySelector(`[data-heap-node-id="${item.id}"]`);

      if (!group) {
        group = document.createElementNS(ns, "g");
        group.classList.add("heap-svg-node");
        group.dataset.heapNodeId = item.id;

        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("r", "34");
        circle.setAttribute("class", "heap-node-circle");

        const value = document.createElementNS(ns, "text");
        value.setAttribute("class", "heap-node-value");

        const index = document.createElementNS(ns, "text");
        index.setAttribute("class", "heap-node-index");
        index.setAttribute("y", "53");

        group.append(circle, value, index);
        this.canvas.appendChild(group);
      }

      return group;
    }

    render(options = {}) {
      const ns = "http://www.w3.org/2000/svg";
      const activeIds = new Set(this.heap.map((item) => item.id));

      this.canvas.querySelectorAll(".heap-edge").forEach((edge) => edge.remove());

      this.heap.forEach((item, index) => {
        if (index === 0) return;

        const parent = this.parentIndex(index);
        const p = this.nodePosition(parent);
        const c = this.nodePosition(index);

        const line = document.createElementNS(ns, "line");
        line.setAttribute("class", "heap-edge");
        line.setAttribute("x1", p.x);
        line.setAttribute("y1", p.y);
        line.setAttribute("x2", c.x);
        line.setAttribute("y2", c.y);
        this.canvas.insertBefore(line, this.canvas.firstChild);
      });

      this.heap.forEach((item, index) => {
        const group = this.ensureSvgNode(item);
        const pos = this.nodePosition(index);

        group.setAttribute("transform", `translate(${pos.x} ${pos.y})`);
        group.classList.toggle("current", options.currentIds?.includes(item.id) || false);
        group.classList.toggle("swap", options.swapIds?.includes(item.id) || false);

        group.querySelector(".heap-node-value").textContent = item.value;
        group.querySelector(".heap-node-index").textContent = `i=${index}`;
      });

      this.canvas.querySelectorAll(".heap-svg-node").forEach((group) => {
        if (!activeIds.has(group.dataset.heapNodeId)) group.remove();
      });

      this.array.innerHTML = "";

      if (!this.heap.length) {
        this.array.innerHTML = '<div class="priority-empty">Arreglo vacío</div>';
      } else {
        this.heap.forEach((item, index) => {
          const cell = document.createElement("div");
          cell.className = "heap-array-cell";

          if (options.currentIds?.includes(item.id)) cell.classList.add("current");
          if (options.swapIds?.includes(item.id)) cell.classList.add("swap");

          const idx = document.createElement("div");
          idx.className = "heap-array-index";
          idx.textContent = `índice ${index}`;

          const value = document.createElement("div");
          value.className = "heap-array-value";
          value.textContent = item.value;

          cell.append(idx, value);
          this.array.appendChild(cell);
        });
      }

      this.rootValue.textContent = this.heap.length ? this.heap[0].value : "—";
      this.count.textContent = this.heap.length;
      this.height.textContent = this.heap.length
        ? Math.floor(Math.log2(this.heap.length)) + 1
        : 0;

      this.updateTypeLabels();
    }

    swap(i, j) {
      [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    async insertValue(value, announce = true) {
      if (this.heap.some((item) => item.value === value)) {
        this.addStep(`El valor ${value} ya existe. En este simulador no se repiten claves.`);
        this.setStatus(`No se insertó ${value}: valor repetido.`, true);
        return false;
      }

      const item = {id: `heap-${this.nextId++}`, value};
      this.heap.push(item);
      let index = this.heap.length - 1;

      this.addStep(
        `Insertar ${value} en la última posición libre del arreglo: índice ${index}.`
      );
      this.render({currentIds:[item.id]});
      await this.playback.wait();

      while (index > 0) {
        const parent = this.parentIndex(index);
        const parentItem = this.heap[parent];

        this.addStep(
          `Comparar ${value} con su padre ${parentItem.value} (índice ${parent}).`
        );
        this.render({currentIds:[item.id, parentItem.id]});
        await this.playback.wait();

        if (!this.higherPriority(this.heap[index], this.heap[parent])) {
          this.addStep(
            this.isMax()
              ? `${value} no es mayor que ${parentItem.value}; se cumple Padre ≥ hijo.`
              : `${value} no es menor que ${parentItem.value}; se cumple Padre ≤ hijo.`
          );
          await this.playback.wait();
          break;
        }

        this.addStep(
          this.isMax()
            ? `${value} es mayor que ${parentItem.value}: intercambiarlos y hacer subir ${value}.`
            : `${value} es menor que ${parentItem.value}: intercambiarlos y hacer subir ${value}.`
        );

        const swapIds = [this.heap[index].id, this.heap[parent].id];
        this.swap(index, parent);
        this.render({swapIds});
        await this.playback.wait();

        index = parent;
      }

      this.render();

      if (announce) {
        this.setStatus(`${value} insertado correctamente.`);
      }
      return true;
    }

    async insert() {
      const value = Number(this.valueInput.value);

      if (!Number.isInteger(value)) {
        this.setStatus("Escribe un número entero válido.", true);
        return;
      }

      await this.insertValue(value, true);
    }

    bestChild(index) {
      const left = this.leftIndex(index);
      const right = this.rightIndex(index);

      if (left >= this.heap.length) return -1;
      if (right >= this.heap.length) return left;

      return this.higherPriority(this.heap[right], this.heap[left])
        ? right
        : left;
    }

    async extract() {
      if (!this.heap.length) {
        this.addStep("El heap está vacío; no existe una raíz que extraer.");
        this.setStatus("Montículo vacío.", true);
        return;
      }

      const removed = this.heap[0];

      this.addStep(`La raíz ${removed.value} es el elemento que debe salir.`);
      this.render({currentIds:[removed.id]});
      await this.playback.wait();

      if (this.heap.length === 1) {
        this.heap.pop();
        this.render();
        this.addStep("Era el único elemento; el heap queda vacío.");
        await this.playback.wait();
        this.setStatus(`Se extrajo ${removed.value}.`);
        return;
      }

      const last = this.heap[this.heap.length - 1];

      this.addStep(
        `Mover el último elemento ${last.value} desde el índice ${this.heap.length - 1} hasta la raíz.`
      );

      this.heap[0] = last;
      this.heap.pop();
      this.render({currentIds:[last.id]});
      await this.playback.wait();

      let index = 0;

      while (true) {
        const child = this.bestChild(index);
        if (child === -1) break;

        const parentItem = this.heap[index];
        const childItem = this.heap[child];

        this.addStep(
          this.isMax()
            ? `Comparar ${parentItem.value} con el hijo de mayor valor ${childItem.value}.`
            : `Comparar ${parentItem.value} con el hijo de menor valor ${childItem.value}.`
        );
        this.render({currentIds:[parentItem.id, childItem.id]});
        await this.playback.wait();

        if (!this.higherPriority(childItem, parentItem)) {
          this.addStep("La propiedad del heap ya se cumple; no es necesario seguir bajando.");
          await this.playback.wait();
          break;
        }

        this.addStep(
          `Intercambiar ${parentItem.value} con ${childItem.value}; ${parentItem.value} baja un nivel.`
        );

        const swapIds = [parentItem.id, childItem.id];
        this.swap(index, child);
        this.render({swapIds});
        await this.playback.wait();

        index = child;
      }

      this.render();
      this.setStatus(`Se extrajo la raíz ${removed.value}. El heap volvió a quedar válido.`);
    }

    async peek() {
      if (!this.heap.length) {
        this.addStep("El heap está vacío.");
        this.setStatus("No existe una raíz.", true);
        return;
      }

      this.addStep(
        `Consultar la raíz sin modificar la estructura: ${this.heap[0].value}.`
      );
      this.render({currentIds:[this.heap[0].id]});
      await this.playback.wait();

      this.render();
      this.setStatus(`Raíz actual: ${this.heap[0].value}.`);
    }

    async example() {
      this.heap = [];
      this.nextId = 1;
      this.render();

      const sample = this.isMax()
        ? [50, 30, 70, 20, 40, 60, 90]
        : [50, 70, 30, 90, 60, 40, 20];

      this.addStep(
        `Construir un ${this.isMax() ? "Max-Heap" : "Min-Heap"} insertando valores uno por uno.`
      );
      await this.playback.wait();

      for (const value of sample) {
        await this.insertValue(value, false);
      }

      this.addStep("Ejemplo terminado. Observa que el árbol es completo y también existe como arreglo.");
      await this.playback.wait();

      this.render();
      this.setStatus("Ejemplo cargado. Prueba Extraer raíz para observar sift-down.");
    }

    async clear() {
      this.heap = [];
      this.nextId = 1;
      this.render();
      this.addStep("Se eliminó todo el contenido del heap.");
      this.setStatus("Montículo vacío.");
    }

    async run(action) {
      if (this.playback.running) return;

      this.playback.begin();
      this.setBusy(true);
      this.clearSteps();

      try {
        if (action === "insert") await this.insert();
        if (action === "extract") await this.extract();
        if (action === "peek") await this.peek();
        if (action === "example") await this.example();
        if (action === "clear") await this.clear();
      } finally {
        this.playback.end();
        this.setBusy(false);

        if (action === "insert") {
          this.valueInput.value = "";
          this.valueInput.focus();
        }
      }
    }
  }

  if (document.querySelector("[data-priority-simulator]")) {
    new PriorityQueueSimulator();
  }

  if (document.querySelector("[data-heap-simulator]")) {
    new HeapSimulator();
  }

  function initHeapTopicQuiz() {
    const form = document.getElementById("heap-topic-quiz");
    if (!form) return;

    const questions = [...form.querySelectorAll(".heap-quiz-question")];
    const result = document.getElementById("heap-quiz-result");
    const resetButton = form.querySelector("[data-heap-quiz-reset]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const unanswered = questions.filter((question) => {
        return !question.querySelector('input[type="radio"]:checked');
      });

      if (unanswered.length) {
        result.textContent = `Faltan ${unanswered.length} pregunta(s) por contestar.`;
        result.classList.add("visible");
        unanswered[0].scrollIntoView({behavior:"smooth", block:"center"});
        return;
      }

      let correct = 0;

      questions.forEach((question) => {
        question.classList.remove("correct", "incorrect", "checked");

        const expected = question.dataset.correct;
        const selected = question.querySelector('input[type="radio"]:checked');

        question.querySelectorAll("label").forEach((label) => {
          label.classList.remove("correct-answer", "user-wrong");
          const input = label.querySelector('input[type="radio"]');

          if (input.value === expected) {
            label.classList.add("correct-answer");
          }

          if (input.checked && input.value !== expected) {
            label.classList.add("user-wrong");
          }
        });

        if (selected.value === expected) {
          correct++;
          question.classList.add("correct");
        } else {
          question.classList.add("incorrect");
        }

        question.classList.add("checked");
      });

      const score = correct * 20;
      const message =
        score >= 80
          ? "Buen dominio de los conceptos fundamentales."
          : score >= 60
            ? "Conviene repasar las preguntas incorrectas."
            : "Es recomendable volver a revisar el tema y utilizar los simuladores.";

      result.innerHTML = `<strong>${correct}/5 correctas · ${score}/100.</strong> ${message}`;
      result.classList.add("visible");
      result.scrollIntoView({behavior:"smooth", block:"center"});
    });

    resetButton?.addEventListener("click", () => {
      form.reset();

      questions.forEach((question) => {
        question.classList.remove("correct", "incorrect", "checked");
        question.querySelectorAll("label").forEach((label) => {
          label.classList.remove("correct-answer", "user-wrong");
        });
      });

      result.textContent = "";
      result.classList.remove("visible");
    });
  }

  initHeapTopicQuiz();

});
