(() => {
  "use strict";

  function configurarBusqueda() {
    const input = document.getElementById("bibliografiaSearch");
    const count = document.getElementById("bibliografiaCount");
    const empty = document.getElementById("bibliografiaEmpty");
    const cards = [...document.querySelectorAll("[data-book]")];

    if (!input || !count) return;

    const filtrar = () => {
      const query = input.value.trim().toLocaleLowerCase("es");
      let visibles = 0;

      cards.forEach((card) => {
        const texto = (card.dataset.title || card.textContent)
          .toLocaleLowerCase("es");

        const mostrar = !query || texto.includes(query);
        card.hidden = !mostrar;

        if (mostrar) visibles++;
      });

      count.textContent = visibles;
      if (empty) empty.hidden = visibles !== 0;
    };

    input.addEventListener("input", filtrar);
    filtrar();
  }

  document.addEventListener("DOMContentLoaded", configurarBusqueda);
})();
