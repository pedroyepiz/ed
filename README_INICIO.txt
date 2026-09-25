SITIO ESTRUCTURAS DE DATOS · UABC FIAD · CLAVE 40007

1. Abra la carpeta completa en VS Code y use Live Server para cargar los componentes maestros.
2. El índice ofrece siete temas numerados 0–6. El antiguo Tema 7 se sustituyó por la sección Actividades.
3. Los temas 4 (Árboles), 5 (Prioridad y Montones) y 6 (Tablas Hash) tienen páginas con la misma estructura pedagógica.
4. Las 15 actividades se administran desde admin.html y sus estados se guardan en data/actividades.json.
5. Bibliografía, infografías y el ejemplo de lista simple en C son recursos públicos del sitio.
6. El menú fijo del pie se genera directamente mediante scripts/layout.js y se diseña en styles/styles.css. En móvil pulse Menú; en los temas principales use Anterior y Siguiente.
7. El Worker de Cloudflare ya desplegado publica cambios mediante GitHub. El repositorio actual no incluye su código; este ZIP tampoco modifica el Worker ni sus secretos.

Antes de sustituir archivos en su repositorio local, haga Fetch/Pull origin en GitHub Desktop y termine cualquier merge pendiente. Luego copie este paquete, revise los cambios, haga commit y push. Si edita actividades desde Admin, actualice primero su copia local con los commits publicados antes de copiar archivos o hacer push.
