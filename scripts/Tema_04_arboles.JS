function iniciarSimuladoresArbolesV4() {
  const SVG_NS = "http://www.w3.org/2000/svg";

  class Node {
    constructor(key, parent = null) {
      this.key = key;
      this.left = null;
      this.right = null;
      this.parent = parent;
      this.height = 1;
    }
  }

  class PlaybackController {
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
      if (!this.waitResolver) return;

      const resolve = this.waitResolver;
      this.waitResolver = null;
      resolve(signal);
    }

    getDelay() {
      return Number(this.range?.value || 2500);
    }

    getAnimationDuration() {
      return Math.max(260, Math.min(4200, this.getDelay() * 0.78));
    }

    updateSpeedLabel() {
      if (!this.label) return;

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

  const controllers = {
    bst: new PlaybackController("bst"),
    avl: new PlaybackController("avl"),
    traversal: new PlaybackController("traversal")
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const height = (node) => node ? node.height : 0;

  function updateHeight(node) {
    if (node) {
      node.height = 1 + Math.max(height(node.left), height(node.right));
    }
    return node;
  }

  function updateHeightsRecursive(node) {
    if (!node) return 0;

    const left = updateHeightsRecursive(node.left);
    const right = updateHeightsRecursive(node.right);

    node.height = 1 + Math.max(left, right);
    return node.height;
  }

  const balanceFactor = (node) =>
    node ? height(node.left) - height(node.right) : 0;

  function cloneTree(node, parent = null) {
    if (!node) return null;

    const copy = new Node(node.key, parent);
    copy.height = node.height;
    copy.left = cloneTree(node.left, copy);
    copy.right = cloneTree(node.right, copy);

    return copy;
  }

  function minNode(node) {
    let current = node;

    while (current && current.left) {
      current = current.left;
    }

    return current;
  }

  function setBusy(selector, busy) {
    document.querySelectorAll(selector).forEach((button) => {
      button.disabled = busy;
    });
  }

  function clearSteps(element) {
    if (element) element.innerHTML = "";
  }

  function appendStep(element, text) {
    if (!element) return;

    const li = document.createElement("li");
    li.textContent = text;
    element.appendChild(li);
    element.scrollTop = element.scrollHeight;
  }

  function setStatus(element, text, isError = false) {
    if (!element) return;

    element.textContent = text;
    element.classList.toggle("error", isError);
  }

  function readInteger(input) {
    if (!input) return null;

    const raw = input.value.trim();

    if (raw === "") return null;

    const value = Number(raw);
    return Number.isInteger(value) ? value : null;
  }

  function layoutTree(root) {
    const records = [];
    let order = 0;

    function walk(node, depth, parentKey = null) {
      if (!node) return;

      walk(node.left, depth + 1, node.key);

      records.push({
        node,
        key: node.key,
        depth,
        order,
        parentKey
      });

      order += 1;

      walk(node.right, depth + 1, node.key);
    }

    walk(root, 0);

    const count = Math.max(records.length, 1);
    const maxDepth = records.reduce(
      (max, item) => Math.max(max, item.depth),
      0
    );

    const map = new Map();

    records.forEach((item) => {
      map.set(item.key, {
        ...item,
        x: 80 + (item.order * (840 / Math.max(count - 1, 1))),
        y: 70 + (item.depth * (360 / Math.max(maxDepth, 1)))
      });
    });

    return map;
  }

  function appendSvgLine(svg, x1, y1, x2, y2) {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", "tree-svg-edge");
    svg.appendChild(line);
  }

  function appendSvgNode(
    svg,
    x,
    y,
    node,
    isAvl,
    options = {}
  ) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "30");

    let nodeClass = `tree-svg-node${isAvl ? " avl" : ""}`;

    if (options.highlight) nodeClass += " highlight";
    if (options.current) nodeClass += " current";
    if (options.rotation) nodeClass += " rotation";

    circle.setAttribute("class", nodeClass);

    if (typeof options.opacity === "number") {
      circle.setAttribute("opacity", String(options.opacity));
    }

    svg.appendChild(circle);

    const key = document.createElementNS(SVG_NS, "text");
    key.setAttribute("x", x);
    key.setAttribute("y", y + 1);
    key.setAttribute("class", "tree-svg-key");
    key.textContent = node.key;

    if (typeof options.opacity === "number") {
      key.setAttribute("opacity", String(options.opacity));
    }

    svg.appendChild(key);

    if (isAvl) {
      const bf = document.createElementNS(SVG_NS, "text");
      bf.setAttribute("x", x);
      bf.setAttribute("y", y + 48);
      bf.setAttribute("class", "tree-svg-balance");
      bf.textContent = `FE=${balanceFactor(node)}`;

      if (typeof options.opacity === "number") {
        bf.setAttribute("opacity", String(options.opacity));
      }

      svg.appendChild(bf);
    }
  }

  function renderTree(svg, root, isAvl = false, options = {}) {
    if (!svg) return;

    svg.innerHTML = "";

    if (!root) {
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", "500");
      text.setAttribute("y", "250");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#6c7a75");
      text.setAttribute("font-size", "24");
      text.textContent = "Árbol vacío";
      svg.appendChild(text);
      return;
    }

    const map = layoutTree(root);

    map.forEach((item) => {
      const node = item.node;

      [node.left, node.right].forEach((child) => {
        if (!child) return;

        const target = map.get(child.key);

        if (target) {
          appendSvgLine(
            svg,
            item.x,
            item.y,
            target.x,
            target.y
          );
        }
      });
    });

    map.forEach((item) => {
      appendSvgNode(
        svg,
        item.x,
        item.y,
        item.node,
        isAvl,
        {
          highlight: item.key === options.highlightKey,
          current: item.key === options.currentKey,
          rotation: (options.rotationKeys || []).includes(item.key)
        }
      );
    });
  }

  function findParentKey(root, key) {
    if (!root || root.key === key) return null;

    let parent = null;
    let current = root;

    while (current) {
      if (current.key === key) return parent?.key ?? null;

      parent = current;

      if (key < current.key) current = current.left;
      else current = current.right;
    }

    return null;
  }

  async function animateTreeTransition(
    svg,
    fromRoot,
    toRoot,
    isAvl,
    controller,
    rotationKeys = []
  ) {
    const fromMap = layoutTree(fromRoot);
    const toMap = layoutTree(toRoot);

    const targetEntries = [...toMap.values()];
    const deletedEntries = [...fromMap.values()].filter(
      (item) => !toMap.has(item.key)
    );

    const duration = controller.getAnimationDuration();
    const start = performance.now();

    await new Promise((resolve) => {
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);

        svg.innerHTML = "";

        targetEntries.forEach((target) => {
          const node = target.node;

          [node.left, node.right].forEach((child) => {
            if (!child) return;

            const childTarget = toMap.get(child.key);

            if (!childTarget) return;

            const parentFrom = fromMap.get(node.key);
            const childFrom = fromMap.get(child.key);

            const px0 = parentFrom?.x ?? target.x;
            const py0 = parentFrom?.y ?? target.y;
            const cx0 = childFrom?.x ?? target.x;
            const cy0 = childFrom?.y ?? target.y;

            appendSvgLine(
              svg,
              px0 + ((target.x - px0) * eased),
              py0 + ((target.y - py0) * eased),
              cx0 + ((childTarget.x - cx0) * eased),
              cy0 + ((childTarget.y - cy0) * eased)
            );
          });
        });

        targetEntries.forEach((target) => {
          const old = fromMap.get(target.key);

          let startX = old?.x;
          let startY = old?.y;
          let opacity = 1;

          if (!old) {
            const parentKey = target.parentKey ?? findParentKey(toRoot, target.key);
            const parentOld = parentKey !== null
              ? fromMap.get(parentKey)
              : null;
            const parentNew = parentKey !== null
              ? toMap.get(parentKey)
              : null;

            startX = parentOld?.x ?? parentNew?.x ?? target.x;
            startY = parentOld?.y ?? parentNew?.y ?? target.y;
            opacity = eased;
          }

          const x = (startX ?? target.x) +
            ((target.x - (startX ?? target.x)) * eased);
          const y = (startY ?? target.y) +
            ((target.y - (startY ?? target.y)) * eased);

          appendSvgNode(
            svg,
            x,
            y,
            target.node,
            isAvl,
            {
              opacity,
              rotation: rotationKeys.includes(target.key)
            }
          );
        });

        deletedEntries.forEach((old) => {
          appendSvgNode(
            svg,
            old.x,
            old.y,
            old.node,
            isAvl,
            {
              opacity: 1 - eased,
              rotation: rotationKeys.includes(old.key)
            }
          );
        });

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });

    renderTree(svg, toRoot, isAvl);
  }

  async function showPath(
    svg,
    root,
    isAvl,
    path,
    stepsElement,
    controller
  ) {
    for (const item of path) {
      appendStep(stepsElement, item.message);
      renderTree(svg, root, isAvl, { highlightKey: item.key });
      await controller.wait();
    }
  }

  function collectSearchPath(root, key, actionWord = "comparar") {
    const path = [];
    let current = root;

    while (current) {
      if (key === current.key) {
        path.push({
          key: current.key,
          message: `${key} = ${current.key}: clave encontrada.`
        });
        return { found: current, path };
      }

      if (key < current.key) {
        path.push({
          key: current.key,
          message: `${key} < ${current.key}: ${actionWord} por el subárbol izquierdo.`
        });
        current = current.left;
      } else {
        path.push({
          key: current.key,
          message: `${key} > ${current.key}: ${actionWord} por el subárbol derecho.`
        });
        current = current.right;
      }
    }

    path.push({
      key: null,
      message: `Se llegó a NULL. La clave ${key} no existe en esta rama.`
    });

    return { found: null, path };
  }

  /* =========================================================
     ABB ANIMADO
     ========================================================= */

  let bstRoot = null;

  const bstElements = {
    input: document.getElementById("bst-value"),
    canvas: document.getElementById("bst-canvas"),
    steps: document.getElementById("bst-steps"),
    status: document.getElementById("bst-status")
  };

  function bstInsertPlain(root, key) {
    if (!root) return new Node(key);

    let current = root;

    while (true) {
      if (key === current.key) return root;

      if (key < current.key) {
        if (!current.left) {
          current.left = new Node(key, current);
          return root;
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = new Node(key, current);
          return root;
        }
        current = current.right;
      }
    }
  }

  function bstDeletePlain(root, key, detailSteps) {
    const search = collectSearchPath(root, key, "buscar");

    if (!search.found) {
      detailSteps.push(`La clave ${key} no existe. No se elimina nada.`);
      return root;
    }

    const node = search.found;

    if (!node.left && !node.right) {
      detailSteps.push(`El nodo ${key} es una hoja. Se elimina directamente.`);

      if (!node.parent) return null;

      if (node.parent.left === node) node.parent.left = null;
      else node.parent.right = null;

      return root;
    }

    if (!node.left || !node.right) {
      const child = node.left || node.right;

      detailSteps.push(
        `El nodo ${key} tiene un solo hijo (${child.key}). El hijo sube a ocupar su lugar.`
      );

      if (!node.parent) {
        child.parent = null;
        return child;
      }

      if (node.parent.left === node) node.parent.left = child;
      else node.parent.right = child;

      child.parent = node.parent;
      return root;
    }

    const successor = minNode(node.right);

    detailSteps.push(
      `El nodo ${key} tiene dos hijos. Se utiliza el sucesor in-orden ${successor.key}.`
    );

    const oldKey = node.key;
    node.key = successor.key;

    detailSteps.push(
      `El valor ${successor.key} reemplaza a ${oldKey}. Después se elimina el sucesor original.`
    );

    const child = successor.right;

    if (successor.parent.left === successor) {
      successor.parent.left = child;
    } else {
      successor.parent.right = child;
    }

    if (child) child.parent = successor.parent;

    return root;
  }

  async function runBstAction(action) {
    const controller = controllers.bst;

    if (controller.running) return;

    const value = readInteger(bstElements.input);

    if (action !== "clear" && action !== "example" && value === null) {
      setStatus(
        bstElements.status,
        "Escribe un número entero válido.",
        true
      );
      return;
    }

    controller.begin();
    setBusy("[data-bst-action]", true);
    clearSteps(bstElements.steps);

    try {
      if (action === "clear") {
        const before = cloneTree(bstRoot);
        bstRoot = null;
        appendStep(bstElements.steps, "Se elimina todo el contenido del árbol.");
        await animateTreeTransition(
          bstElements.canvas,
          before,
          bstRoot,
          false,
          controller
        );
        setStatus(bstElements.status, "Árbol vacío.");
        return;
      }

      if (action === "example") {
        const before = cloneTree(bstRoot);
        bstRoot = null;

        [
          50, 30, 70, 20, 40, 60, 90,
          10, 25, 35, 45, 55, 65, 80, 100
        ].forEach((item) => {
          bstRoot = bstInsertPlain(bstRoot, item);
        });

        appendStep(
          bstElements.steps,
          "Se carga un ABB de ejemplo para practicar búsquedas y eliminaciones."
        );

        await animateTreeTransition(
          bstElements.canvas,
          before,
          cloneTree(bstRoot),
          false,
          controller
        );

        setStatus(bstElements.status, "Ejemplo ABB cargado.");
        return;
      }

      const search = collectSearchPath(
        bstRoot,
        value,
        action === "insert" ? "continuar" : "buscar"
      );

      const pathToShow =
        action === "insert" && !search.found
          ? search.path.slice(0, -1)
          : search.path;

      await showPath(
        bstElements.canvas,
        bstRoot,
        false,
        pathToShow,
        bstElements.steps,
        controller
      );

      if (action === "search") {
        setStatus(
          bstElements.status,
          search.found
            ? `Clave ${value} encontrada.`
            : `La clave ${value} no existe.`
        );
        renderTree(bstElements.canvas, bstRoot, false);
        return;
      }

      if (action === "insert") {
        if (search.found) {
          appendStep(
            bstElements.steps,
            `La clave ${value} ya existe. No se insertan valores repetidos.`
          );
          setStatus(bstElements.status, `La clave ${value} ya existía.`);
          return;
        }

        const before = cloneTree(bstRoot);

        bstRoot = bstInsertPlain(bstRoot, value);

        appendStep(
          bstElements.steps,
          `Se encontró NULL. El nuevo nodo ${value} desciende hasta esa posición.`
        );

        await animateTreeTransition(
          bstElements.canvas,
          before,
          cloneTree(bstRoot),
          false,
          controller
        );

        setStatus(bstElements.status, `Se insertó ${value}.`);
        return;
      }

      if (action === "delete") {
        if (!search.found) {
          setStatus(
            bstElements.status,
            `La clave ${value} no existe.`
          );
          return;
        }

        const before = cloneTree(bstRoot);
        const details = [];

        bstRoot = bstDeletePlain(bstRoot, value, details);

        details.forEach((text) => appendStep(bstElements.steps, text));

        await animateTreeTransition(
          bstElements.canvas,
          before,
          cloneTree(bstRoot),
          false,
          controller
        );

        setStatus(bstElements.status, `Se eliminó ${value}.`);
      }
    } finally {
      controller.end();
      setBusy("[data-bst-action]", false);

      if (bstElements.input) {
        bstElements.input.value = "";
      }
    }
  }

  document.querySelectorAll("[data-bst-action]").forEach((button) => {
    button.addEventListener("click", () => {
      runBstAction(button.dataset.bstAction);
    });
  });

  bstElements.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      runBstAction("insert");
    }
  });

  renderTree(bstElements.canvas, bstRoot, false);

  /* =========================================================
     AVL ANIMADO
     ========================================================= */

  let avlRoot = null;

  const avlElements = {
    input: document.getElementById("avl-value"),
    canvas: document.getElementById("avl-canvas"),
    steps: document.getElementById("avl-steps"),
    status: document.getElementById("avl-status")
  };

  function connectReplacement(oldNode, newNode) {
    const parent = oldNode.parent;

    if (!parent) {
      avlRoot = newNode;
      if (newNode) newNode.parent = null;
      return;
    }

    if (parent.left === oldNode) parent.left = newNode;
    else parent.right = newNode;

    if (newNode) newNode.parent = parent;
  }

  function rotateRightGlobal(y) {
    const x = y.left;
    const t2 = x.right;
    const parent = y.parent;

    if (!parent) avlRoot = x;
    else if (parent.left === y) parent.left = x;
    else parent.right = x;

    x.parent = parent;
    x.right = y;
    y.parent = x;
    y.left = t2;

    if (t2) t2.parent = y;

    updateHeight(y);
    updateHeight(x);

    return x;
  }

  function rotateLeftGlobal(x) {
    const y = x.right;
    const t2 = y.left;
    const parent = x.parent;

    if (!parent) avlRoot = y;
    else if (parent.left === x) parent.left = y;
    else parent.right = y;

    y.parent = parent;
    y.left = x;
    x.parent = y;
    x.right = t2;

    if (t2) t2.parent = x;

    updateHeight(x);
    updateHeight(y);

    return y;
  }

  function avlInsertPlain(key) {
    if (!avlRoot) {
      avlRoot = new Node(key);
      return avlRoot;
    }

    let current = avlRoot;
    let parent = null;

    while (current) {
      if (key === current.key) return null;

      parent = current;
      current = key < current.key
        ? current.left
        : current.right;
    }

    const node = new Node(key, parent);

    if (key < parent.key) parent.left = node;
    else parent.right = node;

    return node;
  }

  function avlDeleteStructural(key, detailSteps) {
    let node = avlRoot;

    while (node && node.key !== key) {
      node = key < node.key ? node.left : node.right;
    }

    if (!node) return null;

    if (node.left && node.right) {
      const successor = minNode(node.right);

      detailSteps.push(
        `El nodo ${key} tiene dos hijos. Se usa el sucesor in-orden ${successor.key}.`
      );

      node.key = successor.key;
      node = successor;
    }

    const child = node.left || node.right;
    const rebalanceStart = node.parent;

    if (!node.parent) {
      avlRoot = child;
      if (child) child.parent = null;
    } else {
      if (node.parent.left === node) node.parent.left = child;
      else node.parent.right = child;

      if (child) child.parent = node.parent;
    }

    detailSteps.push(
      child
        ? `El hijo ${child.key} ocupa el lugar del nodo eliminado.`
        : "El nodo eliminado no tenía hijos en esa posición."
    );

    return rebalanceStart || child;
  }

  async function animateRotation(
    before,
    after,
    message,
    rotationKeys,
    controller
  ) {
    appendStep(avlElements.steps, message);

    await animateTreeTransition(
      avlElements.canvas,
      before,
      after,
      true,
      controller,
      rotationKeys
    );

    await controller.wait(0.35);
  }

  async function rebalanceFrom(startNode, controller) {
    let current = startNode;

    while (current) {
      updateHeight(current);

      const bf = balanceFactor(current);

      appendStep(
        avlElements.steps,
        `Nodo ${current.key}: altura=${current.height}, FE=${bf}.`
      );

      renderTree(
        avlElements.canvas,
        avlRoot,
        true,
        { highlightKey: current.key }
      );

      await controller.wait();

      if (bf > 1) {
        const childBf = balanceFactor(current.left);

        if (childBf >= 0) {
          const before = cloneTree(avlRoot);
          const oldKey = current.key;
          const childKey = current.left.key;

          const newSubRoot = rotateRightGlobal(current);
          updateHeightsRecursive(avlRoot);

          await animateRotation(
            before,
            cloneTree(avlRoot),
            `Caso LL: ${oldKey} está cargado a la izquierda. ${childKey} sube mediante una rotación simple a la derecha.`,
            [oldKey, childKey],
            controller
          );

          current = newSubRoot.parent;
          continue;
        }

        const oldKey = current.key;
        const childKey = current.left.key;
        const grandchildKey = current.left.right.key;

        appendStep(
          avlElements.steps,
          `Caso LR: el nodo ${oldKey} está cargado a la izquierda, pero su hijo ${childKey} está cargado a la derecha.`
        );

        let before = cloneTree(avlRoot);

        rotateLeftGlobal(current.left);
        updateHeightsRecursive(avlRoot);

        await animateRotation(
          before,
          cloneTree(avlRoot),
          `Paso 1 LR: ${grandchildKey} sube sobre ${childKey} mediante rotación simple a la izquierda.`,
          [childKey, grandchildKey],
          controller
        );

        before = cloneTree(avlRoot);

        const newSubRoot = rotateRightGlobal(current);
        updateHeightsRecursive(avlRoot);

        await animateRotation(
          before,
          cloneTree(avlRoot),
          `Paso 2 LR: ${grandchildKey} sube sobre ${oldKey} mediante rotación simple a la derecha.`,
          [oldKey, grandchildKey],
          controller
        );

        current = newSubRoot.parent;
        continue;
      }

      if (bf < -1) {
        const childBf = balanceFactor(current.right);

        if (childBf <= 0) {
          const before = cloneTree(avlRoot);
          const oldKey = current.key;
          const childKey = current.right.key;

          const newSubRoot = rotateLeftGlobal(current);
          updateHeightsRecursive(avlRoot);

          await animateRotation(
            before,
            cloneTree(avlRoot),
            `Caso RR: ${oldKey} está cargado a la derecha. ${childKey} sube mediante una rotación simple a la izquierda.`,
            [oldKey, childKey],
            controller
          );

          current = newSubRoot.parent;
          continue;
        }

        const oldKey = current.key;
        const childKey = current.right.key;
        const grandchildKey = current.right.left.key;

        appendStep(
          avlElements.steps,
          `Caso RL: el nodo ${oldKey} está cargado a la derecha, pero su hijo ${childKey} está cargado a la izquierda.`
        );

        let before = cloneTree(avlRoot);

        rotateRightGlobal(current.right);
        updateHeightsRecursive(avlRoot);

        await animateRotation(
          before,
          cloneTree(avlRoot),
          `Paso 1 RL: ${grandchildKey} sube sobre ${childKey} mediante rotación simple a la derecha.`,
          [childKey, grandchildKey],
          controller
        );

        before = cloneTree(avlRoot);

        const newSubRoot = rotateLeftGlobal(current);
        updateHeightsRecursive(avlRoot);

        await animateRotation(
          before,
          cloneTree(avlRoot),
          `Paso 2 RL: ${grandchildKey} sube sobre ${oldKey} mediante rotación simple a la izquierda.`,
          [oldKey, grandchildKey],
          controller
        );

        current = newSubRoot.parent;
        continue;
      }

      current = current.parent;
    }

    updateHeightsRecursive(avlRoot);
    renderTree(avlElements.canvas, avlRoot, true);
  }

  function avlInsertSync(key) {
    const inserted = avlInsertPlain(key);

    if (!inserted) return;

    let current = inserted.parent;

    while (current) {
      updateHeight(current);

      const bf = balanceFactor(current);

      if (bf > 1) {
        if (balanceFactor(current.left) < 0) {
          rotateLeftGlobal(current.left);
        }

        const root = rotateRightGlobal(current);
        current = root.parent;
      } else if (bf < -1) {
        if (balanceFactor(current.right) > 0) {
          rotateRightGlobal(current.right);
        }

        const root = rotateLeftGlobal(current);
        current = root.parent;
      } else {
        current = current.parent;
      }
    }

    updateHeightsRecursive(avlRoot);
  }

  async function runAvlAction(action) {
    const controller = controllers.avl;

    if (controller.running) return;

    const value = readInteger(avlElements.input);

    if (action !== "clear" && action !== "example" && value === null) {
      setStatus(
        avlElements.status,
        "Escribe un número entero válido.",
        true
      );
      return;
    }

    controller.begin();
    setBusy("[data-avl-action]", true);
    clearSteps(avlElements.steps);

    try {
      if (action === "clear") {
        const before = cloneTree(avlRoot);
        avlRoot = null;

        appendStep(
          avlElements.steps,
          "Se elimina todo el árbol AVL."
        );

        await animateTreeTransition(
          avlElements.canvas,
          before,
          avlRoot,
          true,
          controller
        );

        setStatus(avlElements.status, "Árbol AVL vacío.");
        return;
      }

      if (action === "example") {
        const before = cloneTree(avlRoot);
        avlRoot = null;

        [30,20,40,10,25,35,50,5].forEach(avlInsertSync);

        appendStep(
          avlElements.steps,
          "Se cargó un AVL de ejemplo. Cada nodo muestra su factor de equilibrio."
        );

        await animateTreeTransition(
          avlElements.canvas,
          before,
          cloneTree(avlRoot),
          true,
          controller
        );

        setStatus(avlElements.status, "Ejemplo AVL cargado.");
        return;
      }

      const search = collectSearchPath(
        avlRoot,
        value,
        action === "insert" ? "continuar" : "buscar"
      );

      const pathToShow =
        action === "insert" && !search.found
          ? search.path.slice(0, -1)
          : search.path;

      await showPath(
        avlElements.canvas,
        avlRoot,
        true,
        pathToShow,
        avlElements.steps,
        controller
      );

      if (action === "insert") {
        if (search.found) {
          appendStep(
            avlElements.steps,
            `La clave ${value} ya existe. No se insertan repetidos.`
          );
          setStatus(avlElements.status, `La clave ${value} ya existía.`);
          return;
        }

        const beforeInsert = cloneTree(avlRoot);
        const inserted = avlInsertPlain(value);

        appendStep(
          avlElements.steps,
          `El nodo ${value} baja hasta la posición NULL encontrada.`
        );

        await animateTreeTransition(
          avlElements.canvas,
          beforeInsert,
          cloneTree(avlRoot),
          true,
          controller
        );

        await controller.wait(0.4);

        await rebalanceFrom(inserted.parent, controller);

        setStatus(
          avlElements.status,
          `Inserción de ${value} terminada y árbol balanceado.`
        );

        return;
      }

      if (action === "delete") {
        if (!search.found) {
          setStatus(
            avlElements.status,
            `La clave ${value} no existe.`
          );
          return;
        }

        const beforeDelete = cloneTree(avlRoot);
        const details = [];
        const rebalanceStart = avlDeleteStructural(value, details);

        updateHeightsRecursive(avlRoot);

        details.forEach((text) => appendStep(avlElements.steps, text));

        await animateTreeTransition(
          avlElements.canvas,
          beforeDelete,
          cloneTree(avlRoot),
          true,
          controller
        );

        await controller.wait(0.4);

        await rebalanceFrom(rebalanceStart, controller);

        setStatus(
          avlElements.status,
          `Eliminación de ${value} terminada y árbol balanceado.`
        );
      }
    } finally {
      controller.end();
      setBusy("[data-avl-action]", false);

      if (avlElements.input) {
        avlElements.input.value = "";
      }
    }
  }

  document.querySelectorAll("[data-avl-action]").forEach((button) => {
    button.addEventListener("click", () => {
      runAvlAction(button.dataset.avlAction);
    });
  });

  avlElements.input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      runAvlAction("insert");
    }
  });

  renderTree(avlElements.canvas, avlRoot, true);

  /* =========================================================
     SIMULADOR DE RECORRIDOS
     ========================================================= */

  const traversalElements = {
    canvas: document.getElementById("traversal-canvas"),
    sequence: document.getElementById("traversal-sequence"),
    current: document.getElementById("traversal-current"),
    explanation: document.getElementById("traversal-explanation"),
    status: document.getElementById("traversal-status")
  };

  let traversalRoot = null;

  const traversalExampleValues = [
    50, 30, 70, 20, 40, 60, 90,
    10, 25, 35, 45, 55, 65, 80, 100
  ];

  function preorder(node, result) {
    if (!node) return;
    result.push(node.key);
    preorder(node.left, result);
    preorder(node.right, result);
  }

  function inorder(node, result) {
    if (!node) return;
    inorder(node.left, result);
    result.push(node.key);
    inorder(node.right, result);
  }

  function postorder(node, result) {
    if (!node) return;
    postorder(node.left, result);
    postorder(node.right, result);
    result.push(node.key);
  }

  function traversalDescription(mode) {
    if (mode === "preorder") {
      return "Pre-orden: procesar nodo → recorrer izquierda → recorrer derecha.";
    }

    if (mode === "inorder") {
      return "In-orden: recorrer izquierda → procesar nodo → recorrer derecha.";
    }

    return "Post-orden: recorrer izquierda → recorrer derecha → procesar nodo.";
  }

  async function loadTraversalExample() {
    const controller = controllers.traversal;

    if (controller.running) return;

    controller.begin();
    setBusy("[data-traversal-action]", true);

    try {
      traversalRoot = null;
      traversalElements.sequence.textContent = "—";
      traversalElements.current.textContent = "—";
      traversalElements.explanation.textContent =
        "Construyendo el árbol de ejemplo nodo por nodo.";

      renderTree(
        traversalElements.canvas,
        traversalRoot,
        false
      );

      for (const value of traversalExampleValues) {
        const before = cloneTree(traversalRoot);

        traversalRoot = bstInsertPlain(
          traversalRoot,
          value
        );

        traversalElements.current.textContent = value;

        setStatus(
          traversalElements.status,
          `Insertando ${value} en el árbol de ejemplo.`
        );

        await animateTreeTransition(
          traversalElements.canvas,
          before,
          cloneTree(traversalRoot),
          false,
          controller
        );

        await controller.wait(0.15);
      }

      traversalElements.current.textContent = "—";
      traversalElements.explanation.textContent =
        "Árbol listo. Selecciona Pre-orden, In-orden o Post-orden.";

      setStatus(
        traversalElements.status,
        "Árbol de ejemplo cargado."
      );

      renderTree(
        traversalElements.canvas,
        traversalRoot,
        false
      );
    } finally {
      controller.end();
      setBusy("[data-traversal-action]", false);
    }
  }

  async function runTraversal(mode) {
    const controller = controllers.traversal;

    if (controller.running) return;

    if (mode === "example") {
      await loadTraversalExample();
      return;
    }

    if (mode === "reset") {
      traversalElements.sequence.textContent = "—";
      traversalElements.current.textContent = "—";

      traversalElements.explanation.textContent =
        traversalRoot
          ? "Selecciona Pre-orden, In-orden o Post-orden."
          : "Presiona «Cargar ejemplo» para construir el árbol.";

      setStatus(
        traversalElements.status,
        traversalRoot
          ? "Árbol de ejemplo listo."
          : "No hay árbol cargado."
      );

      renderTree(
        traversalElements.canvas,
        traversalRoot,
        false
      );

      return;
    }

    if (!traversalRoot) {
      setStatus(
        traversalElements.status,
        "Primero presiona «Cargar ejemplo».",
        true
      );
      return;
    }

    controller.begin();
    setBusy("[data-traversal-action]", true);

    try {
      const sequence = [];

      if (mode === "preorder") {
        preorder(traversalRoot, sequence);
      }

      if (mode === "inorder") {
        inorder(traversalRoot, sequence);
      }

      if (mode === "postorder") {
        postorder(traversalRoot, sequence);
      }

      traversalElements.sequence.innerHTML = "";
      traversalElements.current.textContent = "—";
      traversalElements.explanation.textContent =
        traversalDescription(mode);

      setStatus(
        traversalElements.status,
        "Recorrido en ejecución."
      );

      for (const key of sequence) {
        renderTree(
          traversalElements.canvas,
          traversalRoot,
          false,
          { currentKey: key }
        );

        traversalElements.current.textContent = key;

        const item = document.createElement("span");
        item.textContent = key;
        traversalElements.sequence.appendChild(item);

        await controller.wait();
      }

      renderTree(
        traversalElements.canvas,
        traversalRoot,
        false
      );

      setStatus(
        traversalElements.status,
        `Recorrido terminado: ${sequence.join(" → ")}`
      );
    } finally {
      controller.end();
      setBusy("[data-traversal-action]", false);
    }
  }

  document.querySelectorAll(
    "[data-traversal-action]"
  ).forEach((button) => {
    button.addEventListener("click", () => {
      runTraversal(
        button.dataset.traversalAction
      );
    });
  });

  renderTree(
    traversalElements.canvas,
    traversalRoot,
    false
  );

  setStatus(
    traversalElements.status,
    "Motor v4 listo. Presiona «Cargar ejemplo»."
  );

  /* =========================================================
     QUIZ
     ========================================================= */

  const analyzeQuiz = document.getElementById("tree-quiz-analyze");
  const resetQuiz = document.getElementById("tree-quiz-reset");

  analyzeQuiz?.addEventListener("click", () => {
    let general = 0;
    let avl = 0;

    document.querySelectorAll(".tree-question[data-correct]").forEach((question) => {
      const selected = question.querySelector("input[type='radio']:checked");
      const feedback = question.querySelector(".tree-feedback");
      const correct = question.dataset.correct;
      const group = question.dataset.group;

      if (!selected) {
        feedback.textContent = "Sin responder.";
        feedback.className = "tree-feedback bad";
        return;
      }

      if (selected.value === correct) {
        feedback.textContent = "Correcto.";
        feedback.className = "tree-feedback ok";

        if (group === "general") general += 1;
        if (group === "avl") avl += 1;
      } else {
        feedback.textContent =
          "Incorrecto. Revisa el apartado correspondiente.";
        feedback.className = "tree-feedback bad";
      }
    });

    const total = general + avl;

    document.getElementById("tree-general-score").textContent =
      `${general} / 5`;
    document.getElementById("tree-avl-score").textContent =
      `${avl} / 5`;
    document.getElementById("tree-total-score").textContent =
      `${total} / 10`;

    const result = document.getElementById("tree-quiz-result");

    result.textContent =
      total >= 9
        ? "Dominio muy bueno de Árboles y AVL."
        : total >= 7
          ? "Buen dominio. Revisa las preguntas incorrectas para afianzar balanceo y recorridos."
          : total >= 5
            ? "Comprensión parcial. Conviene repasar ABB, eficiencia, FE y rotaciones."
            : "Repasa los conceptos básicos y utiliza los simuladores antes de intentarlo de nuevo.";
  });

  resetQuiz?.addEventListener("click", () => {
    document.querySelectorAll(".tree-question input[type='radio']").forEach((input) => {
      input.checked = false;
    });

    document.querySelectorAll(".tree-feedback").forEach((feedback) => {
      feedback.textContent = "";
      feedback.className = "tree-feedback";
    });

    document.getElementById("tree-general-score").textContent = "0 / 5";
    document.getElementById("tree-avl-score").textContent = "0 / 5";
    document.getElementById("tree-total-score").textContent = "0 / 10";
    document.getElementById("tree-quiz-result").textContent = "";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarSimuladoresArbolesV4, { once: true });
} else {
  iniciarSimuladoresArbolesV4();
}
