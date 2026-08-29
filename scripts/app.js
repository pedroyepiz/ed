document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".back-home")) return;

  const boton = document.createElement("a");
  boton.className = "back-home";
  boton.href = "index.html";
  boton.title = "Regresar al menú principal";
  boton.setAttribute("aria-label", "Regresar al menú principal");

  const imagen = document.createElement("img");
  imagen.src = "images/cimarron.png";
  imagen.alt = "Cimarroncillo UABC";

  const texto = document.createElement("span");
  texto.textContent = "← Regresar al menú";

  boton.appendChild(imagen);
  boton.appendChild(texto);
  document.body.appendChild(boton);
});
