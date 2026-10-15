/* actividad-rigor.js — <actividad-rigor>: resolver una actividad de demostración
 *
 * Las actividades de rigor (cota de error, cota de condición, cotas de Ritz…) son demostraciones:
 * el navegador no puede verificarlas. Este componente resuelve su evento de tres maneras, que se combinan:
 *
 *   1. Parte verificable (via 'auto')   — un número, una opción o un ejercicio de <lab-codigo>.
 *                                         Al acertarlo se resuelve el evento y la historia avanza.
 *   2. Declaración (via 'declarado')    — «Entregué la demostración». Por confianza. Es la opción por
 *                                         omisión cuando el ejercicio no trae parte verificable.
 *   3. Código del profesor (via 'profesor') — el profesor revisa y da un código (Panel del Docente);
 *                                         al canjearlo, el evento sube a «revisado por el profesor».
 *
 * En los tres casos la insignia sigue dependiendo de la revisión del profesor.
 *
 * Uso (después de fisica-save.js). La forma corta lee la configuración de actividades-rigor.json,
 * en la misma carpeta que este archivo:
 *   <actividad-rigor evento="u4t1-cota-condicion" tema="u4t1"></actividad-rigor>
 *
 * O con la configuración en línea (tiene prioridad sobre el JSON):
 *   <actividad-rigor evento="u4t1-cota-condicion" tema="u4t1">
 *     <script type="application/json">
 *       { "titulo": "Cota del número de condición",
 *         "verificacion": { "tipo": "numero", "pregunta": "…", "respuesta": 40004, "tolerancia": 0.001 },
 *         "declaracion": false, "codigo": true }
 *     </script>
 *   </actividad-rigor>
 *
 *   verificacion.tipo: "numero"   { pregunta, respuesta, tolerancia (relativa), unidad? }
 *                      "opciones" { pregunta, opciones: [..], correcta: índice, explicacion? }
 *                      "lab"      { id (del ejercicio de <lab-codigo>), texto? }
 *   declaracion: true/false  (por omisión: true solo si no hay verificación)
 *   Un evento sin entrada en el JSON es «pura demostración»: solo declaración y código.
 *   Atributo titulo="…" para ponerle nombre sin tocar el JSON.
 *   codigo:      true/false  (por omisión: true)
 */
(function () {
  if (customElements.get('actividad-rigor')) return;
  var BASE = (function () { try { return new URL('.', document.currentScript.src).href; } catch (e) { return '/'; } })();
  var registro = null;
  function cargarRegistro() {
    if (!registro) registro = fetch(BASE + 'actividades-rigor.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    return registro;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function FS() { return window.FisicaSave; }
  function numero(txt) {
    var t = String(txt || '').trim().replace(/\s+/g, '').replace(/,/g, '.').replace(/−/g, '-')
      .replace(/[×x·*]10\^?\(?([+-]?\d+)\)?/i, 'e$1').replace(/^10\^?\(?([+-]?\d+)\)?$/, '1e$1');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return NaN;
    return parseFloat(t);
  }
  var VIA = { auto: 'parte verificable acertada', declarado: 'entrega declarada', profesor: 'revisada por el profesor' };

  var CSS = ':host{display:block;margin:1.6em 0;}'
    + '.c{border:1px solid var(--lang-border,#E3DCCB);border-radius:10px;background:#FCFAF4;padding:18px 20px;font-family:"Newsreader",Georgia,serif;color:#2A2722;}'
    + '.k{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--lang-primary,#6B5A2E);margin-bottom:6px;}'
    + '.t{font-size:20px;line-height:1.25;margin:0 0 6px;}'
    + '.n{font-size:14.5px;line-height:1.55;color:#5E574A;margin:0 0 14px;text-wrap:pretty;}'
    + '.b{border-top:1px solid #ECE5D6;padding-top:14px;margin-top:14px;}'
    + '.b:first-of-type{border-top:none;padding-top:0;margin-top:0;}'
    + '.q{font-size:16px;line-height:1.5;margin:0 0 10px;}'
    + '.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}'
    + 'input[type=text]{font-family:"IBM Plex Mono",monospace;font-size:14px;padding:8px 11px;border:1px solid #D9D1BE;border-radius:6px;background:#fff;color:#2A2722;min-width:0;width:200px;max-width:100%;box-sizing:border-box;}'
    + 'button{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.03em;padding:9px 16px;border-radius:6px;cursor:pointer;border:1px solid var(--lang-primary,#6B5A2E);background:var(--lang-primary,#6B5A2E);color:#fff;}'
    + 'button.sec{background:transparent;color:var(--lang-primary,#6B5A2E);}'
    + 'button:disabled{opacity:.45;cursor:not-allowed;}'
    + '.op{display:flex;flex-direction:column;gap:8px;}'
    + '.op button{text-align:left;background:#fff;color:#2A2722;border:1px solid #DDD5C2;font-family:"Newsreader",Georgia,serif;font-size:15px;letter-spacing:0;line-height:1.4;}'
    + '.op button.ok{border-color:#3E8E5A;background:#EEF7F0;color:#235C39;}'
    + '.op button.mal{border-color:#C46A6A;background:#FBEFEE;color:#8E2E2E;}'
    + 'label.d{display:flex;gap:9px;align-items:flex-start;font-size:15px;line-height:1.45;cursor:pointer;margin-bottom:10px;}'
    + 'label.d input{margin-top:4px;accent-color:var(--lang-primary,#6B5A2E);}'
    + '.fb{font-size:14.5px;line-height:1.5;margin:10px 0 0;}'
    + '.fb.ok{color:#2F7A4A;} .fb.mal{color:#9A3030;}'
    + '.hecho{display:flex;gap:12px;align-items:flex-start;}'
    + '.sello{flex:none;width:34px;height:34px;border-radius:50%;background:var(--lang-primary,#6B5A2E);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;}'
    + '.tok{font-family:"IBM Plex Mono",monospace;font-size:13px;background:#F1ECDF;border-radius:4px;padding:2px 7px;}'
    + 'details{margin-top:12px;} summary{cursor:pointer;font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--lang-primary,#6B5A2E);}'
    + '.pie{font-size:13px;font-style:italic;color:#8A8167;margin:14px 0 0;}';

  class ActividadRigor extends HTMLElement {
    connectedCallback() {
      if (this._listo) return;
      this._listo = true;
      var sc = this.querySelector('script[type="application/json"]');
      try { this.cfg = sc ? JSON.parse(sc.textContent) : null; } catch (e) { this.cfg = null; }
      this.evento = this.getAttribute('evento');
      this.tema = this.getAttribute('tema') || null;
      this.attachShadow({ mode: 'open' });
      var self = this;
      if (!this.cfg) {
        this.cfg = {};
        cargarRegistro().then(function (j) {
          var c = (j.actividades || j)[self.evento];
          if (c) { self.cfg = c; if (!self.tema && c.tema) self.tema = c.tema; self._pintar(); self._revisarLab(); }
        });
      }
      this._oyente = function () { self._pintar(); };
      ['fisica:evento', 'fisica:importado'].forEach(function (e) { document.addEventListener(e, self._oyente); });
      this._onLab = function () { self._revisarLab(); };
      document.addEventListener('fisica:lab', this._onLab);
      this._pintar();
      this._revisarLab();
    }
    disconnectedCallback() {
      var self = this;
      ['fisica:evento', 'fisica:importado'].forEach(function (e) { document.removeEventListener(e, self._oyente); });
      document.removeEventListener('fisica:lab', this._onLab);
      this._listo = false;
    }
    _resolver(via) {
      var f = FS(); if (!f || !this.evento) return;
      f.resolverEvento(this.evento, { tema: this.tema, via: via });
    }
    _revisarLab() {
      var v = this.cfg.verificacion, f = FS();
      if (v && v.tipo === 'lab' && f && f.labResuelto && f.labResuelto(v.id) && !f.eventoResuelto(this.evento)) this._resolver('auto');
    }
    _pintar() {
      var c = this.cfg, f = FS(), v = c.verificacion || null;
      var r = f && this.evento ? (f.eventos()[this.evento] || null) : null;
      var decl = c.declaracion != null ? !!c.declaracion : !v;
      var cod = c.codigo !== false;
      var h = '<style>' + CSS + '</style><div class="c">'
        + '<div class="k">Actividad de rigor' + (this.tema ? ' · ' + esc(this.tema) : '') + '</div>'
        + ((c.titulo || this.getAttribute('titulo')) ? '<p class="t">' + esc(c.titulo || this.getAttribute('titulo')) + '</p>' : '');
      if (!f) { this.shadowRoot.innerHTML = h + '<p class="n">Falta cargar fisica-save.js antes de este componente.</p></div>'; return; }

      if (r) {
        h += '<div class="hecho"><span class="sello">✓</span><div>'
          + '<p class="q" style="margin:0 0 4px;">Actividad resuelta: ' + esc(VIA[r.via || 'auto'] || 'resuelta') + '.</p>'
          + '<p class="n" style="margin:0;">' + esc(r.fecha || '') + ' · código para tu profesor: <span class="tok">' + esc(r.token) + '</span></p>'
          + '</div></div>';
        if (cod && r.via !== 'profesor') h += this._codigoHTML(true);
      } else {
        h += '<p class="n">' + esc(c.instrucciones || (v
          ? 'Escribe la demostración completa en tu cuaderno o en tu entrega. Después responde la parte verificable: si es correcta, la actividad queda resuelta.'
          : 'Esta actividad es una demostración. Cuando la hayas escrito y entregado, decláralo aquí.')) + '</p>';
        if (v) h += '<div class="b">' + this._verifHTML(v) + '</div>';
        if (decl) h += '<div class="b">'
          + '<label class="d"><input type="checkbox" data-confirma> <span>' + esc(c.textoDeclaracion || 'Escribí la demostración completa y la entregué (o la entregaré) a mi profesor.') + '</span></label>'
          + '<button type="button" data-declarar disabled>Entregué la demostración</button></div>';
        if (cod) h += this._codigoHTML(false);
      }
      h += '<p class="pie">' + esc(c.pie || 'La insignia de esta actividad la otorga tu profesor al revisar la demostración completa.') + '</p></div>';
      this.shadowRoot.innerHTML = h;
      this._enlazar(v);
    }
    _verifHTML(v) {
      if (v.tipo === 'numero') return '<p class="q">' + esc(v.pregunta) + '</p><div class="row">'
        + '<input type="text" data-num placeholder="' + esc(v.placeholder || 'p. ej. 1.2e-13') + '" inputmode="decimal">'
        + (v.unidad ? '<span class="n" style="margin:0;">' + esc(v.unidad) + '</span>' : '')
        + '<button type="button" data-comprobar>Comprobar</button></div><p class="fb" data-fb></p>';
      if (v.tipo === 'opciones') return '<p class="q">' + esc(v.pregunta) + '</p><div class="op">'
        + (v.opciones || []).map(function (o, i) { return '<button type="button" data-op="' + i + '">' + esc(o) + '</button>'; }).join('')
        + '</div><p class="fb" data-fb></p>';
      if (v.tipo === 'lab') return '<p class="q">' + esc(v.texto || 'Resuelve el ejercicio del laboratorio de esta nota: al pasar sus pruebas, la actividad queda resuelta.') + '</p>';
      return '';
    }
    _codigoHTML(despues) {
      var cuenta = (FS().get() || {}).cuenta || '';
      var dentro = '<p class="n" style="margin:8px 0 10px;">' + (despues
        ? 'Si tu profesor ya revisó tu demostración, canjea aquí el código que te dio.'
        : 'Si tu profesor ya revisó tu demostración y te dio un código, canjéalo aquí.') + '</p>'
        + (/^\d{9}$/.test(cuenta) ? '' : '<p class="fb mal" style="margin:0 0 10px;">Necesitas registrar tu número de cuenta en la página de inicio.</p>')
        + '<div class="row"><input type="text" data-cod placeholder="XXXX-XXXX" maxlength="9" autocomplete="off"><button type="button" class="sec" data-canjear>Canjear</button></div><p class="fb" data-fbc></p>';
      return '<details' + (this._abierto ? ' open' : '') + '><summary>' + (despues ? 'Revisión del profesor' : '¿Tienes un código de tu profesor?') + '</summary>' + dentro + '</details>';
    }
    _enlazar(v) {
      var R = this.shadowRoot, self = this;
      var fb = R.querySelector('[data-fb]');
      var bc = R.querySelector('[data-comprobar]');
      if (bc) {
        var inp = R.querySelector('[data-num]');
        var comprobar = function () {
          var x = numero(inp.value);
          if (isNaN(x)) { fb.className = 'fb mal'; fb.textContent = 'Escribe un número (se aceptan 1.2e-13 o 1.2×10^-13).'; return; }
          var tol = v.tolerancia != null ? v.tolerancia : 0.01;
          var ok = Math.abs(x - v.respuesta) <= tol * Math.max(Math.abs(v.respuesta), 1e-300);
          if (ok) self._resolver('auto');
          else { fb.className = 'fb mal'; fb.textContent = v.pista || 'No coincide. Revisa tu demostración: el valor sale de la cota que probaste.'; }
        };
        bc.addEventListener('click', comprobar);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') comprobar(); });
      }
      R.querySelectorAll('[data-op]').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = +b.getAttribute('data-op');
          if (i === v.correcta) { self._resolver('auto'); return; }
          b.classList.add('mal');
          fb.className = 'fb mal'; fb.textContent = v.pista || 'No es esa. Vuelve al paso de tu demostración que justifica el resultado.';
        });
      });
      var cf = R.querySelector('[data-confirma]'), bd = R.querySelector('[data-declarar]');
      if (cf) {
        cf.addEventListener('change', function () { bd.disabled = !cf.checked; });
        bd.addEventListener('click', function () { if (cf.checked) self._resolver('declarado'); });
      }
      var det = R.querySelector('details');
      if (det) det.addEventListener('toggle', function () { self._abierto = det.open; });
      var bj = R.querySelector('[data-canjear]');
      if (bj) bj.addEventListener('click', function () {
        var r = FS().canjearCodigo(self.evento, R.querySelector('[data-cod]').value, { tema: self.tema });
        var fc = R.querySelector('[data-fbc]');
        if (!r.ok) {
          fc.className = 'fb mal';
          fc.textContent = r.motivo === 'sin-cuenta' ? 'Registra tu número de cuenta en la página de inicio y vuelve a intentarlo.'
            : 'El código no corresponde a esta actividad ni a tu cuenta. Revisa que esté bien escrito.';
        }
      });
    }
  }
  customElements.define('actividad-rigor', ActividadRigor);
})();
