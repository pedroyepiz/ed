SITIO ESTRUCTURAS DE DATOS · UABC FIAD · CLAVE 40007

1. Abra la carpeta completa en VS Code y use Live Server para cargar los componentes maestros.
2. El índice ofrece siete temas numerados 0–6. El antiguo Tema 7 se sustituyó por la sección Actividades.
3. Los temas 4 (Árboles), 5 (Prioridad y Montones) y 6 (Tablas Hash) tienen páginas con la misma estructura pedagógica.
4. Las 15 actividades se administran desde admin.html y sus estados se guardan en data/actividades.json.
5. Bibliografía, infografías y el ejemplo de lista simple en C son recursos públicos del sitio.
6. La navegación global reside en components/header.html; estilos en styles/styles.css.
7. El Worker de backend/worker.js publica cambios de actividades mediante GitHub; sus secretos se configuran en Cloudflare.

Antes de sustituir archivos en su repositorio local, haga Fetch/Pull origin en GitHub Desktop y termine cualquier merge pendiente. Luego copie este paquete, revise los cambios, haga commit y push. No incluya la carpeta backend/.wrangler/ en el commit.
