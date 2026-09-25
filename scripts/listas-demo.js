(() => {
  const values = [];
  const input = document.getElementById('demo-valor');
  const visual = document.getElementById('demo-lista');
  const status = document.getElementById('demo-estado');
  if (!input || !visual || !status) return;
  function render(message) {
    visual.replaceChildren();
    for (const value of values) {
      const node = document.createElement('span');
      node.className = 'ed-list-node';
      node.textContent = String(value);
      visual.append(node);
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      visual.append(arrow);
    }
    const end = document.createElement('strong');
    end.textContent = 'NULL';
    visual.append(end);
    visual.setAttribute('aria-label', values.length ? `Lista: ${values.join(', ')}; termina en NULL` : 'Lista vacía; cabeza apunta a NULL');
    status.textContent = message;
  }
  document.querySelectorAll('[data-list-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.listAction;
    if (action === 'limpiar') { values.length = 0; render('Lista vacía.'); return; }
    if (action === 'eliminar') { const removed = values.shift(); render(removed === undefined ? 'La lista ya está vacía.' : `Se eliminó el primer nodo: ${removed}.`); return; }
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < -999 || value > 999 || input.value.trim() === '') { status.textContent = 'Escribe un entero entre -999 y 999.'; input.focus(); return; }
    if (values.length >= 8) { status.textContent = 'Límite visual de ocho nodos. Elimina uno para continuar.'; return; }
    if (action === 'inicio') values.unshift(value);
    else values.push(value);
    render(`Se insertó ${value} ${action === 'inicio' ? 'al inicio' : 'al final'}.`);
  }));
  render('Lista vacía.');
})();
