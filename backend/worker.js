// Servicio para Cloudflare Workers. Secrets: ADMIN_PASSWORD y GITHUB_TOKEN.
const OWNER='pedroyepiz', REPO='ed', BRANCH='main', FILE='data/actividades.json';
const ALLOWED_ORIGINS=new Set(['https://pedroyepiz.github.io']);
function json(value,status=200,origin=''){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','X-Content-Type-Options':'nosniff'}})}
async function sameSecret(a,b){if(!a||!b)return false;const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0}
const githubHeaders=token=>({'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ed-activity-admin'});
function b64Utf8(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.slice(i,i+0x8000));return btoa(binary)}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin')||'';if(!ALLOWED_ORIGINS.has(origin))return json({error:'Origen no autorizado.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});
 if(request.method!=='POST')return json({error:'Método no permitido.'},405,origin);
 if(!env.ADMIN_PASSWORD||!env.GITHUB_TOKEN)return json({error:'Faltan secretos del servicio.'},503,origin);
 let input;try{const body=await request.text();if(body.length>10000)throw Error();input=JSON.parse(body)}catch{return json({error:'Solicitud inválida.'},400,origin)}
 if(!(await sameSecret(input.password,env.ADMIN_PASSWORD)))return json({error:'Contraseña incorrecta.'},401,origin);
 const path=new URL(request.url).pathname;if(path==='/auth')return json({ok:true},200,origin);
 if(path!=='/publish')return json({error:'Ruta desconocida.'},404,origin);
 const states=input.states;
 if(!Array.isArray(states)||states.length!==12||new Set(states.map(x=>x.id)).size!==12||states.some(x=>!Number.isInteger(x.id)||x.id<1||x.id>12||['visible','actividad','codigo'].some(k=>typeof x[k]!=='boolean')))return json({error:'Se requieren 12 actividades con tres estados válidos.'},400,origin);
 const api=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
 try{
  const current=await fetch(`${api}?ref=${BRANCH}`,{headers:githubHeaders(env.GITHUB_TOKEN)});
  if(!current.ok)return json({error:`GitHub no permitió leer el archivo (HTTP ${current.status}).`},502,origin);
  const file=await current.json();const source=await fetch(file.download_url,{headers:githubHeaders(env.GITHUB_TOKEN)});
  if(!source.ok)return json({error:'No se pudo leer el JSON actual.'},502,origin);
  const published=await source.json();if(!Array.isArray(published)||published.length!==12)return json({error:'El JSON publicado no contiene las 12 actividades esperadas.'},409,origin);
  const next=published.map(item=>{const state=states.find(x=>x.id===item.id);if(!state)throw Error('Falta una actividad.');return {...item,visible:state.visible,actividad:state.actividad,codigo:state.codigo}});
  if(JSON.stringify(next)===JSON.stringify(published))return json({commit:'sin cambios',unchanged:true},200,origin);
  const update=await fetch(api,{method:'PUT',headers:{...githubHeaders(env.GITHUB_TOKEN),'Content-Type':'application/json'},body:JSON.stringify({message:'Actualizar disponibilidad de actividades de ED',content:b64Utf8(JSON.stringify(next,null,2)+'\n'),sha:file.sha,branch:BRANCH})});
  if(!update.ok)return json({error:`GitHub rechazó el commit (HTTP ${update.status}). Revisa permisos, rama y cambios simultáneos.`},update.status===409?409:502,origin);
  const result=await update.json();return json({commit:result.commit.sha},200,origin);
 }catch{return json({error:'No se pudo completar la publicación. Revisa el estado del servicio.'},502,origin)}
}};
