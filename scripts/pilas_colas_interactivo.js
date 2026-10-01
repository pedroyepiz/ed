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
