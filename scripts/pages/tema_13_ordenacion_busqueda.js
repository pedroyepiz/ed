(() => {
  "use strict";
  const BASE_DATA = [8, 3, 6, 1, 5];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function copiarCodigo(id, boton) {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    const texto = elemento.innerText;
    const original = boton.textContent;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
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

  function renderBoard(board, data, active = [], sorted = []) {
    board.innerHTML = "";
    data.forEach((value, index) => {
      const item = document.createElement("div");
      item.className = "anim-item";
      item.textContent = value;
      if (active.includes(index)) item.classList.add("active");
      if (sorted.includes(index)) item.classList.add("sorted");
      board.appendChild(item);
    });
  }

  function bubbleSteps(input) {
    const arr = [...input], steps = [];
    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = 0; j < arr.length - 1 - i; j++) {
        steps.push({ data: [...arr], active: [j, j + 1], text: `Comparando ${arr[j]} y ${arr[j + 1]}.` });
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          steps.push({ data: [...arr], active: [j, j + 1], text: `Intercambio de posiciones.` });
        }
      }
    }
    steps.push({ data: [...arr], sorted: arr.map((_, i) => i), text: "Arreglo ordenado." });
    return steps;
  }

  function selectionSteps(input) {
    const arr = [...input], steps = [];
    for (let i = 0; i < arr.length - 1; i++) {
      let min = i;
      for (let j = i + 1; j < arr.length; j++) {
        steps.push({ data: [...arr], active: [min, j], text: `Buscando el menor a partir de la posición ${i}.` });
        if (arr[j] < arr[min]) {
          min = j;
          steps.push({ data: [...arr], active: [min], text: `Nuevo mínimo encontrado: ${arr[min]}.` });
        }
      }
      if (min !== i) {
        [arr[i], arr[min]] = [arr[min], arr[i]];
        steps.push({ data: [...arr], active: [i, min], text: `Se coloca el mínimo en su posición correcta.` });
      }
    }
    steps.push({ data: [...arr], sorted: arr.map((_, i) => i), text: "Arreglo ordenado." });
    return steps;
  }

  function insertionSteps(input) {
    const arr = [...input], steps = [];
    for (let i = 1; i < arr.length; i++) {
      const key = arr[i];
      let j = i - 1;
      steps.push({ data: [...arr], active: [i], text: `Tomamos ${key} para insertarlo.` });
      while (j >= 0 && arr[j] > key) {
        arr[j + 1] = arr[j];
        steps.push({ data: [...arr], active: [j, j + 1], text: `Desplazamos ${arr[j]} a la derecha.` });
        j--;
      }
      arr[j + 1] = key;
      steps.push({ data: [...arr], active: [j + 1], text: `Insertamos ${key} en la zona ordenada.` });
    }
    steps.push({ data: [...arr], sorted: arr.map((_, i) => i), text: "Arreglo ordenado." });
    return steps;
  }

  function shellSteps(input) {
    const arr = [...input], steps = [];
    let gap = Math.floor(arr.length / 2);
    while (gap > 0) {
      steps.push({ data: [...arr], text: `Trabajamos con gap = ${gap}.` });
      for (let i = gap; i < arr.length; i++) {
        const temp = arr[i];
        let j = i;
        while (j >= gap && arr[j - gap] > temp) {
          arr[j] = arr[j - gap];
          steps.push({ data: [...arr], active: [j, j - gap], text: `Comparación y corrimiento con salto ${gap}.` });
          j -= gap;
        }
        arr[j] = temp;
        steps.push({ data: [...arr], active: [j], text: `Insertamos ${temp} con el gap actual.` });
      }
      gap = Math.floor(gap / 2);
    }
    steps.push({ data: [...arr], sorted: arr.map((_, i) => i), text: "Arreglo ordenado." });
    return steps;
  }

  function mergeSteps(input) {
    const arr = [...input], steps = [];
    function merge(l, m, r) {
      const left = arr.slice(l, m + 1), right = arr.slice(m + 1, r + 1);
      let i = 0, j = 0, k = l;
      steps.push({ data: [...arr], active: Array.from({ length: r - l + 1 }, (_, idx) => l + idx), text: `Fusionamos dos partes ordenadas.` });
      while (i < left.length && j < right.length) {
        arr[k++] = left[i] <= right[j] ? left[i++] : right[j++];
        steps.push({ data: [...arr], active: [k - 1], text: `Se coloca el menor disponible.` });
      }
      while (i < left.length) { arr[k++] = left[i++]; steps.push({ data: [...arr], active: [k - 1], text: `Copiamos restante izquierdo.` }); }
      while (j < right.length) { arr[k++] = right[j++]; steps.push({ data: [...arr], active: [k - 1], text: `Copiamos restante derecho.` }); }
    }
    function sort(l, r) {
      if (l >= r) return;
      const m = Math.floor((l + r) / 2);
      sort(l, m); sort(m + 1, r); merge(l, m, r);
    }
    sort(0, arr.length - 1);
    steps.push({ data: [...arr], sorted: arr.map((_, i) => i), text: "Arreglo ordenado." });
    return steps;
  }

  function quickSteps(input) {
    const arr = [...input], steps = [];
    function partition(low, high) {
      const pivot = arr[high];
      let i = low - 1;
      steps.push({ data: [...arr], active: [high], text: `Pivote = ${pivot}.` });
      for (let j = low; j < high; j++) {
        steps.push({ data: [...arr], active: [j, high], text: `Comparación con el pivote.` });
        if (arr[j] <= pivot) {
          i++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          steps.push({ data: [...arr], active: [i, j], text: `El elemento pasa al lado izquierdo del pivote.` });
        }
      }
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
      steps.push({ data: [...arr], active: [i + 1], text: `El pivote queda en su posición final.` });
      return i + 1;
    }
    function sort(low, high) { if (low < high) { const pi = partition(low, high); sort(low, pi - 1); sort(pi + 1, high); } }
    sort(0, arr.length - 1);
    steps.push({ data: [...arr], sorted: arr.map((_, i) => i), text: "Arreglo ordenado." });
    return steps;
  }

  function heapSteps(input) {
    const arr = [...input], steps = [];
    function heapify(n, i) {
      let largest = i;
      const left = 2 * i + 1, right = 2 * i + 2;
      if (left < n && arr[left] > arr[largest]) largest = left;
      if (right < n && arr[right] > arr[largest]) largest = right;
      if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        steps.push({ data: [...arr], active: [i, largest], text: `Se restablece la propiedad del heap.` });
        heapify(n, largest);
      }
    }
    const n = arr.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i);
    for (let i = n - 1; i > 0; i--) {
      [arr[0], arr[i]] = [arr[i], arr[0]];
      steps.push({ data: [...arr], active: [0, i], text: `El máximo pasa al final del arreglo.` });
      heapify(i, 0);
    }
    steps.push({ data: [...arr], sorted: arr.map((_, i) => i), text: "Arreglo ordenado." });
    return steps;
  }

  const generators = { burbuja: bubbleSteps, seleccion: selectionSteps, insercion: insertionSteps, shell: shellSteps, merge: mergeSteps, quick: quickSteps, heap: heapSteps };

  async function playAnimation(card) {
    if (card.dataset.playing === "1") return;
    card.dataset.playing = "1";
    const method = card.dataset.method;
    const board = card.querySelector(".anim-board");
    const status = card.querySelector(".anim-status");
    const button = card.querySelector(".anim-play");
    const steps = generators[method](BASE_DATA);
    button.disabled = true;
    button.textContent = "Reproduciendo...";
    renderBoard(board, BASE_DATA);
    status.textContent = "Preparando animación...";
    for (const step of steps) {
      renderBoard(board, step.data, step.active || [], step.sorted || []);
      status.textContent = step.text || "";
      await sleep(650);
    }
    button.disabled = false;
    button.textContent = "Repetir";
    card.dataset.playing = "0";
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
          pregunta.querySelectorAll("button[data-opt]").forEach((b) => b.classList.remove("is-correct", "is-wrong"));
          const acierto = boton.dataset.opt === correcta;
          boton.classList.add(acierto ? "is-correct" : "is-wrong");
          feedback.textContent = acierto ? "✓ Correcto" : "✗ Revisa el concepto e intenta nuevamente.";
          feedback.style.color = acierto ? "#0f6b45" : "#a32828";
        });
      });
    });

    document.querySelectorAll(".anim-card").forEach((card) => {
      renderBoard(card.querySelector(".anim-board"), BASE_DATA);
      card.querySelector(".anim-play").addEventListener("click", () => playAnimation(card));
    });
  });
})();
