SITIO ESTRUCTURAS DE DATOS · UABC FIAD · CLAVE 40007

1. Abra la carpeta completa en VS Code y use Live Server para cargar los componentes maestros.
2. El índice ofrece siete temas numerados 0–6. Cada página de contenido ofrece una casita discreta arriba para regresar a Inicio y botones verdes Anterior / Inicio / Siguiente al final. Las actividades enlazan solo ejercicios disponibles.
3. Los temas 4 (Árboles), 5 (Prioridad y Montones) y 6 (Tablas Hash) tienen páginas con la misma estructura pedagógica.
4. Las 15 actividades se administran desde admin.html y sus estados se guardan en data/actividades.json.
5. Bibliografía, infografías y el ejemplo de lista simple en C son recursos públicos del sitio.
6. El menú Inicio / Actividades / Bibliografía está bajo el encabezado; en móvil se abre con Menú. En los temas, Anterior y Siguiente permanecen fijos al pie. La lógica está en scripts/layout.js y los estilos en styles/styles.css.
7. El Worker de Cloudflare ya desplegado publica cambios mediante GitHub. El repositorio actual no incluye su código; este ZIP tampoco modifica el Worker ni sus secretos.

Antes de sustituir archivos en su repositorio local, haga Fetch/Pull origin en GitHub Desktop y termine cualquier merge pendiente. Luego copie este paquete, revise los cambios, haga commit y push. Si edita actividades desde Admin, actualice primero su copia local con los commits publicados antes de copiar archivos o hacer push.
