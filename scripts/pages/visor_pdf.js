(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);

  const fileId = (params.get("id") || "").trim();
  const titulo = (params.get("titulo") || "Consulta de bibliografía").trim();
  const autor = (params.get("autor") || "Material bibliográfico del curso").trim();

  const visor = document.getElementById("pdfViewer");
  const shell = document.getElementById("pdfViewerShell");
  const loading = document.getElementById("pdfLoading");

  const visorTitulo = document.getElementById("visorTitulo");
  const visorAutor = document.getElementById("visorAutor");
  const toolbarTitulo = document.getElementById("toolbarTitulo");

  const btnDrive = document.getElementById("btnAbrirDrive");
  const btnDownload = document.getElementById("btnDescargarPdf");
  const btnReload = document.getElementById("btnRecargar");
  const btnFullscreen = document.getElementById("btnPantallaCompleta");

  function mostrarError(mensaje) {
    if (!loading) return;

    loading.innerHTML = `
      <div class="pdf-error-icon">
        <i class="bi bi-exclamation-triangle-fill"></i>
      </div>
      <strong>No se pudo abrir el documento</strong>
      <span>${mensaje}</span>
      <a href="bibliografia.html" class="error-back-btn">
        <i class="bi bi-arrow-left"></i>
        Regresar a Bibliografía
      </a>
    `;
  }

  function configurarDocumento() {
    visorTitulo.textContent = titulo;
    toolbarTitulo.textContent = titulo;
    visorAutor.textContent = autor;

    document.title = `${titulo} · Biblioteca · Programación Estructurada`;

    if (!fileId) {
      if (visor) visor.hidden = true;
      mostrarError("No se recibió el identificador del PDF.");
      return;
    }

    const previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
    const driveUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

    visor.src = previewUrl;
    btnDrive.href = driveUrl;
    btnDownload.href = downloadUrl;

    visor.addEventListener("load", () => {
      if (loading) loading.classList.add("is-hidden");
      visor.classList.add("is-ready");
    });
  }

  function recargarVisor() {
    if (!fileId || !visor) return;
    if (loading) loading.classList.remove("is-hidden");

    const actual = visor.src;
    visor.src = "about:blank";

    window.setTimeout(() => {
      visor.src = actual;
    }, 80);
  }

  async function pantallaCompleta() {
    if (!shell) return;

    try {
      if (!document.fullscreenElement) {
        await shell.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("No fue posible activar pantalla completa.", error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    configurarDocumento();

    if (btnReload) {
      btnReload.addEventListener("click", recargarVisor);
    }

    if (btnFullscreen) {
      btnFullscreen.addEventListener("click", pantallaCompleta);
    }

    document.addEventListener("fullscreenchange", () => {
      if (!btnFullscreen) return;

      btnFullscreen.innerHTML = document.fullscreenElement
        ? '<i class="bi bi-fullscreen-exit"></i> Salir de pantalla completa'
        : '<i class="bi bi-arrows-fullscreen"></i> Pantalla completa';
    });
  });
})();
