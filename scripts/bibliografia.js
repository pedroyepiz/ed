(() => {
  "use strict";

  /*
   * BIBLIOGRAFÍA EN GOOGLE DRIVE
   * Cada tarjeta del HTML contiene data-drive-id con el ID del PDF.
   */
  const DRIVE_FOLDER =
    "https://drive.google.com/drive/folders/1FJu34OcEleYsAF8YvTG1nv-RVDH1cnOf?usp=drive_link";

  function viewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`;
  }

  function downloadUrl(fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  function configurarEnlaces() {
    document.querySelectorAll("[data-book]").forEach((card) => {
      const fileId = card.dataset.driveId;
      if (!fileId) return;

      const view = card.querySelector('[data-action="view"]');
      const download = card.querySelector('[data-action="download"]');

      if (view) view.href = viewUrl(fileId);
      if (download) download.href = downloadUrl(fileId);
    });

    const repo = document.querySelector(".repo-btn");
    if (repo) repo.href = DRIVE_FOLDER;
  }

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

  document.addEventListener("DOMContentLoaded", () => {
    configurarEnlaces();
    configurarBusqueda();
  });
})();
