# Estructuras de Datos: actividades y publicación desde cualquier computadora

Se partió del repositorio público `https://github.com/pedroyepiz/ed` (rama `main`). El `index.html` y los temas existentes se conservan; se añadió una tarjeta de Actividades. Las páginas nuevas están en la raíz: `actividades.html`, `detalle.html`, `admin.html`. El archivo `data/actividades.json` contiene los estados de 15 actividades. El panel publica directamente en GitHub mediante un servicio Cloudflare Worker; **no necesita descargar un archivo ni hacer push manual** después de su configuración inicial.

## Estructura relevante

```text
ed/
├── index.html                 (existente; tarjeta agregada)
├── actividades.html           (lista para alumnos)
├── detalle.html              (enunciado y código)
├── admin.html                (panel docente)
├── data/actividades.json     (estados publicados)
├── scripts/{common,actividades,detalle,admin,config}.js
├── styles/actividades.css
├── backend/{worker.js,wrangler.jsonc,.gitignore}
└── páginas, componentes e imágenes originales
```

## Antes de usarlo en línea: configuración inicial

1. Revisa los cambios locales en VS Code, especialmente la nueva tarjeta de `index.html`. Haz un commit y push **una sola vez** para instalar los archivos del sitio en `pedroyepiz/ed`. No subas credenciales a ese repositorio.
2. En GitHub crea un *fine-grained personal access token* limitado **solo** al repositorio `pedroyepiz/ed` y con permiso **Contents: Read and write**. La cuenta propietaria debe mantener ese token vigente; si caduca o se revoca, hay que sustituirlo. No lo escribas en `config.js` ni en este chat.
3. Crea una cuenta de Cloudflare, instala Wrangler en tu computadora y desde la carpeta `backend` ejecuta `npx wrangler login`, luego `npx wrangler secret put GITHUB_TOKEN` (pega el token en el terminal), `npx wrangler secret put ADMIN_PASSWORD` (introduce una contraseña nueva allí) y `npx wrangler deploy`. Si Wrangler pide crear el Worker al poner el primer secreto, acepta. Los secretos se configuran una vez en el servicio; no se publican en GitHub.
4. Copia la URL `https://...workers.dev` que da Cloudflare al desplegar. Escríbela en `scripts/config.js` y haz commit + push de **ese archivo sin secretos**. Esta es la última configuración mediante push.
5. Abre `https://pedroyepiz.github.io/ed/admin.html`, introduce tu contraseña, marca las casillas y pulsa **Publicar en GitHub**. Para verificar, revisa el commit en GitHub y vuelve a abrir `actividades.html` cuando termine el despliegue de Pages.

Para probar el HTML local antes de publicar, abre toda la carpeta en VS Code con Live Server. El panel solo podrá publicar desde `https://pedroyepiz.github.io` por la restricción de origen del Worker. Puedes probar las tarjetas y la navegación localmente. No abras los HTML como `file://`.

## Qué controla cada casilla

- **Visible** muestra la tarjeta.
- **Ver actividad** permite abrir el enunciado, si la tarjeta está visible.
- **Ver código** permite ver el bloque de código, si la tarjeta está visible. Puede liberarse aparte del enunciado.

El panel solicita la contraseña de nuevo al pulsar Publicar. El Worker comprueba la clave y obtiene la versión actual del archivo en GitHub; solo cambia esas tres banderas por actividad y crea el commit sobre `main`. Si otra persona modificó el JSON mientras publicabas, GitHub puede rechazar el cambio y deberás recargar la versión publicada.

## Completar las 15 actividades

Los doce títulos en `data/actividades.json` y los textos de `scripts/detalle.js` son **material de muestra**. Sustituye los enunciados y programas por tu contenido definitivo antes de liberarlos. Los archivos del repositorio público, incluido `detalle.js`, pueden verse aunque el botón aparezca bloqueado: la casilla controla la presentación, **no protege respuestas confidenciales**. Si quieres reservar las soluciones hasta su liberación, habrá que guardar esos archivos en otro servicio o agregarlos al repositorio únicamente cuando se publiquen.

La contraseña anterior compartida en la conversación no se incluye en ningún archivo. Elige otra al configurar `ADMIN_PASSWORD`. GitHub Pages no aloja el Worker; su despliegue requiere una cuenta Cloudflare y autorización del titular del repositorio.
