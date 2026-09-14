(() => {
  "use strict";
  const scriptEl = document.currentScript;
  const scriptUrl = scriptEl ? new URL(scriptEl.src, window.location.href) : new URL("scripts/app.js", window.location.href);
  const siteRoot = new URL("../", scriptUrl);
  function addBackButton(){
    if(document.querySelector(".topic-back-home")) return;
    const a=document.createElement("a");
    a.className="topic-back-home";
    a.href=new URL("index.html",siteRoot).href;
    a.setAttribute("aria-label","Volver al índice");
    a.title="Volver al índice";
    const img=document.createElement("img");
    img.src=new URL("images/cimarron.png",siteRoot).href;
    img.alt="Cimarrón UABC";
    const span=document.createElement("span");
    span.textContent="← Volver al índice";
    a.append(img,span);
    document.body.appendChild(a);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",addBackButton,{once:true}); else addBackButton();
})();