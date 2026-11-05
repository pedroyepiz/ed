document.addEventListener("DOMContentLoaded", () => {
  const DATA_URL = "../data/preguntas_estructuras.json";
  const QUESTIONS_PER_ATTEMPT = 10;

  const topicGrid = document.getElementById("quiz-topic-grid");
  const panel = document.getElementById("quiz-panel");
  const form = document.getElementById("quiz-form");
  const questionsContainer = document.getElementById("quiz-questions");
  const currentTopicTitle = document.getElementById("quiz-current-topic");
  const currentMeta = document.getElementById("quiz-current-meta");
  const progressLabel = document.getElementById("quiz-progress-label");
  const progressBar = document.getElementById("quiz-progress-bar");
  const result = document.getElementById("quiz-result");
  const scoreNumber = document.getElementById("quiz-score-number");
  const resultTitle = document.getElementById("quiz-result-title");
  const resultText = document.getElementById("quiz-result-text");
  const newAttemptButton = document.getElementById("quiz-new-attempt");
  const changeTopicButton = document.getElementById("quiz-change-topic");
  const loadError = document.getElementById("quiz-load-error");

  let bank = null;
  let currentTopicKey = null;
  let currentQuestions = [];
  let checked = false;

  function shuffle(items) {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderTopicCards() {
    topicGrid.innerHTML = "";

    Object.entries(bank).forEach(([key, topic]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-topic-card";
      button.dataset.topic = key;

      button.innerHTML = `
        <div class="quiz-topic-card-main">
          <div class="quiz-topic-icon" aria-hidden="true">${escapeHtml(topic.icono || "❓")}</div>
          <div class="quiz-topic-label">CUESTIONARIO</div>
          <h3>${escapeHtml(topic.titulo)}</h3>
          <p>Responde 10 preguntas y comprueba tu dominio del tema.</p>
        </div>
        <span class="quiz-topic-start">Comenzar <span aria-hidden="true">→</span></span>
      `;

      button.addEventListener("click", () => startTopic(key));
      topicGrid.appendChild(button);
    });
  }

  function startTopic(key) {
    const topic = bank[key];
    if (!topic) return;

    currentTopicKey = key;
    currentQuestions = shuffle(topic.preguntas)
      .slice(0, QUESTIONS_PER_ATTEMPT)
      .map((question) => ({
        ...question,
        opcionesMostradas: shuffle(question.opciones)
      }));

    checked = false;
    result.classList.add("d-none");
    currentTopicTitle.textContent = topic.titulo;
    currentMeta.textContent = `Cuestionario de ${QUESTIONS_PER_ATTEMPT} preguntas`;
    renderQuestions();

    panel.classList.remove("d-none");
    panel.scrollIntoView({behavior: "smooth", block: "start"});

    const url = new URL(window.location.href);
    url.searchParams.set("tema", key);
    history.replaceState(null, "", url);
  }

  function renderQuestions() {
    questionsContainer.innerHTML = "";

    currentQuestions.forEach((question, index) => {
      const article = document.createElement("article");
      article.className = "quiz-question";
      article.dataset.questionId = question.id;

      const header = document.createElement("div");
      header.className = "quiz-question-header";
      header.innerHTML = `
        <div class="quiz-question-number" aria-label="Pregunta ${index + 1}">${index + 1}</div>
        <div class="quiz-question-heading">
          <span class="quiz-question-kicker">PREGUNTA ${index + 1}</span>
          <h3 class="quiz-question-title">${escapeHtml(question.pregunta)}</h3>
        </div>
      `;
      article.appendChild(header);

      if (question.codigo) {
        const media = document.createElement("div");
        media.className = "quiz-question-media";

        const pre = document.createElement("pre");
        pre.className = "quiz-code";
        pre.textContent = question.codigo;

        media.appendChild(pre);
        article.appendChild(media);
      }

      if (question.imagen) {
        const media = document.createElement("div");
        media.className = "quiz-question-media";

        const img = document.createElement("img");
        img.src = question.imagen;
        img.alt = `Imagen de apoyo para la pregunta ${index + 1}`;
        img.loading = "lazy";
        img.addEventListener("error", () => {
          media.remove();
        });

        media.appendChild(img);
        article.appendChild(media);
      }

      const options = document.createElement("div");
      options.className = "quiz-options";

      question.opcionesMostradas.forEach((option, optionIndex) => {
        const label = document.createElement("label");
        label.className = "quiz-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = `question-${question.id}`;
        input.value = option;
        input.id = `question-${question.id}-option-${optionIndex}`;

        const text = document.createElement("span");
        text.className = "quiz-option-text";
        text.textContent = option;

        label.append(input, text);
        options.appendChild(label);
      });

      article.appendChild(options);

      const feedback = document.createElement("div");
      feedback.className = "quiz-feedback";
      feedback.innerHTML = `
        <strong>Respuesta correcta:</strong>
        <span class="quiz-correct-answer"></span>
        <br>
        <span class="quiz-explanation"></span>
      `;
      article.appendChild(feedback);

      questionsContainer.appendChild(article);
    });

    form.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", updateProgress);
    });

    updateProgress();
  }

  function updateProgress() {
    const answered = currentQuestions.filter((question) => {
      return form.querySelector(`input[name="question-${question.id}"]:checked`);
    }).length;

    progressLabel.textContent = `${answered} / ${QUESTIONS_PER_ATTEMPT}`;
    progressBar.style.width = `${(answered / QUESTIONS_PER_ATTEMPT) * 100}%`;
  }

  function checkAnswers(event) {
    event.preventDefault();

    if (checked) {
      result.scrollIntoView({behavior: "smooth", block: "center"});
      return;
    }

    const unanswered = currentQuestions.filter((question) => {
      return !form.querySelector(`input[name="question-${question.id}"]:checked`);
    });

    if (unanswered.length) {
      const firstMissing = questionsContainer.querySelector(
        `[data-question-id="${unanswered[0].id}"]`
      );

      firstMissing?.scrollIntoView({behavior: "smooth", block: "center"});
      firstMissing?.classList.add("incorrect");

      setTimeout(() => firstMissing?.classList.remove("incorrect"), 900);

      alert(`Faltan ${unanswered.length} pregunta(s) por contestar.`);
      return;
    }

    checked = true;
    let correctCount = 0;

    currentQuestions.forEach((question) => {
      const article = questionsContainer.querySelector(
        `[data-question-id="${question.id}"]`
      );

      const selected = form.querySelector(
        `input[name="question-${question.id}"]:checked`
      );

      const labels = [...article.querySelectorAll(".quiz-option")];

      labels.forEach((label) => {
        const input = label.querySelector("input");
        input.disabled = true;

        if (input.value === question.correcta) {
          label.classList.add("correct-answer");
        }

        if (input.checked && input.value !== question.correcta) {
          label.classList.add("user-wrong");
        }
      });

      const isCorrect = selected.value === question.correcta;

      if (isCorrect) {
        correctCount++;
        article.classList.add("correct");
      } else {
        article.classList.add("incorrect");
      }

      const feedback = article.querySelector(".quiz-feedback");
      feedback.querySelector(".quiz-correct-answer").textContent = question.correcta;
      feedback.querySelector(".quiz-explanation").textContent = question.explicacion;
      feedback.classList.add("visible");
    });

    const score = correctCount * 10;
    scoreNumber.textContent = score;
    resultTitle.textContent = `${correctCount} de ${QUESTIONS_PER_ATTEMPT} correctas`;

    let message = "";

    if (score >= 90) {
      message = "Dominio muy sólido del tema.";
    } else if (score >= 80) {
      message = "Buen dominio. Conviene revisar los reactivos incorrectos.";
    } else if (score >= 70) {
      message = "Resultado suficiente, pero todavía hay conceptos por reforzar.";
    } else {
      message = "Conviene repasar el tema y realizar un nuevo intento.";
    }

    resultText.textContent = `${message} Calificación: ${score}/100.`;
    result.classList.remove("d-none");
    result.scrollIntoView({behavior: "smooth", block: "center"});
  }

  function changeTopic() {
    currentTopicKey = null;
    currentQuestions = [];
    checked = false;
    panel.classList.add("d-none");
    result.classList.add("d-none");

    const url = new URL(window.location.href);
    url.searchParams.delete("tema");
    history.replaceState(null, "", url);

    document.getElementById("quiz-topic-title")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  form.addEventListener("submit", checkAnswers);

  newAttemptButton.addEventListener("click", () => {
    if (currentTopicKey) startTopic(currentTopicKey);
  });

  changeTopicButton.addEventListener("click", changeTopic);

  async function init() {
    try {
      const response = await fetch(DATA_URL, {cache: "no-store"});

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      bank = await response.json();
      renderTopicCards();

      const requestedTopic = new URLSearchParams(window.location.search).get("tema");

      if (requestedTopic && bank[requestedTopic]) {
        startTopic(requestedTopic);
      }
    } catch (error) {
      console.error("No fue posible cargar las preguntas:", error);
      loadError.classList.remove("d-none");
    }
  }

  init();
});
