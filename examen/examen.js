(() => {
  'use strict';

  const C = window.EDExamCore;
  const $ = id => document.getElementById(id);
  const fieldId = key => key === 'confirmEmail' ? 'peq-confirm-email' : 'peq-' + key;
  const challengeUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  class ExamApi {
    constructor({ apiBaseUrl, examId }) {
      this.examId = examId;
      if (typeof apiBaseUrl !== 'string' || !apiBaseUrl.trim()) {
        throw new Error('El examen todavía no está habilitado. Consulta a tu docente.');
      }
      const url = new URL(apiBaseUrl.trim());
      if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
        throw new Error('El examen todavía no está habilitado. Consulta a tu docente.');
      }
      this.base = url.origin;
    }

    async request(path, body, authenticated = false) {
      let response;
      try {
        response = await fetch(this.base + path, {
          method: body ? 'POST' : 'GET',
          credentials: 'omit',
          headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(authenticated ? { Authorization: 'Bearer ' + this.token } : {})
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(45000)
        });
      } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          throw new Error('La respuesta está tardando. Intenta de nuevo.');
        }
        throw new Error('No se pudo conectar al examen. Revisa tu conexión e intenta de nuevo.');
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'El examen no está disponible.');
      return data;
    }

    info() {
      return this.request('/api/examen?id=' + encodeURIComponent(this.examId));
    }

    async start(profile, token, website) {
      const data = await this.request('/api/iniciar', { examId: this.examId, profile, token, website });
      if (!data.attemptId || !data.token || !Array.isArray(data.questions) || !data.questions.length) {
        throw new Error('La respuesta del examen está incompleta. Intenta de nuevo.');
      }
      this.attemptId = data.attemptId;
      this.token = data.token;
      return data;
    }

    finish(answers) {
      return this.request('/api/finalizar', { attemptId: this.attemptId, answers }, true);
    }

    email() {
      return this.request('/api/correo', { attemptId: this.attemptId }, true);
    }
  }

  class Exam {
    constructor(config) {
      this.config = config;
      this.answers = Object.create(null);
      this.token = '';
      this.visualComplete = false;
      this.inProgress = false;
      this.questions = [];
      this.setup();
    }

    setup() {
      $('peq-register-form').addEventListener('submit', event => {
        event.preventDefault();
        this.start();
      });
      $('peq-quiz-form').addEventListener('submit', event => {
        event.preventDefault();
        this.confirmFinish();
      });
      $('peq-confirm-finish').addEventListener('close', event => {
        if (event.target.returnValue === 'deliver') this.finish();
      });
      $('peq-questions').addEventListener('change', event => {
        if (!event.target.matches('input[type=radio]')) return;
        this.answers[event.target.name] = event.target.value;
        event.target.closest('.peq-question').classList.remove('is-missing');
        this.progress();
      });
      $('peq-accessible').addEventListener('click', () => {
        this.withoutImage = true;
        this.visualComplete = true;
        $('peq-puzzle').hidden = true;
        $('peq-accessible').hidden = true;
        $('peq-verify-title').textContent = 'Verificación de seguridad';
        $('peq-verify-instructions').hidden = true;
        this.message('peq-verification-note', 'Completa la verificación de seguridad para continuar.');
        this.mountTurnstile();
      });
      window.addEventListener('beforeunload', event => {
        if (!this.inProgress) return;
        event.preventDefault();
        event.returnValue = '';
      });
      const offset = () => {
        const header = $('site-header')?.getBoundingClientRect();
        document.body.style.setProperty('--peq-header-offset', Math.max(0, Math.ceil(header?.bottom || 0)) + 'px');
      };
      document.addEventListener('masterlayout:ready', offset);
      window.addEventListener('scroll', offset, { passive: true });
      window.addEventListener('resize', offset);
      offset();

      this.puzzle = new window.CimarronPuzzle($('peq-puzzle'), './img/cimarron.webp', complete => {
        if (this.withoutImage) return;
        this.visualComplete = complete;
        if (complete) this.mountTurnstile();
      });
      this.loadExam();
    }

    async loadExam() {
      try {
        this.api = new ExamApi(this.config);
        const info = await this.api.info();
        if (typeof info.sitekey !== 'string' || !info.sitekey || info.id !== this.config.examId) {
          throw new Error('El examen todavía no está habilitado. Consulta a tu docente.');
        }
        this.sitekey = info.sitekey;
        $('peq-start').disabled = false;
        if (this.visualComplete) this.mountTurnstile();
      } catch (error) {
        this.message('peq-register-error', error.message);
      }
    }

    message(id, text) {
      const node = $(id);
      node.textContent = text;
      node.hidden = !text;
    }

    focus(id) {
      const node = $(id);
      node.focus({ preventScroll: true });
      node.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }

    loadTurnstile() {
      if (window.turnstile) return Promise.resolve();
      if (!this.loadingWidget) {
        this.loadingWidget = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = challengeUrl;
          script.async = true;
          script.onload = resolve;
          script.onerror = () => {
            script.remove();
            reject(new Error('No se pudo cargar la verificación. Revisa tu conexión.'));
          };
          document.head.append(script);
        }).catch(error => {
          this.loadingWidget = null;
          throw error;
        });
      }
      return this.loadingWidget;
    }

    async mountTurnstile() {
      if (!this.sitekey || this.mounting || this.widgetId !== undefined) return;
      this.mounting = true;
      const slot = $('peq-turnstile');
      slot.hidden = false;
      try {
        await this.loadTurnstile();
        this.widgetId = window.turnstile.render(slot, {
          sitekey: this.sitekey,
          action: 'examen-inicio',
          cData: this.config.examId,
          theme: 'light',
          size: slot.clientWidth < 300 ? 'compact' : 'flexible',
          callback: token => {
            this.token = token;
            if (!this.starting) this.message('peq-verification-note', '');
          },
          'expired-callback': () => {
            this.token = '';
            this.message('peq-verification-note', 'La verificación venció. Complétala otra vez.');
          },
          'error-callback': () => {
            this.token = '';
            this.message('peq-verification-note', 'La verificación no se completó. Intenta de nuevo.');
            return true;
          }
        });
      } catch (error) {
        this.message('peq-verification-note', error.message);
      } finally {
        this.mounting = false;
      }
    }

    async start() {
      if (this.starting || !this.sitekey) return;
      const raw = Object.fromEntries(new FormData($('peq-register-form')));
      const { profile, errors } = C.validateProfile(raw);
      for (const key of ['name', 'matricula', 'group', 'email', 'confirmEmail']) {
        $(fieldId(key)).setAttribute('aria-invalid', String(Boolean(errors[key])));
        $('peq-' + key + '-error').textContent = errors[key] || '';
      }
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        this.message('peq-register-error', 'Revisa los datos señalados antes de continuar.');
        $(fieldId(firstError)).focus();
        return;
      }
      if (!this.visualComplete) {
        this.message('peq-register-error', 'Completa la imagen del Cimarrón o usa la verificación sin imagen.');
        $('peq-drag').focus();
        return;
      }
      if (!this.token) {
        this.message('peq-register-error', 'Completa la verificación de seguridad para comenzar.');
        this.mountTurnstile();
        return;
      }
      this.starting = true;
      const button = $('peq-start');
      button.disabled = true;
      button.textContent = 'Preparando examen…';
      this.message('peq-register-error', '');
      try {
        const data = await this.api.start(profile, this.token, raw.website || '');
        this.questions = data.questions;
        $('peq-questions').innerHTML = this.questions.map((q, i) => this.questionHtml(q, i)).join('');
        this.inProgress = true;
        $('peq-registration').hidden = true;
        $('peq-attempt').hidden = false;
        $('peq-live').textContent = 'Tu examen está listo.';
        this.progress();
        this.focus('peq-attempt-title');
      } catch (error) {
        this.message('peq-register-error', error.message);
        this.token = '';
        if (window.turnstile && this.widgetId !== undefined) window.turnstile.reset(this.widgetId);
      } finally {
        this.starting = false;
        button.disabled = false;
        button.textContent = 'Comenzar examen →';
      }
    }

    questionHtml(q, index, review) {
      const id = C.escapeHtml(q.id);
      const status = review ? (review.correct ? 'correcta' : 'incorrecta') : '';
      const options = q.options.map((o, i) => {
        const selected = review ? review.selectedId === o.id : this.answers[q.id] === o.id;
        const mark = review && selected ? (review.correct ? ' correct' : ' incorrect') : '';
        const label = 'ABCD'[i];
        const value = o.format === 'code' || o.format === 'output'
          ? '<pre><code>' + C.escapeHtml(o.text) + '</code></pre>'
          : '<p>' + C.inline(o.text) + '</p>';
        return '<label class="peq-option' + mark + '"><input type="radio" name="' + id +
          '" value="' + C.escapeHtml(o.id) + '"' + (selected ? ' checked' : '') + (review ? ' disabled' : '') +
          '><span class="peq-option-body"><span class="peq-option-letter">' + label +
          (review && selected ? ' · Tu respuesta' : '') + '</span>' + value + '</span></label>';
      }).join('');
      const heading = 'title-' + id;
      return '<section class="peq-question' + (review ? (review.correct ? ' is-correct' : ' is-incorrect') : '') +
        '" id="card-' + id + '" aria-labelledby="' + heading + '">' +
        (review ? '<p class="peq-review-status">Respuesta ' + status + '</p>' : '') +
        '<h3 id="' + heading + '" tabindex="-1"><span class="peq-question-num">' + (index + 1) +
        '.</span> ' + C.inline(q.prompt) + '</h3>' +
        (q.code ? '<pre><code>' + C.escapeHtml(q.code) + '</code></pre>' : '') +
        '<div class="peq-options" role="radiogroup" aria-labelledby="' + heading + '">' +
        options + '</div></section>';
    }

    progress() {
      const count = Object.keys(this.answers).length;
      const percent = Math.round(100 * count / this.questions.length);
      $('peq-progress-label').textContent = count + ' / ' + this.questions.length;
      $('peq-progress-fill').style.width = percent + '%';
      $('peq-progress-track').setAttribute('aria-valuenow', String(percent));
      $('peq-progress-track').setAttribute('aria-valuetext', count + ' de ' + this.questions.length + ' respondidas');
    }

    confirmFinish() {
      if (!this.inProgress || this.finishing) return;
      const missing = this.questions.filter(q => !q.options.some(o => o.id === this.answers[q.id]));
      if (missing.length) {
        for (const q of missing) $('card-' + q.id).classList.add('is-missing');
        this.message('peq-quiz-error', 'Completa las preguntas pendientes antes de entregar.');
        this.focus('title-' + missing[0].id);
        return;
      }
      this.message('peq-quiz-error', '');
      const dialog = $('peq-confirm-finish');
      dialog.returnValue = '';
      dialog.showModal();
    }

    async finish() {
      if (!this.inProgress || this.finishing) return;
      this.finishing = true;
      $('peq-finish').disabled = true;
      $('peq-finish').textContent = 'Registrando entrega…';
      try {
        const data = await this.api.finish(this.answers);
        this.showResult(data);
        this.inProgress = false;
      } catch (error) {
        this.message('peq-quiz-error', error.message);
      } finally {
        this.finishing = false;
        $('peq-finish').disabled = false;
        $('peq-finish').textContent = 'Finalizar examen';
      }
    }

    showResult({ profile, result, canEmail, emailSent }) {
      const e = C.escapeHtml;
      const details = new Map((result.details || []).map(detail => [detail.id, detail]));
      const fields = [
        ['Nombre', profile.name], ['Matrícula', profile.matricula], ['Grupo', profile.group],
        ['Correo', profile.email], ['Folio', result.folio], ['Fecha de entrega', C.date(result.completedAt)],
        ['Aciertos', result.correct + ' de ' + result.total], ['Puntos obtenidos', result.points + ' de ' + result.maxPoints]
      ];
      const byTopic = result.byTopic.map(topic =>
        '<tr><th scope="row">' + e(topic.title) + '</th><td>' + e(topic.points) + ' / ' + e(topic.maxPoints) +
        '</td><td>' + e(topic.percentage) + '%</td></tr>').join('');
      const hasReview = this.questions.every(q => details.has(q.id));
      const review = hasReview ? '<details class="peq-review-expand"><summary>Revisión de respuestas</summary>' +
        '<div class="peq-review-list">' +
        this.questions.map((q, i) => this.questionHtml(q, i, details.get(q.id))).join('') + '</div></details>' : '';
      $('peq-questions').replaceChildren();
      $('peq-attempt').hidden = true;
      $('peq-result').innerHTML =
        '<div id="peq-print-report"><div class="peq-result-heading"><div class="peq-score"><strong>' +
        e(result.percentage) + '</strong><span>/ 100</span></div><div><span class="peq-eyebrow">EXAMEN ENTREGADO</span>' +
        '<h2 id="peq-result-title" tabindex="-1">Tu resultado</h2><p class="peq-muted">Examen de Estructuras de Datos</p>' +
        '</div></div><dl class="peq-student-data">' + fields.map(([label, value]) =>
          '<div><dt>' + e(label) + '</dt><dd>' + e(value) + '</dd></div>').join('') +
        '</dl><section class="peq-result-topics"><h3>Desempeño por tema</h3><div class="peq-table-wrap">' +
        '<table class="peq-table"><thead><tr><th scope="col">Tema</th><th scope="col">Puntos</th>' +
        '<th scope="col">Resultado</th></tr></thead><tbody>' + byTopic + '</tbody></table></div></section></div>' +
        '<div class="peq-result-actions"><button id="peq-send" type="button" class="peq-button"' +
        (!canEmail || emailSent ? ' disabled' : '') + '>' + (emailSent ? 'Comprobante enviado' : 'Enviar a mi correo') +
        '</button><button id="peq-download" type="button" class="peq-button secondary">Descargar comprobante</button>' +
        '<button id="peq-print" type="button" class="peq-button secondary">Imprimir / Guardar PDF</button></div>' +
        '<p class="peq-mail-note peq-small peq-muted">' +
        (canEmail ? 'El comprobante se envía a ' + e(profile.email) + '.'
          : 'El correo no está habilitado. Puedes descargar o imprimir tu comprobante.') + '</p>' +
        '<p id="peq-mail-status" class="peq-message" role="status" hidden></p>' + review;
      $('peq-result').hidden = false;
      $('peq-print').addEventListener('click', () => window.print());
      $('peq-download').addEventListener('click', () => this.download(result.folio));
      $('peq-send').addEventListener('click', () => this.email());
      $('peq-live').textContent = 'Se registró tu entrega.';
      this.focus('peq-result-title');
    }

    download(folio) {
      const html = C.receipt($('peq-print-report').outerHTML);
      const link = document.createElement('a');
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      link.href = url;
      link.download = 'Comprobante_ED_' + folio + '.html';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async email() {
      const button = $('peq-send');
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Enviando…';
      $('peq-mail-status').classList.remove('error');
      this.message('peq-mail-status', '');
      try {
        const response = await this.api.email();
        if (!response.sent) throw new Error('No se pudo confirmar el envío.');
        button.textContent = 'Comprobante enviado';
        this.message('peq-mail-status', 'Se envió el comprobante. Revisa también el correo no deseado.');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Enviar a mi correo';
        $('peq-mail-status').classList.add('error');
        this.message('peq-mail-status', error.message);
      }
    }
  }

  window.addEventListener('DOMContentLoaded', () => new Exam(window.EXAM_ED_CONFIG || {}), { once: true });
})();
