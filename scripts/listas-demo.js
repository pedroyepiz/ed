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


// Quiz general de listas, independiente del simulador.
(() => {
'use strict';
const quiz = document.getElementById('u1-quiz');
if (!quiz) return;
const questions = [...quiz.querySelectorAll('fieldset')];
const score = document.getElementById('listas-quiz-score');
const result = document.getElementById('listas-quiz-result');
document.getElementById('listas-quiz-evaluate').addEventListener('click', () => {
 let hits = 0, answered = 0;
 questions.forEach(question => {
  const selected = question.querySelector('input:checked');
  const feedback = question.querySelector('.feedback');
  if (!selected) { feedback.textContent = 'Selecciona una respuesta.'; feedback.style.color = '#975a00'; return; }
  answered++;
  const correct = selected.value === question.dataset.correct;
  if (correct) hits++;
  feedback.textContent = (correct ? 'Correcto. ' : 'Incorrecto. ') + question.dataset.explanation;
  feedback.style.color = correct ? '#006847' : '#a52a2a';
 });
 score.textContent = hits + ' / ' + questions.length;
 result.textContent = 'Aciertos: ' + hits + ' de ' + questions.length + '. Respondidas: ' + answered + ' de ' + questions.length + '.';
});
document.getElementById('listas-quiz-reset').addEventListener('click', () => {
 quiz.querySelectorAll('input').forEach(input => { input.checked = false; });
 quiz.querySelectorAll('.feedback').forEach(item => { item.textContent = ''; item.style.color = ''; });
 score.textContent = '0 / ' + questions.length; result.textContent = '';
});
})();

// Componentes comunes de listas; cada componente se inicia solo si está presente.
(() => {
'use strict';
function createList(kind) {
 const circular = kind !== 'simples', double = kind === 'dobles_circulares';
 const state = {values:[], current:-1, circular, double};
 state.move = direction => {
  if (!state.values.length) return false;
  const next = state.current + direction;
  if (!circular && (next < 0 || next >= state.values.length)) return false;
  state.current = (next + state.values.length) % state.values.length; return true;
 };
 state.add = (value, start) => {
  if (state.values.includes(value) || state.values.length >= 8) return false;
  if (start) state.values.unshift(value); else state.values.push(value);
  state.current = start ? 0 : state.values.length - 1; return true;
 };
 state.remove = value => {
  const index = state.values.indexOf(value); if (index < 0) return false;
  state.values.splice(index,1);
  if (index < state.current) state.current--;
  state.current = state.values.length ? Math.min(state.current,state.values.length-1) : -1;
  return true;
 };
 return state;
}
if (typeof module !== 'undefined' && module.exports) module.exports = {createList};
if (typeof document === 'undefined') return;
document.querySelectorAll('[data-ed-list]').forEach(lab => {
 const state = createList(lab.dataset.edList);
 const input = lab.querySelector('input'), track = lab.querySelector('[data-ed-track]');
 const status = lab.querySelector('[data-ed-status]');
 function render(message) {
  track.replaceChildren();
  if (!state.values.length) { track.textContent = 'Lista vacía · PRIMERO = ÚLTIMO = NULL'; }
  state.values.forEach((value,i) => {
   if(i) { const arrow = document.createElement('span'); arrow.textContent=state.double?'⇄':'→';track.append(arrow); }
   const node = document.createElement('button');node.type='button';node.dataset.edNode=String(i);
   node.setAttribute('aria-pressed',String(i===state.current));
   const data = document.createElement('strong');data.textContent='Dato: '+value;node.append(data);
   const marks=document.createElement('small');marks.textContent=[i===0?'PRIMERO':'',i===state.values.length-1?'ÚLTIMO':''].filter(Boolean).join(' · ');node.append(marks);
   const next=i+1<state.values.length?state.values[i+1]:state.circular?state.values[0]:'NULL';
   const links=document.createElement('small');links.textContent=(state.double?'Anterior: '+state.values[(i-1+state.values.length)%state.values.length]+' | ':'')+'Siguiente: '+next;node.append(links);track.append(node);
  });
  if(state.values.length&&!state.circular){const end=document.createElement('span');end.textContent='→ NULL';track.append(end);}
  lab.querySelector('[data-ed-current]').textContent='Nodo actual: '+(state.current<0?'ninguno':state.values[state.current]);
  lab.querySelector('[data-ed-cycle]').textContent=state.circular&&state.values.length?(state.double?'Cierre: ÚLTIMO.siguiente → PRIMERO; PRIMERO.anterior → ÚLTIMO.':'Cierre: ÚLTIMO.siguiente → PRIMERO.')+(state.values.length===1?' Un único nodo se enlaza consigo mismo.':''):'';
  if(message)status.textContent=message;
 }
 lab.addEventListener('click',event=>{
  const node=event.target.closest('[data-ed-node]');
  if(node&&lab.contains(node)){state.current=Number(node.dataset.edNode);render('Nodo seleccionado.');return;}
  const button=event.target.closest('[data-ed-action]');if(!button||!lab.contains(button))return;
  const action=button.dataset.edAction;
  if(action==='clear'){state.values.length=0;state.current=-1;render('Lista vacía.');return;}
  if(action==='next'||action==='prev'){render(state.move(action==='next'?1:-1)?'Recorrido realizado.':state.values.length?'No hay otro nodo: el enlace es NULL.':'Agrega un nodo primero.');return;}
  const raw=input.value.trim(),value=Number(raw);
  if(!raw||!Number.isInteger(value)||value < -999||value >999){status.textContent='Escribe un entero entre -999 y 999.';input.focus();return;}
  if(action==='search'){const i=state.values.indexOf(value);if(i>=0)state.current=i;render(i>=0?'Valor encontrado: '+value:'El valor no está en la lista.');return;}
  if(action==='remove'){render(state.remove(value)?'Valor eliminado: '+value:'El valor no está en la lista.');return;}
  if(state.values.includes(value)){status.textContent='El valor ya existe; no se aceptan repetidos.';return;}
  if(state.values.length>=8){status.textContent='Máximo ocho nodos. Elimina uno para continuar.';return;}
  state.add(value,action==='start');render('Valor agregado: '+value);input.value='';input.focus();
 });
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();lab.querySelector('[data-ed-action=end]').click();}});
 render('Agrega un valor para iniciar.');
});
document.querySelectorAll('[data-ed-quiz]').forEach(quiz=>{
 const questions=[...quiz.querySelectorAll('[data-ed-question]')];
 quiz.addEventListener('click',event=>{
  const choice=event.target.closest('[data-ed-answer]');
  if(choice){const question=choice.closest('[data-ed-question]');question.dataset.answer=choice.dataset.edAnswer;question.querySelectorAll('[data-ed-answer]').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));question.querySelector('.ed-feedback').textContent='Respuesta seleccionada: '+choice.textContent;return;}
  if(event.target.closest('[data-ed-reset]')){quiz.querySelectorAll('input').forEach(input=>input.checked=false);questions.forEach(q=>{delete q.dataset.answer;q.querySelector('.ed-feedback').textContent='';q.querySelector('.ed-feedback').className='ed-feedback';});quiz.querySelectorAll('[data-ed-answer]').forEach(b=>b.setAttribute('aria-pressed','false'));quiz.querySelector('[data-ed-score]').textContent='0 / 7';quiz.querySelector('[data-ed-result]').textContent='';return;}
  if(!event.target.closest('[data-ed-evaluate]'))return;
  let hits=0,answered=0;
  questions.forEach(q=>{
   const answer=q.querySelector('input:checked')?.value??q.dataset.answer;
   const f=q.querySelector('.ed-feedback');
   if(answer===undefined){f.className='ed-feedback pending';f.textContent='Selecciona una respuesta.';return;}
   answered++;const correct=answer===q.dataset.correct;if(correct)hits++;
   f.className='ed-feedback '+(correct?'good':'bad');f.textContent=(correct?'Correcto. ':'Incorrecto. ')+q.dataset.explanation;
  });
  quiz.querySelector('[data-ed-score]').textContent=hits+' / '+questions.length;
  quiz.querySelector('[data-ed-result]').textContent='Aciertos: '+hits+' de 7. Respondidas: '+answered+' de 7.';
 });
});
})();
