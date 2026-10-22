document.addEventListener("DOMContentLoaded", () => {
  const CALC_BITS = 16;
  const SHIFT_BITS = 23;
  const SHIFT_MAX = (2 ** SHIFT_BITS) - 1;

  const calcState = {
    a: Array(CALC_BITS).fill(0),
    b: Array(CALC_BITS).fill(0)
  };

  let shiftState = Array(SHIFT_BITS).fill(0);

  const toDecimal = (bits) =>
    bits.reduce((value, bit) => (value * 2) + bit, 0);

  const toBits = (value, width) =>
    Math.max(0, value)
      .toString(2)
      .padStart(width, "0")
      .slice(-width)
      .split("")
      .map(Number);

  const asText = (bits) => bits.join("");

  const calcElements = {
    aBits: document.getElementById("binary-a-bits"),
    bBits: document.getElementById("binary-b-bits"),
    resultBits: document.getElementById("binary-result-bits"),
    aDecimal: document.getElementById("binary-a-decimal"),
    bDecimal: document.getElementById("binary-b-decimal"),
    resultDecimal: document.getElementById("binary-result-decimal"),
    aText: document.getElementById("binary-a-text"),
    bText: document.getElementById("binary-b-text"),
    resultText: document.getElementById("binary-result-text"),
    operationName: document.getElementById("binary-operation-name"),
    carryBits: document.getElementById("binary-carry-bits"),
    carryLabel: document.getElementById("binary-work-top-label"),
    explanation: document.getElementById("binary-operation-explanation"),
    longOperation: document.getElementById("binary-long-operation")
  };

  function renderEditableBits(group) {
    const target = group === "a" ? calcElements.aBits : calcElements.bBits;
    target.innerHTML = "";

    calcState[group].forEach((bit, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `binary-bit-button${bit ? " is-one" : ""}`;
      button.textContent = bit;
      button.dataset.bitGroup = group;
      button.dataset.bitIndex = index;
      button.setAttribute(
        "aria-label",
        `Cambiar bit ${CALC_BITS - 1 - index} del número ${group.toUpperCase()}, valor actual ${bit}`
      );
      target.appendChild(button);
    });

    const decimal = toDecimal(calcState[group]);
    const text = asText(calcState[group]);

    if (group === "a") {
      calcElements.aDecimal.textContent = decimal;
      calcElements.aText.textContent = text;
    } else {
      calcElements.bDecimal.textContent = decimal;
      calcElements.bText.textContent = text;
    }
  }

  function renderResult(bits) {
    calcElements.resultBits.innerHTML = "";

    bits.forEach((bit) => {
      const box = document.createElement("span");
      box.className = "binary-result-bit";
      box.textContent = bit;
      calcElements.resultBits.appendChild(box);
    });

    calcElements.resultDecimal.textContent = toDecimal(bits);
    calcElements.resultText.textContent = asText(bits);
  }

  function renderCarry(values, label) {
    calcElements.carryLabel.textContent = label;
    calcElements.carryBits.innerHTML = "";

    values.forEach((value) => {
      const box = document.createElement("span");
      box.className = "binary-carry-bit";
      box.textContent = value === null ? "" : value;
      calcElements.carryBits.appendChild(box);
    });
  }

  function explainLogical(name, symbol, result) {
    const steps = calcState.a.map((aBit, index) => {
      const bBit = calcState.b[index];
      return `
        <div class="binary-column-step">
          <div class="step-bit">Bit ${CALC_BITS - 1 - index}</div>
          <div>${aBit} ${symbol} ${bBit} = <b>${result[index]}</b></div>
        </div>`;
    }).join("");

    calcElements.explanation.innerHTML = `
      <p>
        <b>${name}</b> trabaja bit por bit. Cada posición de A se compara
        únicamente con la misma posición de B.
      </p>
      ${steps}`;
  }

  function doSum() {
    const result = Array(CALC_BITS).fill(0);
    const carryTop = Array(CALC_BITS).fill(null);
    const steps = [];
    let carry = 0;

    for (let index = CALC_BITS - 1; index >= 0; index--) {
      const a = calcState.a[index];
      const b = calcState.b[index];
      const incoming = carry;
      const total = a + b + incoming;

      result[index] = total % 2;
      carry = total >= 2 ? 1 : 0;

      if (index > 0) {
        carryTop[index - 1] = carry;
      }

      steps.push({
        position: CALC_BITS - 1 - index,
        a,
        b,
        incoming,
        total,
        result: result[index],
        carry
      });
    }

    renderCarry(carryTop, "Acarreo que pasa a la siguiente columna");

    calcElements.explanation.innerHTML = `
      <p>
        La suma binaria se realiza de <b>derecha a izquierda</b>.
        Cada columna produce un bit de resultado y, cuando corresponde,
        un acarreo que pasa a la columna siguiente.
      </p>
      ${carry ? `
        <p>
          <b>Desbordamiento:</b>
          quedó un acarreo final fuera de los ${CALC_BITS} bits.
        </p>` : ""}`;

    renderLongAddition(result, carryTop, steps);
    return result;
  }

  function doSubtraction() {
    const result = Array(CALC_BITS).fill(0);
    const borrowTop = Array(CALC_BITS).fill(null);
    const steps = [];
    let borrow = 0;

    for (let index = CALC_BITS - 1; index >= 0; index--) {
      const originalA = calcState.a[index];
      const b = calcState.b[index];
      const incomingBorrow = borrow;
      let adjustedA = originalA - incomingBorrow;

      if (adjustedA < b) {
        adjustedA += 2;
        borrow = 1;
      } else {
        borrow = 0;
      }

      result[index] = adjustedA - b;

      if (index > 0) {
        borrowTop[index - 1] = borrow;
      }

      steps.push({
        position: CALC_BITS - 1 - index,
        originalA,
        b,
        incomingBorrow,
        adjustedA,
        result: result[index],
        borrow
      });
    }

    renderCarry(borrowTop, "Préstamo tomado de la columna de la izquierda");

    calcElements.explanation.innerHTML = `
      <p>
        La resta binaria se realiza de <b>derecha a izquierda</b>.
        Cuando el bit de A no alcanza, se solicita un préstamo a la columna de la izquierda.
      </p>`;

    renderLongSubtraction(result, borrowTop, steps);
    return result;
  }


  function bitCells(text, widthClass = "") {
    return `
      <div class="binary-long-bits ${widthClass}">
        ${text.split("").map(bit => `
          <span class="binary-long-cell ${bit === "1" ? "one" : "zero"}">${bit}</span>
        `).join("")}
      </div>`;
  }


  function arithmeticCells(bits, special = []) {
    return bits.map((bit, index) => {
      const extra = special[index] ? ` ${special[index]}` : "";
      const base = bit === "1" ? "one" : "zero";
      return `<span class="binary-arithmetic-cell ${base}${extra}">${bit}</span>`;
    }).join("");
  }

  function renderLongAddition(result, carryTop, steps) {
    const aText = asText(calcState.a);
    const bText = asText(calcState.b);
    const resultText = asText(result);

    const carryText = carryTop.map(value => value === null ? "" : String(value));
    const carryClasses = carryTop.map(value => value === 1 ? "carry" : "");

    calcElements.longOperation.hidden = false;
    calcElements.longOperation.innerHTML = `
      <div class="binary-long-title">Suma binaria vertical</div>

      <div class="binary-long-scroll">
        <div class="binary-arithmetic-board">

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">Acarreo</div>
            <div class="binary-arithmetic-symbol"></div>
            ${carryText.map((value, index) =>
              `<span class="binary-arithmetic-cell ${carryClasses[index]}">${value}</span>`
            ).join("")}
          </div>

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">A</div>
            <div class="binary-arithmetic-symbol"></div>
            ${arithmeticCells(aText.split(""))}
          </div>

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">B</div>
            <div class="binary-arithmetic-symbol">+</div>
            ${arithmeticCells(bText.split(""))}
          </div>

          <div class="binary-arithmetic-line"></div>

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">Resultado</div>
            <div class="binary-arithmetic-symbol"></div>
            ${arithmeticCells(resultText.split(""))}
          </div>
        </div>
      </div>

      <div class="binary-step-cards">
        ${steps.map(step => `
          <div class="binary-step-card">
            <strong>Columna ${step.position}:</strong>
            ${step.a} + ${step.b} + acarreo ${step.incoming}
            = ${step.total}.
            Se escribe <b>${step.result}</b>.
            <span class="movement">
              ${step.carry
                ? "Se envía acarreo 1 a la columna de la izquierda."
                : "No se genera acarreo."}
            </span>
          </div>
        `).join("")}
      </div>

      <div class="binary-arithmetic-caption">
        La operación se resuelve desde el bit menos significativo hacia la izquierda.
      </div>`;
  }

  function renderLongSubtraction(result, borrowTop, steps) {
    const aText = asText(calcState.a);
    const bText = asText(calcState.b);
    const resultText = asText(result);

    const borrowText = borrowTop.map(value => value === null ? "" : String(value));
    const borrowClasses = borrowTop.map(value => value === 1 ? "carry" : "");

    calcElements.longOperation.hidden = false;
    calcElements.longOperation.innerHTML = `
      <div class="binary-long-title">Resta binaria vertical</div>

      <div class="binary-long-scroll">
        <div class="binary-arithmetic-board">

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">Préstamo</div>
            <div class="binary-arithmetic-symbol"></div>
            ${borrowText.map((value, index) =>
              `<span class="binary-arithmetic-cell ${borrowClasses[index]}">${value}</span>`
            ).join("")}
          </div>

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">A</div>
            <div class="binary-arithmetic-symbol"></div>
            ${arithmeticCells(aText.split(""))}
          </div>

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">B</div>
            <div class="binary-arithmetic-symbol">−</div>
            ${arithmeticCells(bText.split(""))}
          </div>

          <div class="binary-arithmetic-line"></div>

          <div class="binary-arithmetic-row">
            <div class="binary-arithmetic-label">Resultado</div>
            <div class="binary-arithmetic-symbol"></div>
            ${arithmeticCells(resultText.split(""))}
          </div>
        </div>
      </div>

      <div class="binary-step-cards">
        ${steps.map(step => `
          <div class="binary-step-card">
            <strong>Columna ${step.position}:</strong>
            A=${step.originalA},
            B=${step.b},
            préstamo entrante=${step.incomingBorrow}.
            ${
              step.borrow
                ? `Como no alcanza, se toma prestado: el bit actual se trata como ${step.adjustedA}.`
                : `No es necesario pedir prestado.`
            }
            Se escribe <b>${step.result}</b>.
            <span class="movement">
              ${step.borrow
                ? "El préstamo continúa hacia la columna de la izquierda."
                : "No continúa préstamo."}
            </span>
          </div>
        `).join("")}
      </div>

      <div class="binary-arithmetic-caption">
        En binario, pedir prestado equivale a sumar 10₂ en la columna actual.
      </div>`;
  }

  function renderLongMultiplication() {
    const aValue = toDecimal(calcState.a);
    const bValue = toDecimal(calcState.b);
    const product = aValue * bValue;

    const aText = asText(calcState.a);
    const bText = asText(calcState.b);
    const productText = product.toString(2).padStart(32, "0").slice(-32);

    const partials = [];
    for (let shift = 0; shift < CALC_BITS; shift++) {
      const multiplierBit = calcState.b[CALC_BITS - 1 - shift];
      if (multiplierBit === 1) {
        const partialValue = aValue * (2 ** shift);
        partials.push({
          shift,
          bit: 1,
          text: partialValue.toString(2).padStart(32, "0").slice(-32)
        });
      } else {
        partials.push({
          shift,
          bit: 0,
          text: "0".repeat(32)
        });
      }
    }

    calcElements.longOperation.hidden = false;
    calcElements.longOperation.innerHTML = `
      <div class="binary-long-title">Multiplicación binaria por productos parciales</div>
      <div class="binary-long-scroll">
        <div class="binary-long-grid">
          <div class="binary-long-line">
            <div class="binary-long-label">A (${aValue})</div>
            ${bitCells(aText.padStart(32, "0"))}
          </div>
          <div class="binary-long-line">
            <div class="binary-long-label">B (${bValue})</div>
            ${bitCells(bText.padStart(32, "0"))}
          </div>
          <div class="binary-long-separator"></div>
          ${partials.map(row => `
            <div class="binary-long-line">
              <div class="binary-long-label">
                bit ${row.shift} de B = ${row.bit}
              </div>
              ${bitCells(row.text)}
            </div>
          `).join("")}
          <div class="binary-long-separator"></div>
          <div class="binary-long-line">
            <div class="binary-long-label">Producto</div>
            ${bitCells(productText)}
          </div>
        </div>
      </div>
      <div class="binary-long-note">
        Cada bit 1 del multiplicador genera una copia de A desplazada a la izquierda.
        Después se suman todos los productos parciales.
        Producto decimal completo: <b>${product}</b>.
        La fila Resultado de la calculadora conserva los 16 bits inferiores.
      </div>`;
  }

  function doMultiplication() {
    const aValue = toDecimal(calcState.a);
    const bValue = toDecimal(calcState.b);
    const product = aValue * bValue;
    const result = toBits(product, CALC_BITS);

    renderCarry(Array(CALC_BITS).fill(null), "Productos parciales");

    calcElements.explanation.innerHTML = `
      <p>
        La multiplicación binaria funciona como la multiplicación decimal,
        pero cada dígito del multiplicador solo puede ser <b>0</b> o <b>1</b>.
      </p>
      <ol>
        <li>Se revisa B desde el bit menos significativo hacia la izquierda.</li>
        <li>Si el bit de B es 1, se toma A y se desplaza según la posición de ese bit.</li>
        <li>Si el bit de B es 0, el producto parcial de esa fila es 0.</li>
        <li>Finalmente se suman todos los productos parciales.</li>
      </ol>`;

    renderLongMultiplication();
    return result;
  }

  function renderLongDivision(dividend, divisor, quotient, remainder, steps) {
    const dividendText = dividend.toString(2).padStart(16, "0");
    const divisorText = divisor.toString(2).padStart(16, "0");
    const quotientText = quotient.toString(2).padStart(16, "0");

    calcElements.longOperation.hidden = false;
    calcElements.longOperation.innerHTML = `
      <div class="binary-long-title">División binaria paso a paso</div>

      <div class="binary-long-scroll">
        <div class="binary-long-grid">
          <div class="binary-long-line">
            <div class="binary-long-label">Dividendo</div>
            ${bitCells(dividendText, "bits-16")}
          </div>

          <div class="binary-long-line">
            <div class="binary-long-label">Divisor</div>
            ${bitCells(divisorText, "bits-16")}
          </div>

          <div class="binary-long-separator"></div>

          <div class="binary-long-line">
            <div class="binary-long-label">Cociente</div>
            ${bitCells(quotientText, "bits-16")}
          </div>
        </div>

        <table class="binary-division-table">
          <thead>
            <tr>
              <th>Paso</th>
              <th>Bit que baja</th>
              <th>Residuo antes</th>
              <th>¿Cabe divisor?</th>
              <th>Bit cociente</th>
              <th>Residuo después</th>
            </tr>
          </thead>
          <tbody>
            ${steps.map(step => `
              <tr>
                <td>${step.step}</td>
                <td>${step.bit}</td>
                <td><code>${step.beforeBinary}</code> (${step.before})</td>
                <td>${step.fits ? "Sí" : "No"}</td>
                <td><b>${step.qbit}</b></td>
                <td><code>${step.afterBinary}</code> (${step.after})</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div class="binary-long-note">
        Resultado: <b>${dividend} ÷ ${divisor} = ${quotient}</b>
        con residuo <b>${remainder}</b>.
      </div>`;
  }

  function doDivision() {
    const dividend = toDecimal(calcState.a);
    const divisor = toDecimal(calcState.b);

    renderCarry(Array(CALC_BITS).fill(null), "División larga");

    if (divisor === 0) {
      calcElements.explanation.innerHTML = `
        <p><b>No se puede dividir entre cero.</b></p>
        <p>Cambia el Número 2 para que sea distinto de 0.</p>`;
      calcElements.longOperation.hidden = true;
      return Array(CALC_BITS).fill(0);
    }

    let remainder = 0;
    let quotient = 0;
    const steps = [];

    for (let index = 0; index < CALC_BITS; index++) {
      const bit = calcState.a[index];
      remainder = (remainder * 2) + bit;
      const before = remainder;
      const fits = remainder >= divisor;
      let qbit = 0;

      if (fits) {
        remainder -= divisor;
        qbit = 1;
      }

      quotient = (quotient * 2) + qbit;

      steps.push({
        step: index + 1,
        bit,
        before,
        after: remainder,
        fits,
        qbit,
        beforeBinary: before.toString(2),
        afterBinary: remainder.toString(2)
      });
    }

    calcElements.explanation.innerHTML = `
      <p>
        La división binaria se resuelve de izquierda a derecha, de forma semejante
        a una división larga:
      </p>
      <ol>
        <li>Se baja un bit del dividendo.</li>
        <li>Se compara el residuo parcial con el divisor.</li>
        <li>Si el divisor cabe, se escribe 1 en el cociente y se resta.</li>
        <li>Si no cabe, se escribe 0 y se baja el siguiente bit.</li>
      </ol>`;

    renderLongDivision(dividend, divisor, quotient, remainder, steps);
    return toBits(quotient, CALC_BITS);
  }

  function executeOperation(operation) {
    let result = Array(CALC_BITS).fill(0);
    let name = "";

    calcElements.longOperation.hidden = true;
    calcElements.longOperation.innerHTML = "";

    if (operation === "sum") {
      name = "A + B";
      result = doSum();
    }

    if (operation === "sub") {
      name = "A − B";
      result = doSubtraction();
    }

    if (operation === "and") {
      name = "A AND B";
      result = calcState.a.map((bit, index) => bit & calcState.b[index]);
      renderCarry(Array(CALC_BITS).fill(null), "Sin acarreo");
      explainLogical("AND", "AND", result);
    }

    if (operation === "or") {
      name = "A OR B";
      result = calcState.a.map((bit, index) => bit | calcState.b[index]);
      renderCarry(Array(CALC_BITS).fill(null), "Sin acarreo");
      explainLogical("OR", "OR", result);
    }

    if (operation === "xor") {
      name = "A XOR B";
      result = calcState.a.map((bit, index) => bit ^ calcState.b[index]);
      renderCarry(Array(CALC_BITS).fill(null), "Sin acarreo");
      explainLogical("XOR", "XOR", result);
    }

    if (operation === "mul") {
      name = "A × B";
      result = doMultiplication();
    }

    if (operation === "div") {
      name = "A ÷ B";
      result = doDivision();
    }

    if (operation === "not-a") {
      name = "NOT A";
      result = calcState.a.map((bit) => bit ? 0 : 1);
      renderCarry(Array(CALC_BITS).fill(null), "Sin acarreo");

      calcElements.explanation.innerHTML = `
        <p>
          <b>NOT</b> invierte cada bit del número A:
          todo 0 se convierte en 1 y todo 1 se convierte en 0.
        </p>
        <div class="binary-column-step">
          <div class="step-bit">A</div>
          <div>${asText(calcState.a)}</div>
        </div>
        <div class="binary-column-step">
          <div class="step-bit">NOT A</div>
          <div>${asText(result)}</div>
        </div>`;
    }

    calcElements.operationName.textContent = name;
    renderResult(result);
  }

  document.addEventListener("click", (event) => {
    const bitButton = event.target.closest("[data-bit-group][data-bit-index]");

    if (bitButton) {
      const group = bitButton.dataset.bitGroup;
      const index = Number(bitButton.dataset.bitIndex);

      calcState[group][index] = calcState[group][index] ? 0 : 1;
      renderEditableBits(group);
      return;
    }

    const operationButton = event.target.closest("[data-binary-operation]");

    if (operationButton) {
      executeOperation(operationButton.dataset.binaryOperation);
      return;
    }

    if (event.target.closest("[data-binary-clear]")) {
      calcState.a.fill(0);
      calcState.b.fill(0);
      renderEditableBits("a");
      renderEditableBits("b");
      renderResult(Array(CALC_BITS).fill(0));
      renderCarry(Array(CALC_BITS).fill(null), "Acarreo / préstamo");
      calcElements.operationName.textContent = "—";
      calcElements.explanation.textContent =
        "Selecciona una operación para mostrar el desarrollo paso a paso.";
      calcElements.longOperation.hidden = true;
      calcElements.longOperation.innerHTML = "";
      return;
    }

    const shiftBit = event.target.closest("[data-shift-bit-index]");

    if (shiftBit) {
      const index = Number(shiftBit.dataset.shiftBitIndex);
      shiftState[index] = shiftState[index] ? 0 : 1;
      renderShiftSource();
      return;
    }

    const shiftButton = event.target.closest("[data-shift-direction]");

    if (shiftButton) {
      performShift(shiftButton.dataset.shiftDirection);
      return;
    }

    if (event.target.closest("[data-shift-clear]")) {
      shiftState = Array(SHIFT_BITS).fill(0);
      renderShiftSource();
      renderShiftResult(shiftState);
      document.getElementById("shift-lost-bits").textContent = "—";
      document.getElementById("shift-explanation").textContent =
        "Realiza un desplazamiento para ver qué bits se movieron, cuáles se perdieron y qué nuevo número se formó.";
    }
  });

  const shiftElements = {
    decimalInput: document.getElementById("shift-decimal-input"),
    countInput: document.getElementById("shift-count-input"),
    sourceBits: document.getElementById("shift-source-bits"),
    sourceDecimal: document.getElementById("shift-source-decimal"),
    sourceText: document.getElementById("shift-source-text"),
    resultBits: document.getElementById("shift-result-bits"),
    resultDecimal: document.getElementById("shift-result-decimal"),
    resultText: document.getElementById("shift-result-text"),
    lostBits: document.getElementById("shift-lost-bits"),
    explanation: document.getElementById("shift-explanation")
  };

  function renderShiftSource() {
    shiftElements.sourceBits.innerHTML = "";

    shiftState.forEach((bit, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `shift-bit-button${bit ? " is-one" : ""}`;
      button.textContent = bit;
      button.dataset.shiftBitIndex = index;
      button.setAttribute(
        "aria-label",
        `Cambiar bit ${SHIFT_BITS - 1 - index}, valor actual ${bit}`
      );
      shiftElements.sourceBits.appendChild(button);
    });

    const decimal = toDecimal(shiftState);
    shiftElements.sourceDecimal.textContent = decimal;
    shiftElements.sourceText.textContent = asText(shiftState);
    shiftElements.decimalInput.value = decimal;
  }

  function renderShiftResult(bits) {
    shiftElements.resultBits.innerHTML = "";

    bits.forEach((bit) => {
      const box = document.createElement("span");
      box.className = "shift-result-bit";
      box.textContent = bit;
      shiftElements.resultBits.appendChild(box);
    });

    shiftElements.resultDecimal.textContent = toDecimal(bits);
    shiftElements.resultText.textContent = asText(bits);
  }

  function performShift(direction) {
    const count = Math.min(
      Math.max(Number(shiftElements.countInput.value) || 0, 0),
      SHIFT_BITS - 1
    );

    const original = [...shiftState];
    let result;
    let lost;

    if (direction === "left") {
      lost = original.slice(0, count);
      result = original.slice(count).concat(Array(count).fill(0));
    } else {
      lost = original.slice(SHIFT_BITS - count);
      result = Array(count).fill(0).concat(original.slice(0, SHIFT_BITS - count));
    }

    shiftElements.lostBits.textContent =
      count === 0 ? "Ninguno" : lost.join("");

    renderShiftResult(result);

    const originalDecimal = toDecimal(original);
    const resultDecimal = toDecimal(result);
    const power = 2 ** count;

    shiftElements.explanation.innerHTML = `
      <p>
        Se realizó un desplazamiento lógico de <b>${count}</b>
        ${count === 1 ? "posición" : "posiciones"} hacia
        <b>${direction === "left" ? "la izquierda" : "la derecha"}</b>.
      </p>

      <ol>
        <li>
          Cadena original:
          <code>${asText(original)}</code>
          = <b>${originalDecimal}</b> en decimal.
        </li>

        <li>
          Los bits que salieron de la cadena fueron:
          <code>${count === 0 ? "ninguno" : lost.join("")}</code>.
        </li>

        <li>
          Las posiciones vacías se rellenaron con ceros.
        </li>

        <li>
          Cadena resultante:
          <code>${asText(result)}</code>
          = <b>${resultDecimal}</b> en decimal.
        </li>

        <li>
          Interpretación matemática:
          ${
            direction === "left"
              ? `${originalDecimal} × 2<sup>${count}</sup> = ${originalDecimal * power}. `
              : `${originalDecimal} ÷ 2<sup>${count}</sup> = ${Math.floor(originalDecimal / power)} considerando división entera. `
          }
          ${
            direction === "left" && originalDecimal * power > SHIFT_MAX
              ? `Como trabajamos únicamente con ${SHIFT_BITS} bits, los bits que excedieron el ancho fueron descartados.`
              : ""
          }
        </li>
      </ol>`;
  }

  document.getElementById("shift-load-decimal").addEventListener("click", () => {
    let value = Number(shiftElements.decimalInput.value);

    if (!Number.isInteger(value)) {
      value = 0;
    }

    value = Math.min(Math.max(value, 0), SHIFT_MAX);
    shiftState = toBits(value, SHIFT_BITS);
    renderShiftSource();
    renderShiftResult(shiftState);
    shiftElements.lostBits.textContent = "—";
    shiftElements.explanation.textContent =
      "Número convertido a 23 bits. Selecciona ahora el desplazamiento.";
  });

  calcState.a = toBits(5, CALC_BITS);
  calcState.b = toBits(3, CALC_BITS);

  renderEditableBits("a");
  renderEditableBits("b");
  renderResult(Array(CALC_BITS).fill(0));
  renderCarry(Array(CALC_BITS).fill(null), "Acarreo / préstamo");

  shiftState = toBits(5, SHIFT_BITS);
  renderShiftSource();
  renderShiftResult(shiftState);
});
