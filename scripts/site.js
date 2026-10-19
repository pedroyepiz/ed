(() => {
  "use strict";

  const scriptEl = document.currentScript;
  const scriptUrl = scriptEl
    ? new URL(scriptEl.src, window.location.href)
    : new URL("scripts/layout.js", window.location.href);

  const siteRoot = new URL("../", scriptUrl);

  async function loadComponent(selector, name) {
    const target = document.querySelector(selector);
    if (!target) return;

    try {
      const response = await fetch(new URL(`components/${name}.html`, siteRoot), { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      let markup = await response.text();
      markup = markup.replaceAll("{{ROOT}}", siteRoot.href);
      target.innerHTML = markup;

      if (name === "course-info") {
        const topic = target.dataset.topic || "";
        const topicRow = target.querySelector("[data-topic-row]");
        const topicValue = target.querySelector("[data-topic-value]");
        if (topic && topicValue) topicValue.textContent = topic;
        else if (topicRow) topicRow.remove();
      }
    } catch (error) {
      console.error(`No fue posible cargar ${name}.html`, error);
      // El sitio conserva el contenido y el menú aun cuando falle una plantilla.
      target.replaceChildren();
    }
  }

  function updateYear() {
    document.querySelectorAll("[data-current-year], #currentYear").forEach(el => {
      el.textContent = new Date().getFullYear();
    });
  }

  const topicFiles = [
    "tema_00_introduccion.html", "tema_01_listas.html", "tema_02_pilas.html",
    "tema_03_colas.html", "tema_04_arboles.html", "tema_05_monticulos.html",
    "tema_06_hash.html"
  ];

  const iconPaths = {
    home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7",
    previous: "M19 12H5m0 0 6-6m-6 6 6 6",
    next: "M5 12h14m0 0-6-6m6 6-6 6"
  };

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("ed-nav-icon");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", iconPaths[name]);
    svg.append(path);
    return svg;
  }

  function link(label, url, iconName, className = "") {
    const anchor = document.createElement("a");
    anchor.href = new URL(url, siteRoot).href;
    anchor.className = className;
    anchor.append(icon(iconName), document.createTextNode(label));
    return anchor;
  }

  function initNavigation() {
    const file = decodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
    const inPages = window.location.pathname.includes("/pages/");
    if (file === "index.html" || file === "admin.html") return;

    // Actividades muestra su propio enlace de Inicio dentro de la tarjeta.
    if (file !== "actividades.html") {
      const top = document.createElement("nav");
      top.className = "ed-inline-nav ed-home-return";
      top.setAttribute("aria-label", "Volver al inicio del curso");
      top.append(link("Inicio del curso", "index.html", "home"));
      const header = document.querySelector("#site-header");
      if (header) header.insertAdjacentElement("afterend", top);
      else document.body.prepend(top);
    }

    const bottom = document.createElement("nav");
    bottom.className = "ed-page-navigation";
    bottom.setAttribute("aria-label", "Continuar navegando el curso");
    const footer = document.querySelector("#site-footer");
    if (footer) footer.insertAdjacentElement("beforebegin", bottom);
    else document.body.append(bottom);

    const setButtons = (previous, next) => {
      bottom.replaceChildren();
      if (previous) bottom.append(link("Anterior", previous, "previous", "ed-page-button"));
      else bottom.append(document.createElement("span"));
      bottom.append(link("Inicio", "index.html", "home", "ed-page-button ed-page-home"));
      if (next) bottom.append(link("Siguiente", next, "next", "ed-page-button"));
      else bottom.append(document.createElement("span"));
    };

    const index = inPages ? topicFiles.indexOf(file) : -1;
    if (index >= 0) {
      setButtons(index > 0 ? `pages/${topicFiles[index - 1]}` : null,
        index < topicFiles.length - 1 ? `pages/${topicFiles[index + 1]}` : "pages/presentaciones_videos.html");
    } else if (file === "presentaciones_videos.html") {
      setButtons(`pages/${topicFiles[topicFiles.length - 1]}`, "actividades.html");
    } else if (file === "actividades.html") {
      setButtons("pages/presentaciones_videos.html", null);
    } else if (file === "detalle.html" && typeof publicData === "function") {
      setButtons("actividades.html", null);
      publicData().then(rows => {
        const id = Number(new URLSearchParams(window.location.search).get("id"));
        const available = rows.filter(row => row.visible && (row.actividad || row.codigo)).sort((a, b) => a.id - b.id);
        const position = available.findIndex(row => row.id === id);
        if (position === -1) return;
        setButtons(position > 0 ? `detalle.html?id=${available[position - 1].id}` : "actividades.html",
          position < available.length - 1 ? `detalle.html?id=${available[position + 1].id}` : null);
      }).catch(error => console.error("No fue posible crear la secuencia de actividades", error));
    } else {
      // Los recursos independientes conservan Inicio, con acceso al índice en la parte superior.
      setButtons(null, null);
    }
  }

  async function initMasterLayout() {
    initNavigation();
    await Promise.all([
      loadComponent("#site-header", "header"),
      loadComponent("#site-footer", "footer"),
      loadComponent("#course-info", "course-info")
    ]);
    updateYear();
    document.dispatchEvent(new CustomEvent("masterlayout:ready", {
      detail: { siteRoot: siteRoot.href }
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMasterLayout, { once: true });
  } else {
    initMasterLayout();
  }
})();



/* ===== scripts/infografias.js ===== */
document.addEventListener("DOMContentLoaded", () => {
  const triggers = [...document.querySelectorAll("[data-infografia]")];
  const lb = document.querySelector(".infografia-lightbox");

  if (!lb || triggers.length === 0) return;

  const img = lb.querySelector(".lb-stage img");
  const stage = lb.querySelector(".lb-stage");
  const title = lb.querySelector(".lb-title");
  const closeBtn = lb.querySelector("[data-lb-close]");
  const prevBtn = lb.querySelector("[data-lb-prev]");
  const nextBtn = lb.querySelector("[data-lb-next]");
  const zoomInBtn = lb.querySelector("[data-lb-zoom-in]");
  const zoomOutBtn = lb.querySelector("[data-lb-zoom-out]");
  const resetBtn = lb.querySelector("[data-lb-reset]");

  // Agrupar los disparadores por imagen para no contar dos veces
  // la miniatura y el botón "Ver y ampliar".
  const items = [];
  triggers.forEach(trigger => {
    const src = trigger.dataset.src;
    const titleText = trigger.dataset.title || "Infografía";
    if (!items.some(item => item.src === src)) {
      items.push({ src, title: titleText });
    }
  });

  let current = 0;
  let zoom = 100;

  function baseWidth() {
    // Ancho inicial visible. A partir de aquí el zoom trabaja en píxeles,
    // evitando problemas de navegadores con vw/min().
    return Math.min(window.innerWidth * 0.94, 1250);
  }

  function applyZoom() {
    zoom = Math.max(40, Math.min(250, zoom));
    const width = Math.round(baseWidth() * (zoom / 100));
    img.style.width = width + "px";
    img.style.height = "auto";
    img.style.maxWidth = "none";
    resetBtn.textContent = zoom + "%";
  }

  function render() {
    const item = items[current];
    img.src = item.src;
    img.alt = item.title;
    title.textContent = item.title;
    zoom = 100;
    applyZoom();

    // Regresar el visor al inicio de la imagen.
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  }

  function openItem(src) {
    const found = items.findIndex(item => item.src === src);
    current = found >= 0 ? found : 0;
    render();
    lb.classList.add("abierto");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.classList.remove("abierto");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  triggers.forEach(trigger => {
    const activate = () => openItem(trigger.dataset.src);

    trigger.addEventListener("click", activate);
    trigger.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });

  closeBtn.addEventListener("click", close);

  prevBtn.addEventListener("click", () => {
    current = (current - 1 + items.length) % items.length;
    render();
  });

  nextBtn.addEventListener("click", () => {
    current = (current + 1) % items.length;
    render();
  });

  zoomInBtn.addEventListener("click", () => {
    zoom += 20;
    applyZoom();
  });

  zoomOutBtn.addEventListener("click", () => {
    zoom -= 20;
    applyZoom();
  });

  resetBtn.addEventListener("click", () => {
    zoom = 100;
    applyZoom();
  });

  // Zoom con rueda del ratón + Ctrl dentro del visor.
  stage.addEventListener("wheel", event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoom += event.deltaY < 0 ? 10 : -10;
    applyZoom();
  }, { passive:false });

  // Doble clic: alterna entre 100% y 160%.
  img.addEventListener("dblclick", () => {
    zoom = zoom === 100 ? 160 : 100;
    applyZoom();
  });

  lb.addEventListener("click", event => {
    if (event.target === lb) close();
  });

  document.addEventListener("keydown", event => {
    if (!lb.classList.contains("abierto")) return;

    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft") prevBtn.click();
    else if (event.key === "ArrowRight") nextBtn.click();
    else if (event.key === "+" || event.key === "=") zoomInBtn.click();
    else if (event.key === "-") zoomOutBtn.click();
    else if (event.key === "0") resetBtn.click();
  });

  window.addEventListener("resize", () => {
    if (lb.classList.contains("abierto")) applyZoom();
  });
});



/* ===== scripts/listas-demo.js ===== */
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



/* ===== scripts/pilas_colas_interactivo.js ===== */
(() => {
'use strict';
function createStructure(kind,mode){
 const stack=kind==='pilas',dynamic=mode==='dynamic',capacity=dynamic?8:5;
 const state={stack,dynamic,capacity,slots:Array(capacity).fill(null),count:0,front:0,end:0,head:null,tail:null};
 state.add=value=>{
  if(state.count===capacity)return false;
  if(dynamic){const node={value,next:null};if(stack){node.next=state.head;state.head=node;if(!state.tail)state.tail=node;}else{if(state.tail)state.tail.next=node;else state.head=node;state.tail=node;}}
  else if(stack)state.slots[state.count]=value;
  else{state.slots[state.end]=value;state.end=(state.end+1)%capacity;}
  state.count++;return true;
 };
 state.peek=()=>state.count?(dynamic?state.head.value:stack?state.slots[state.count-1]:state.slots[state.front]):undefined;
 state.remove=()=>{
  if(!state.count)return undefined;
  const value=state.peek();
  if(dynamic){const removed=state.head;state.head=removed.next;removed.next=null;if(!state.head)state.tail=null;}
  else if(stack)state.slots[state.count-1]=null;
  else{state.slots[state.front]=null;state.front=(state.front+1)%capacity;}
  state.count--;return value;
 };
 state.clear=()=>{while(state.count)state.remove();state.front=state.end=0;};return state;
}
if(typeof module!=='undefined')module.exports={createStructure};
if(typeof document==='undefined')return;
document.querySelectorAll('[data-pc-lab]').forEach(lab=>{
 const state=createStructure(lab.dataset.pcLab,lab.dataset.mode),input=lab.querySelector('input');
 const status=lab.querySelector('[data-pc-status]'),track=lab.querySelector('[data-pc-track]');
 function render(message){
  track.replaceChildren();track.classList.toggle('pc-stack',state.stack);
  function cell(value,label,active){const div=document.createElement('div');div.className='pc-cell'+(active?' pc-active':'');const strong=document.createElement('strong');strong.textContent=value===null?'Vacío':String(value);const small=document.createElement('small');small.textContent=label;div.append(strong,small);track.append(div);}
  if(state.dynamic){let node=state.head,i=0;while(node){cell(node.value,(i===0?(state.stack?'TOPE':'FRENTE')+' · ':'')+(!state.stack&&node===state.tail?'FINAL · ':'')+'siguiente: '+(node.next?node.next.value:'NULL'),i===0);node=node.next;i++;}if(!state.count)track.textContent='Sin nodos · '+(state.stack?'TOPE = NULL':'FRENTE = FINAL = NULL');}
  else{const indexes=Array.from({length:state.capacity},(_,i)=>i);if(state.stack)indexes.reverse();indexes.forEach(i=>cell(state.slots[i],'Índice '+i+(state.stack&&i===state.count-1?' · TOPE':'')+(!state.stack&&state.count&&i===state.front?' · FRENTE':''),state.stack?i===state.count-1:state.count&&i===state.front));}
  lab.querySelector('[data-pc-pointers]').textContent=state.dynamic?'Nodos reservados: '+state.count+' · '+(state.stack?'TOPE: '+(state.head?state.head.value:'NULL'):'FRENTE: '+(state.head?state.head.value:'NULL')+' · FINAL: '+(state.tail?state.tail.value:'NULL')):'Ocupación: '+state.count+'/'+state.capacity+' · '+(state.stack?'TOPE = '+(state.count-1):'FRENTE = '+state.front+' · FINAL (próxima inserción) = '+state.end);
  status.textContent=message;
 }
 lab.addEventListener('click',event=>{
  const button=event.target.closest('[data-pc-action]');if(!button||!lab.contains(button))return;
  const action=button.dataset.pcAction;
  if(action==='clear'){state.clear();render(state.dynamic?'Nodos liberados; estructura vacía.':'Arreglo vacío; índices reiniciados.');return;}
  if(action==='peek'){const value=state.peek();render(value===undefined?'La estructura está vacía.':'Próximo valor a salir: '+value);return;}
  if(action==='remove'){const value=state.remove();render(value===undefined?'No se puede retirar: estructura vacía.':'Valor retirado: '+value+(state.dynamic?' · Nodo desenlazado y liberado.':''));return;}
  const raw=input.value.trim(),value=Number(raw);if(!raw||!Number.isInteger(value)||value < -999||value>999){status.textContent='Escribe un entero entre -999 y 999.';input.focus();return;}
  if(!state.add(value)){render(state.dynamic?'Límite visual de ocho nodos. La memoria real disponible determina la capacidad dinámica.':'Estructura llena: no queda espacio en el arreglo.');return;}
  render('Valor agregado: '+value+(state.dynamic?' · Nodo reservado y enlazado.':''));input.value='';input.focus();
 });
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();lab.querySelector('[data-pc-action=add]').click();}});render('Estructura vacía.');
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-copy-code]');if(!button)return;
 const block=document.getElementById(button.dataset.copyCode);if(!block)return;
 try{await navigator.clipboard.writeText(block.textContent);const original=button.textContent;button.textContent='¡Copiado!';setTimeout(()=>button.textContent=original,1500);}catch{button.textContent='Selecciona el código para copiarlo.';}
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



/* ===== scripts/listas_dobles_interactivo.js ===== */
(function () {
  "use strict";

  function initListasDobles() {
    const valueInput = document.getElementById("double-value");
    const track = document.getElementById("double-list-track");
    const status = document.getElementById("double-list-status");
    const currentLabel = document.getElementById("double-current");
    const viewport = document.querySelector(".double-list-viewport");

    if (!valueInput || !track || !status || !currentLabel) {
      console.warn("Listas dobles: no se encontró el simulador en esta página.");
      return;
    }

    const values = [];
    let currentIndex = -1;

    function setStatus(message, isError) {
      status.textContent = message;
      if (isError) status.classList.add("is-error");
      else status.classList.remove("is-error");
    }

    function normalizeCurrent() {
      if (values.length === 0) currentIndex = -1;
      else if (currentIndex < 0) currentIndex = 0;
      else if (currentIndex >= values.length) currentIndex = values.length - 1;
    }

    function render() {
      normalizeCurrent();

      if (values.length === 0) {
        track.innerHTML = '<div class="double-empty">Lista vacía · PRIMERO = NULL · ULTIMO = NULL</div>';
        currentLabel.textContent = "Nodo actual: ninguno";
        return;
      }

      let html = '<span class="double-boundary">NULL</span>';

      values.forEach(function (value, index) {
        let labels = [];
        if (index === 0) labels.push("PRIMERO");
        if (index === values.length - 1) labels.push("ULTIMO");

        html += '<div class="double-node-wrap">';
        html += '<button type="button" class="double-node' + (index === currentIndex ? ' is-current' : '') + '" data-node-index="' + index + '" aria-label="Seleccionar nodo ' + value + '">';
        html += '<span class="prev-cell">←</span>';
        html += '<span class="data-cell">' + value + '</span>';
        html += '<span class="next-cell">→</span>';
        if (labels.length) html += '<span class="double-node-label">' + labels.join(" · ") + '</span>';
        html += '</button>';
        if (index < values.length - 1) html += '<div class="double-link" aria-hidden="true">⇄</div>';
        html += '</div>';
      });

      html += '<span class="double-boundary">NULL</span>';
      track.innerHTML = html;
      currentLabel.textContent = "Nodo actual: " + values[currentIndex] + " · posición " + (currentIndex + 1) + " de " + values.length;
    }

    function centerCurrent() {
      if (!viewport || currentIndex < 0) return;
      window.setTimeout(function () {
        const current = track.querySelector('[data-node-index="' + currentIndex + '"]');
        if (current && current.scrollIntoView) {
          current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }, 30);
    }

    function readValue() {
      const raw = valueInput.value.trim();
      if (raw === "") return null;
      const value = Number(raw);
      return Number.isInteger(value) ? value : null;
    }

    document.addEventListener("click", function (event) {
      const actionButton = event.target.closest("[data-double-action]");
      if (actionButton) {
        const action = actionButton.getAttribute("data-double-action");

        if (action === "clear") {
          values.length = 0;
          currentIndex = -1;
          render();
          setStatus("Lista limpiada. PRIMERO y ULTIMO vuelven a NULL.", false);
          return;
        }

        if (action === "prev") {
          if (values.length === 0) return setStatus("La lista está vacía.", true);
          if (currentIndex <= 0) return setStatus("Ya estás en PRIMERO; no existe un nodo anterior.", true);
          currentIndex--;
          render();
          centerCurrent();
          setStatus("Te moviste al nodo anterior: " + values[currentIndex] + ".", false);
          return;
        }

        if (action === "next") {
          if (values.length === 0) return setStatus("La lista está vacía.", true);
          if (currentIndex >= values.length - 1) return setStatus("Ya estás en ULTIMO; no existe un nodo siguiente.", true);
          currentIndex++;
          render();
          centerCurrent();
          setStatus("Te moviste al nodo siguiente: " + values[currentIndex] + ".", false);
          return;
        }

        const value = readValue();
        if (value === null) return setStatus("Escribe un número entero válido.", true);

        if (action === "remove") {
          const index = values.indexOf(value);
          if (index === -1) return setStatus("El valor " + value + " no existe en la lista.", true);

          values.splice(index, 1);
          if (values.length === 0) currentIndex = -1;
          else if (index < currentIndex) currentIndex--;
          else if (currentIndex >= values.length) currentIndex = values.length - 1;

          render();
          centerCurrent();
          setStatus("Se eliminó " + value + " y se reconectaron anterior y siguiente.", false);
          return;
        }

        if (values.indexOf(value) !== -1) {
          return setStatus("El valor " + value + " ya existe. No se aceptan repetidos.", true);
        }

        if (action === "add-start") {
          values.unshift(value);
          currentIndex = 0;
          render();
          centerCurrent();
          setStatus("Se agregó " + value + " al inicio. Ahora es PRIMERO.", false);
        }

        if (action === "add-end") {
          values.push(value);
          currentIndex = values.length - 1;
          render();
          centerCurrent();
          setStatus("Se agregó " + value + " al final. Ahora es ULTIMO.", false);
        }

        valueInput.value = "";
        valueInput.focus();
        return;
      }

      const nodeButton = event.target.closest("[data-node-index]");
      if (nodeButton && track.contains(nodeButton)) {
        currentIndex = Number(nodeButton.getAttribute("data-node-index"));
        render();
        centerCurrent();
        setStatus("Seleccionaste el nodo " + values[currentIndex] + ".", false);
      }

      const codeButton = event.target.closest("[data-code-answer]");
      if (codeButton) {
        const question = codeButton.closest(".code-analysis-question");
        if (!question) return;
        question.querySelectorAll("[data-code-answer]").forEach(function (b) {
          b.classList.remove("selected");
        });
        codeButton.classList.add("selected");
        question.setAttribute("data-selected-answer", codeButton.getAttribute("data-code-answer"));
      }
    });

    valueInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const addEnd = document.querySelector('[data-double-action="add-end"]');
        if (addEnd) addEnd.click();
      }
    });

    render();

    const analyzeButton = document.getElementById("analyze-double-quiz");
    const resetButton = document.getElementById("reset-double-quiz");

    if (analyzeButton) {
      analyzeButton.addEventListener("click", function () {
        let correct = 0;

        document.querySelectorAll(".quiz-question[data-correct]").forEach(function (question) {
          const chosen = question.querySelector("input[type='radio']:checked");
          const feedback = question.querySelector(".quiz-feedback");
          if (!chosen) {
            feedback.textContent = "Sin responder.";
            feedback.className = "quiz-feedback bad";
          } else if (chosen.value === question.getAttribute("data-correct")) {
            correct++;
            feedback.textContent = "Correcto.";
            feedback.className = "quiz-feedback ok";
          } else {
            feedback.textContent = "Revisa el concepto y vuelve a intentarlo.";
            feedback.className = "quiz-feedback bad";
          }
        });

        document.querySelectorAll(".code-analysis-question").forEach(function (question) {
          const chosen = question.getAttribute("data-selected-answer");
          const expected = question.getAttribute("data-correct");
          const explanation = question.getAttribute("data-explanation") || "";
          const feedback = question.querySelector(".quiz-feedback");

          if (!chosen) {
            feedback.textContent = "Sin analizar.";
            feedback.className = "quiz-feedback bad";
          } else if (chosen === expected) {
            correct++;
            feedback.textContent = "Correcto. " + explanation;
            feedback.className = "quiz-feedback ok";
          } else {
            feedback.textContent = "No es correcto. " + explanation;
            feedback.className = "quiz-feedback bad";
          }
        });

        const score = document.getElementById("double-quiz-score");
        const result = document.getElementById("double-quiz-result");
        if (score) score.textContent = correct + " / 7";
        if (result) {
          result.textContent = correct === 7
            ? "7 de 7 correctas. Dominio completo de la lógica de listas dobles."
            : correct + " de 7 correctas. Revisa las respuestas marcadas.";
        }
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        document.querySelectorAll(".double-quiz input[type='radio']").forEach(function (input) {
          input.checked = false;
        });
        document.querySelectorAll(".code-analysis-question").forEach(function (question) {
          question.removeAttribute("data-selected-answer");
          question.querySelectorAll("[data-code-answer]").forEach(function (b) {
            b.classList.remove("selected");
          });
        });
        document.querySelectorAll(".double-quiz .quiz-feedback").forEach(function (feedback) {
          feedback.textContent = "";
          feedback.className = "quiz-feedback";
        });

        const score = document.getElementById("double-quiz-score");
        const result = document.getElementById("double-quiz-result");
        if (score) score.textContent = "0 / 7";
        if (result) result.textContent = "";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initListasDobles);
  } else {
    initListasDobles();
  }
})();


/* ===== scripts/pages/bibliografia.js ===== */
(() => {
  "use strict";

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

  document.addEventListener("DOMContentLoaded", configurarBusqueda);
})();



/* ===== scripts/pages/visor_pdf.js ===== */
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



/* ===== PRESENTACIONES Y VIDEOS ===== */
(() => {
  "use strict";
  const current = document.currentScript;
  const scriptUrl = current ? new URL(current.src, location.href) : new URL("scripts/site.js", location.href);
  const root = new URL("../", scriptUrl);
  async function initMediaResources(){
    const container=document.querySelector("[data-media-resource-page]");
    if(!container) return;
    let data={topics:[]};
    try{
      const r=await fetch(new URL("data/recursos_multimedia.json",root),{cache:"no-cache"});
      if(r.ok) data=await r.json();
    }catch(e){console.warn("No se pudo leer recursos_multimedia.json",e)}
    const bySlug=new Map((data.topics||[]).map(t=>[t.slug,t]));
    container.querySelectorAll("[data-media-topic]").forEach(card=>{
      const slug=card.dataset.mediaTopic;
      const topic=bySlug.get(slug)||{};
      const slots=card.querySelector("[data-media-slots]");
      if(!slots) return;
      const items=[];
      if(topic.presentacion){
        const href=new URL(topic.presentacion,root).href;
        items.push(`<div class="media-slot"><a class="presentation-link" href="${href}" target="_blank" rel="noopener">📑 Abrir presentación</a></div>`);
      }
      (topic.videos||[]).slice(0,2).forEach((v,i)=>{
        const title=v.title||`Video ${i+1}`;
        if(v.type==="youtube" && v.src){
          items.push(`<div class="media-slot"><iframe loading="lazy" src="${v.src}" title="${title}" allowfullscreen></iframe><div class="media-slot-title">${title}</div></div>`);
        }else if(v.src){
          const src=new URL(v.src,root).href;
          items.push(`<div class="media-slot"><video controls preload="metadata"><source src="${src}" type="video/mp4">Tu navegador no puede reproducir este video.</video><div class="media-slot-title">${title}</div></div>`);
        }
      });
      slots.innerHTML=items.length?items.join(""):'<div class="media-empty">Material pendiente de publicar.</div>';
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initMediaResources,{once:true}); else initMediaResources();
})();
