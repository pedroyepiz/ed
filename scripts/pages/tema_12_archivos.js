document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;

      const original = button.innerHTML;
      const text = target.textContent;

      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        const area = document.createElement("textarea");
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }

      button.innerHTML = '<i class="bi bi-check2"></i> Copiado';
      setTimeout(() => button.innerHTML = original, 1400);
    });
  });

  document.querySelectorAll(".quiz-q").forEach((question) => {
    const correct = question.dataset.answer;

    question.querySelectorAll("[data-opt]").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.dataset.opt;
        const feedback = question.querySelector(".quiz-feedback");

        question.querySelectorAll("[data-opt]").forEach((b) => {
          b.disabled = true;
          if (b.dataset.opt === correct) b.classList.add("is-correct");
        });

        if (selected === correct) {
          button.classList.add("is-correct");
          feedback.textContent = "✓ Correcto";
        } else {
          button.classList.add("is-wrong");
          feedback.textContent = "✗ Revisa la sección correspondiente.";
        }
      });
    });
  });
});
