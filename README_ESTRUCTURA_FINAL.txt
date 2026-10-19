SITIO ESTRUCTURAS DE DATOS · VERSION ORGANIZADA

ESTRUCTURA PRINCIPAL
- index.html
- pages/                 Páginas académicas canónicas
- styles/site.css        CSS consolidado del sitio
- scripts/site.js        JS común e interactividad académica
- scripts/activities.js  Lógica exclusiva de actividades/admin
- images/                Imágenes raster en WebP
- images/mini/           Miniaturas WebP de infografías
- data/                  Datos JSON
- codigo/                Código C de apoyo
- components/            Header, footer y ficha del curso
- videos/                Videos MP4 opcionales
- presentaciones/        Presentaciones PDF opcionales

MULTIMEDIA
Editar data/recursos_multimedia.json. Cada tema admite una presentación y hasta dos videos.
Para videos locales use: {"type":"mp4","src":"videos/archivo.mp4","title":"Título"}.
Para YouTube use una URL de EMBED: {"type":"youtube","src":"https://www.youtube.com/embed/ID","title":"Título"}.

REGLA DE LIMPIEZA
Las páginas cargan Bootstrap + styles/site.css y scripts/site.js.
Actividades/admin/detalle cargan además scripts/activities.js.
No hay bloques <style> ni CSS inline en las páginas canónicas.
