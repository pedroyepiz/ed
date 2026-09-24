const DATA_URL = 'data/actividades.json';
const STORAGE_KEY = 'ed_actividades_borrador_v1';
async function publicData(){const response=await fetch(DATA_URL,{cache:'no-store'});if(!response.ok)throw Error('No se pudo leer actividades.json');return response.json()}
function localDraft(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))}catch{return null}}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function saveDraft(rows){localStorage.setItem(STORAGE_KEY,JSON.stringify(rows))}
