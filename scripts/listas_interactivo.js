document.addEventListener("DOMContentLoaded", () => {
  const configs = {
    "simple-unordered": {
      mode: "simple",
      ordered: false,
      circular: false,
      double: false,
      example: [30, 10, 40, 20]
    },
    "simple-ordered": {
      mode: "simple-ordered",
      ordered: true,
      circular: false,
      double: false,
      example: [30, 10, 40, 20]
    },
    "double-list": {
      mode: "double",
      ordered: true,
      circular: false,
      double: true,
      example: [40, 10, 30, 20]
    },
    "circular-list": {
      mode: "circular",
      ordered: false,
      circular: true,
      double: false,
      example: [10, 30, 20, 40]
    },
    "double-circular-list": {
      mode: "double-circular",
      ordered: true,
      circular: true,
      double: true,
      example: [40, 10, 30, 20]
    }
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
      return Number(this.range?.value || 2000);
    }

    updateLabel() {
      if (!this.label) return;
      this.label.textContent = `${(this.delay() / 1000).toFixed(2)} s / paso`;
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

  class ListSimulator {
    constructor(id, config) {
      this.id = id;
      this.config = config;
      this.values = [];
      this.playback = new Playback(id);

      this.input = document.getElementById(`${id}-value`);
      this.visual = document.getElementById(`${id}-visual`);
      this.count = document.getElementById(`${id}-count`);
      this.first = document.getElementById(`${id}-first`);
      this.last = document.getElementById(`${id}-last`);
      this.steps = document.getElementById(`${id}-steps`);
      this.status = document.getElementById(`${id}-status`);

      this.bind();
      this.render();
    }

    bind() {
      document.querySelectorAll(`[data-list-target="${this.id}"]`).forEach((button) => {
        button.addEventListener("click", () => this.run(button.dataset.listAction));
      });

      this.input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") this.run("add");
      });
    }

    readValue() {
      const raw = this.input?.value.trim() ?? "";
      if (!raw) return null;
      const value = Number(raw);
      return Number.isInteger(value) ? value : null;
    }

    setBusy(busy) {
      document.querySelectorAll(`[data-list-target="${this.id}"]`).forEach((button) => {
        button.disabled = busy;
      });
    }

    setStatus(text, error = false) {
      if (!this.status) return;
      this.status.textContent = text;
      this.status.classList.toggle("error", error);
    }

    clearSteps() {
      if (this.steps) this.steps.innerHTML = "";
    }

    addStep(text) {
      if (!this.steps) return;

      this.steps.querySelectorAll("li.current").forEach((li) => {
        li.classList.remove("current");
      });

      const li = document.createElement("li");
      li.className = "current";
      li.textContent = text;
      this.steps.appendChild(li);
      this.steps.scrollTop = this.steps.scrollHeight;
    }

    updateState() {
      if (this.count) this.count.textContent = this.values.length;
      if (this.first) this.first.textContent = this.values.length ? this.values[0] : "NULL";
      if (this.last) this.last.textContent = this.values.length ? this.values[this.values.length - 1] : "NULL";
    }

    render(options = {}) {
      if (!this.visual) return;

      const {
        currentIndex = -1,
        foundIndex = -1,
        arrivingIndex = -1,
        leavingIndex = -1,
        reverse = false
      } = options;

      if (!this.values.length) {
        this.visual.innerHTML = '<span class="list-null">NULL · lista vacía</span>';
        this.updateState();
        return;
      }

      const indexes = [...this.values.keys()];
      if (reverse) indexes.reverse();

      const content = document.createElement("div");
      content.className = "list-visual-content";

      const track = document.createElement("div");
      track.className = "list-track";

      indexes.forEach((index, visiblePosition) => {
        const wrap = document.createElement("div");
        wrap.className = "list-node-wrap";

        const node = document.createElement("div");
        let cls = "list-node";

        if (this.config.double) cls += " double";
        if (index === currentIndex) cls += " current";
        if (index === foundIndex) cls += " found";
        if (index === arrivingIndex) cls += " arriving";
        if (index === leavingIndex) cls += " leaving";
        node.className = cls;

        if (this.config.double) {
          const prev = document.createElement("div");
          prev.className = "prev";
          prev.textContent = "◀";
          prev.setAttribute("aria-label", "enlace anterior");
          node.appendChild(prev);
        }

        const data = document.createElement("div");
        data.className = "data";
        data.textContent = this.values[index];
        node.appendChild(data);

        const next = document.createElement("div");
        next.className = "next";
        next.textContent = "●";
        next.setAttribute("aria-label", "enlace siguiente");
        node.appendChild(next);

        const isFirst = index === 0;
        const isLast = index === this.values.length - 1;

        if (isFirst || isLast) {
          const label = document.createElement("span");
          label.className = "list-node-label";

          if (isFirst && isLast) {
            label.classList.add("first-last");
            label.textContent = "PRIMERO · ÚLTIMO";
          } else if (isFirst) {
            label.textContent = "PRIMERO";
          } else {
            label.textContent = "ÚLTIMO";
          }

          wrap.appendChild(label);
        }

        wrap.appendChild(node);
        track.appendChild(wrap);

        if (visiblePosition < indexes.length - 1) {
          const arrow = document.createElement("span");
          arrow.className = "list-arrow";
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = this.config.double
            ? "↔"
            : (reverse ? "←" : "→");
          track.appendChild(arrow);
        }
      });

      if (!this.config.circular) {
        const nullNode = document.createElement("span");
        nullNode.className = "list-null";
        nullNode.textContent = "NULL";
        track.appendChild(nullNode);
      }

      content.appendChild(track);

      if (this.config.circular) {
        const loop = document.createElement("div");
        loop.className = "list-circular-return";

        if (this.config.double) {
          loop.textContent = "↔ Enlace circular: PRIMERO ⇄ ÚLTIMO";
        } else {
          loop.textContent = "↩ Enlace circular: ÚLTIMO → PRIMERO";
        }

        content.appendChild(loop);
      }

      this.visual.innerHTML = "";
      this.visual.appendChild(content);
      this.updateState();
    }

    insertionIndex(value) {
      if (!this.config.ordered) return this.values.length;
      const index = this.values.findIndex((item) => item > value);
      return index === -1 ? this.values.length : index;
    }

    async add(value) {
      if (this.values.includes(value)) {
        this.addStep(`El valor ${value} ya existe. No se permiten valores repetidos.`);
        this.setStatus(`No se agregó ${value}: valor repetido.`, true);
        return;
      }

      if (this.config.ordered) {
        this.addStep(`Buscar la posición donde ${value} conserve el orden ascendente.`);
        await this.playback.wait();

        let insertion = this.values.length;

        for (let i = 0; i < this.values.length; i++) {
          this.addStep(`Comparar ${value} con ${this.values[i]}.`);
          this.render({ currentIndex: i });
          await this.playback.wait();

          if (value < this.values[i]) {
            insertion = i;
            this.addStep(`${value} es menor que ${this.values[i]}; debe insertarse antes de ese nodo.`);
            await this.playback.wait();
            break;
          }
        }

        this.values.splice(insertion, 0, value);
        this.addStep(`Reasignar enlaces e insertar ${value} en la posición ${insertion}.`);
        this.render({ arrivingIndex: insertion });
        await this.playback.wait();
      } else {
        const insertion = this.values.length;
        this.addStep(`Crear el nuevo nodo con dato ${value}.`);
        await this.playback.wait();

        if (insertion === 0) {
          this.addStep("La lista está vacía: el nuevo nodo se convierte en PRIMERO y ÚLTIMO.");
        } else {
          this.addStep(`Enlazar el nodo actual ÚLTIMO (${this.values[insertion - 1]}) con ${value}.`);
        }
        await this.playback.wait();

        this.values.push(value);
        this.render({ arrivingIndex: insertion });
        await this.playback.wait();
      }

      if (this.config.circular && this.values.length) {
        this.addStep(`Restablecer el enlace circular: ÚLTIMO (${this.values[this.values.length - 1]}) vuelve a PRIMERO (${this.values[0]}).`);
        await this.playback.wait();
      }

      this.render();
      this.setStatus(`Se agregó ${value}.`);
    }

    async traverse(reverse = false) {
      if (!this.values.length) {
        this.addStep("La lista está vacía; no hay nodos que recorrer.");
        this.setStatus("No se puede recorrer una lista vacía.", true);
        return;
      }

      const indexes = [...this.values.keys()];
      if (reverse) indexes.reverse();

      const sequence = [];

      this.addStep(reverse
        ? "Iniciar desde ÚLTIMO y seguir los enlaces anterior."
        : "Iniciar desde PRIMERO y seguir los enlaces siguiente.");
      await this.playback.wait();

      for (const index of indexes) {
        sequence.push(this.values[index]);
        this.addStep(`Visitar nodo ${this.values[index]}.`);
        this.render({ currentIndex: index, reverse });
        await this.playback.wait();
      }

      if (this.config.circular) {
        this.addStep("Se detectó el regreso al punto de partida: el recorrido termina después de una vuelta.");
        await this.playback.wait();
      }

      this.render({ reverse });
      this.setStatus(`${reverse ? "Recorrido descendente" : "Recorrido"}: ${sequence.join(" → ")}.`);
    }

    async search(value) {
      if (!this.values.length) {
        this.addStep("La lista está vacía.");
        this.setStatus("No hay elementos para buscar.", true);
        return;
      }

      this.addStep(`Buscar ${value} comenzando desde PRIMERO.`);
      await this.playback.wait();

      for (let i = 0; i < this.values.length; i++) {
        this.addStep(`Comparar ${value} con el nodo ${this.values[i]}.`);
        this.render({ currentIndex: i });
        await this.playback.wait();

        if (this.values[i] === value) {
          this.addStep(`Coincidencia encontrada: ${value}.`);
          this.render({ foundIndex: i });
          await this.playback.wait();
          this.setStatus(`Valor ${value} encontrado en la posición ${i}.`);
          return;
        }

        if (this.config.ordered && this.values[i] > value) {
          this.addStep(`Como ${this.values[i]} ya es mayor que ${value}, la búsqueda puede detenerse.`);
          await this.playback.wait();
          break;
        }
      }

      this.render();
      this.setStatus(`Valor ${value} no encontrado.`, true);
    }

    async remove(value) {
      if (!this.values.length) {
        this.addStep("La lista está vacía.");
        this.setStatus("No hay elementos para eliminar.", true);
        return;
      }

      let found = -1;

      this.addStep(`Localizar el nodo con valor ${value}.`);
      await this.playback.wait();

      for (let i = 0; i < this.values.length; i++) {
        this.addStep(`Examinar nodo ${this.values[i]}.`);
        this.render({ currentIndex: i });
        await this.playback.wait();

        if (this.values[i] === value) {
          found = i;
          break;
        }

        if (this.config.ordered && this.values[i] > value) break;
      }

      if (found === -1) {
        this.render();
        this.addStep(`${value} no existe; no hay enlaces que modificar.`);
        this.setStatus(`No se eliminó ${value}: no existe.`, true);
        return;
      }

      this.addStep(`Nodo ${value} encontrado. Preparar la reconexión de los enlaces vecinos.`);
      this.render({ foundIndex: found });
      await this.playback.wait();

      if (this.config.double) {
        const prev = found > 0 ? this.values[found - 1] : (this.config.circular ? this.values[this.values.length - 1] : "NULL");
        const next = found < this.values.length - 1 ? this.values[found + 1] : (this.config.circular ? this.values[0] : "NULL");
        this.addStep(`Actualizar ambos sentidos: anterior=${prev}, siguiente=${next}.`);
      } else {
        const prev = found > 0 ? this.values[found - 1] : "PRIMERO";
        const next = found < this.values.length - 1 ? this.values[found + 1] : (this.config.circular ? this.values[0] : "NULL");
        this.addStep(`Actualizar el enlace necesario: ${prev} debe conectar con ${next}.`);
      }

      this.render({ leavingIndex: found });
      await this.playback.wait();

      this.values.splice(found, 1);

      if (this.config.circular && this.values.length) {
        this.addStep(`Mantener la circularidad: ÚLTIMO vuelve a enlazarse con PRIMERO.`);
        await this.playback.wait();
      }

      this.render();
      this.setStatus(`Se eliminó ${value}.`);
    }

    async loadExample() {
      this.values = [];
      this.render();

      this.addStep("Cargar un ejemplo nodo por nodo para observar cómo se construye la lista.");
      await this.playback.wait();

      for (const value of this.config.example) {
        await this.add(value);
      }

      this.addStep("Ejemplo terminado.");
      this.setStatus(`Ejemplo cargado: ${this.values.join(" → ")}.`);
    }

    async run(action) {
      if (this.playback.running) return;

      const value = this.readValue();

      if (["add", "search", "delete"].includes(action) && value === null) {
        this.setStatus("Escribe un número entero válido.", true);
        return;
      }

      if (action === "traverse-reverse" && !this.config.double) return;

      this.playback.begin();
      this.setBusy(true);
      this.clearSteps();

      try {
        if (action === "add") await this.add(value);
        if (action === "traverse") await this.traverse(false);
        if (action === "traverse-reverse") await this.traverse(true);
        if (action === "search") await this.search(value);
        if (action === "delete") await this.remove(value);

        if (action === "example") {
          await this.loadExample();
        }

        if (action === "clear") {
          this.values = [];
          this.render();
          this.addStep("Se eliminaron todos los nodos y la lista vuelve a estar vacía.");
          this.setStatus("Lista vacía.");
        }
      } finally {
        this.playback.end();
        this.setBusy(false);

        if (this.input && ["add", "search", "delete"].includes(action)) {
          this.input.value = "";
        }
      }
    }
  }

  Object.entries(configs).forEach(([id, config]) => {
    new ListSimulator(id, config);
  });
});
