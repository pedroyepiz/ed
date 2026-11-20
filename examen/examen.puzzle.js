/* Rompecabezas visual. La protección real en producción la valida Turnstile en el servidor. */
(() => {
  'use strict';
  class CimarronPuzzle {
    constructor(root, imageUrl, onChange = () => {}) {
      this.root = root; this.onChange = onChange; this.complete = false;
      this.canvas = root.querySelector('[data-puzzle-image]');
      this.piece = root.querySelector('[data-puzzle-piece]');
      this.range = root.querySelector('input[type=range]');
      this.status = root.querySelector('[data-puzzle-status]');
      this.image = new Image(); this.image.onload = () => { this.ready = true; this.reset(); };
      this.image.onerror = () => { this.status.textContent = 'No se pudo cargar la imagen. Vuelve a cargar la página.'; };
      this.image.src = imageUrl;
      this.range.addEventListener('input', () => this.move());
      this.range.addEventListener('change', () => this.verify());
      root.querySelector('[data-puzzle-reset]').addEventListener('click', () => this.reset());
      this.observer = new ResizeObserver(() => { if (this.ready && !this.complete) this.draw(); });
      this.observer.observe(root.querySelector('.peq-puzzle-board'));
    }
    path(size) {
      const p = new Path2D(), inset = size * .14, end = size - inset, mid = size / 2, bump = size * .12;
      p.moveTo(inset,inset); p.lineTo(mid-bump,inset); p.bezierCurveTo(mid-bump,inset-bump*1.7,mid+bump,inset-bump*1.7,mid+bump,inset);
      p.lineTo(end,inset); p.lineTo(end,mid-bump); p.bezierCurveTo(end+bump*1.7,mid-bump,end+bump*1.7,mid+bump,end,mid+bump);
      p.lineTo(end,end); p.lineTo(inset,end); p.closePath(); return p;
    }
    reset() {
      if (!this.ready) return;
      this.complete = false; this.root.classList.remove('is-verified'); this.range.disabled = false;
      this.range.value = '0'; this.status.textContent = 'Arrastra la pieza hasta completar la imagen.';
      this.geometry = null; this.onChange(false); this.draw();
    }
    draw() {
      const width = Math.round(this.root.querySelector('.peq-puzzle-board').clientWidth);
      if (!width) return;
      const previous = this.geometry;
      this.geometry = EDExamCore.puzzleGeometry(width);
      if (previous) { this.geometry.targetX = Math.round(previous.targetX/previous.width*width); this.geometry.targetY = Math.round(previous.targetY/previous.height*this.geometry.height); }
      const g = this.geometry, scale = window.devicePixelRatio || 1;
      const setup = (canvas,w,h) => { canvas.width=Math.round(w*scale); canvas.height=Math.round(h*scale); canvas.style.width=w+'px'; canvas.style.height=h+'px'; const c=canvas.getContext('2d'); c.scale(scale,scale); return c; };
      const ctx=setup(this.canvas,g.width,g.height), part=setup(this.piece,g.size,g.size);
      this.root.querySelector('.peq-puzzle-board').style.height=g.height+'px';
      const drawImage = c => { c.fillStyle='#edf3ed'; c.fillRect(0,0,g.width,g.height); const fit=Math.min(g.width/this.image.width,g.height/this.image.height); const w=this.image.width*fit,h=this.image.height*fit; c.drawImage(this.image,(g.width-w)/2,(g.height-h)/2,w,h); };
      drawImage(ctx);
      part.save(); part.clip(this.path(g.size)); part.translate(-g.targetX,-g.targetY); drawImage(part); part.restore();
      part.strokeStyle='#fff'; part.lineWidth=2; part.stroke(this.path(g.size));
      ctx.save(); ctx.translate(g.targetX,g.targetY); ctx.fillStyle='rgba(5,39,28,.78)'; ctx.fill(this.path(g.size)); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(this.path(g.size)); ctx.restore();
      this.range.max=String(g.max); this.range.value='0'; this.piece.style.top=g.targetY+'px'; this.move();
    }
    move() { if(this.geometry) this.piece.style.transform='translateX('+Number(this.range.value)+'px)'; }
    verify() {
      if (!this.ready || this.complete || !this.geometry) return;
      if (EDExamCore.puzzleFits(Number(this.range.value),this.geometry.targetX,Math.max(5,this.geometry.width*.018))) {
        this.complete=true; this.range.value=String(this.geometry.targetX); this.move(); this.range.disabled=true;
        this.root.classList.add('is-verified'); this.status.textContent='Imagen completada. Verificación visual lista.'; this.onChange(true);
      } else {
        this.status.textContent='Aún no encaja. Mueve la pieza e inténtalo de nuevo.';
      }
    }
  }
  window.CimarronPuzzle=CimarronPuzzle;
})();
