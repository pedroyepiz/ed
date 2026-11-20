(() => {
  'use strict';

  const domain = 'uabc.edu.mx';
  const clean = value => typeof value === 'string' ? value.normalize('NFC').trim() : '';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const inline = text => escapeHtml(text).replace(/[\x60]([^\x60]+)[\x60]/g, '<code class="peq-inline-code">$1</code>');
  const date = iso => {
    const value = new Date(iso);
    return Number.isNaN(value.valueOf()) ? '—' : new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Tijuana'
    }).format(value);
  };

  function validateProfile(raw) {
    const profile = {
      name: clean(raw.name).replace(/\s+/g, ' '),
      matricula: clean(raw.matricula),
      group: clean(raw.group).toUpperCase(),
      email: clean(raw.email).toLowerCase(),
      emailConfirm: clean(raw.confirmEmail).toLowerCase()
    };
    const errors = {};
    if (profile.name.length < 2 || profile.name.length > 100
      || !/^\p{L}[\p{L}\p{M}]*(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u.test(profile.name)) {
      errors.name = 'Escribe tu nombre completo con letras y espacios.';
    }
    if (!/^\d{5,10}$/.test(profile.matricula)) errors.matricula = 'Escribe una matrícula de 5 a 10 dígitos.';
    if (!/^[A-Z0-9][A-Z0-9 _.-]{0,19}$/.test(profile.group)) errors.group = 'Revisa el grupo.';
    if (!/^[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]{1,64}@uabc\.edu\.mx$/.test(profile.email)) {
      errors.email = 'Usa tu correo institucional @' + domain + '.';
    }
    if (!profile.emailConfirm || profile.email !== profile.emailConfirm) {
      errors.confirmEmail = 'Los correos deben coincidir.';
    }
    return { profile, errors };
  }

  // Mantén la pieza en la zona visible de la fotografía.
  function puzzleGeometry(width) {
    const height = Math.round(width * .66);
    const size = Math.max(25, Math.round(width * .145));
    return {
      width, height, size, max: width - size,
      targetX: Math.round(width * (.40 + Math.random() * .28)),
      targetY: Math.round(height * (.25 + Math.random() * .28))
    };
  }
  const puzzleFits = (position, target, tolerance) => Math.abs(position - target) <= tolerance;

  function receipt(report) {
    return '<!doctype html><html lang="es-MX"><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Comprobante · Estructuras de Datos</title>' +
      '<style>body{font:16px/1.5 system-ui,sans-serif;color:#173d31;margin:30px auto;padding:0 18px;max-width:780px}' +
      'h1,h2,h3{color:#006847}h1{font-size:1.8rem}.peq-score strong{font-size:2.8rem;margin-right:.25em}' +
      'dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6em 1em;background:#f2f7f3;padding:16px}' +
      'dt{font-weight:700}dd{margin:0;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}' +
      'td,th{padding:8px;text-align:left;border-bottom:1px solid #d5e5d9}thead{background:#eaf4ed}' +
      'td{text-align:right}@media(max-width:525px){dl{grid-template-columns:1fr}}' +
      '@media print{body{padding:0}table{break-inside:avoid}}</style>' +
      '<body><p>Universidad Autónoma de Baja California · FIAD</p>' + report + '</body></html>';
  }

  window.EDExamCore = { validateProfile, escapeHtml, inline, date, receipt, puzzleGeometry, puzzleFits };
})();
