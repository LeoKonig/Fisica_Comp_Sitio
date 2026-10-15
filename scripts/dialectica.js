/*
 * dialectica.js
 * Física Computacional — <dialectica-tema>: la nota dialéctica (Fase IV) de un tema.
 *
 * Uso en un .qmd:
 *   <script src="../../../scripts/dialectica.js?v=1"></script>
 *   <dialectica-tema tema="u1t1"></dialectica-tema>
 *
 * Carga por sí mismo lo que necesita, desde la carpeta de este archivo:
 *   ../mapa.js · ../descubrimientos.js · ../fisica-save.js · dialecticas.json
 *
 * Qué hace:
 *   · Muestra las preguntas del tema (dialecticas.json) y las corrige al instante.
 *   · Una respuesta incorrecta se puede reintentar.
 *   · Monta debajo las actividades de rigor del tema con <actividad-rigor>
 *     (actividad-rigor.js, misma carpeta). Se reúnen de dos fuentes, sin duplicados:
 *       1. la lista "rigor" del tema en dialecticas.json (ids de evento, o
 *          {evento, titulo}); sirve para demostraciones sin entrada en el JSON;
 *       2. toda entrada de actividades-rigor.json cuyo campo "tema" coincida.
 *   · Al acertar todas: FisicaSave.completarFase(tema, 'dialectica') y se abre el
 *     puente a la nota dialógica (por defecto ../dialogicas/{tema}g.html).
 *     Si el tema declara "sellarConRigor": true, el sello espera además a que cada
 *     actividad de rigor esté resuelta (parte verificable, declaración o código).
 *     Por omisión no la espera: la demostración la revisa el profesor aparte.
 *
 * Atributos: tema (obligatorio) · fuente (JSON alterno) · puente (URL de la dialógica)
 * Eventos:   'fisica:dialectica' {tema, preguntas, rigor} al sellar la fase.
 */
(function () {
  'use strict';

  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/[^\/]*$/, '') : '';
  })();
  var RAIZ = (function () {
    try { return new URL('../', BASE).href; } catch (e) { return '/'; }
  })();
  var VERSION = (function () {
    var s = document.currentScript && document.currentScript.src;
    var m = s && s.match(/\?[^#]*/);
    return m ? m[0] : '';
  })();

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var cargas = {};
  function script(global, archivo) {
    if (window[global]) return Promise.resolve();
    if (!cargas[archivo]) {
      cargas[archivo] = new Promise(function (ok) {
        var s = document.createElement('script');
        s.src = BASE + archivo + VERSION;
        s.onload = ok; s.onerror = ok;
        document.head.appendChild(s);
      });
    }
    return cargas[archivo];
  }
  var fuentes = {};
  function json(url) {
    if (!fuentes[url]) fuentes[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error('no se pudo leer ' + url); return r.json(); });
    return fuentes[url];
  }
  // El registro de rigor es opcional: si falta, la dialéctica funciona igual.
  function jsonOpcional(url) {
    return json(url).catch(function () { return {}; });
  }
  var cargaRigor = null;
  function componenteRigor() {
    if (window.customElements.get('actividad-rigor')) return Promise.resolve();
    if (!cargaRigor) {
      cargaRigor = new Promise(function (ok) {
        var s = document.createElement('script');
        s.src = BASE + 'actividad-rigor.js' + VERSION;
        s.onload = ok; s.onerror = ok;
        document.head.appendChild(s);
      });
    }
    return cargaRigor;
  }
  // Reúne las actividades del tema: lista explícita de dialecticas.json + registro por tema.
  function actividadesDe(tema, D, registro) {
    var acts = (registro && (registro.actividades || registro)) || {};
    var lista = [], vistos = {};
    function agregar(evento, titulo) {
      if (!evento || vistos[evento]) return;
      vistos[evento] = true;
      lista.push({ evento: evento, titulo: titulo || null });
    }
    (D.rigor || []).forEach(function (r) {
      if (typeof r === 'string') agregar(r);
      else if (r) agregar(r.evento, r.titulo);
    });
    Object.keys(acts).forEach(function (id) {
      if (id.charAt(0) === '_') return;
      if (acts[id] && acts[id].tema === tema) agregar(id);
    });
    return lista;
  }
  function fuentesTipograficas() {
    if (document.querySelector('link[data-dialogo-fuentes]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.setAttribute('data-dialogo-fuentes', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(l);
  }

  var CSS = "\
:host{display:block;margin:1.5rem auto 2.5rem;max-width:720px;}\
*,*::before,*::after{box-sizing:border-box;}\
.dia{--c:#A8780C;--t:#F6ECD4;--d:#6F4E08;font-family:'Newsreader',Georgia,serif;background:#FAF5EA;border:1px solid #E0D6C0;border-radius:6px;box-shadow:0 1px 0 #FFFCF5 inset,0 14px 34px -28px rgba(60,48,20,.4);padding:34px 36px 38px;color:#2A2722;}\
@media(max-width:680px){.dia{padding:26px 20px 30px;}}\
.eb{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--d);}\
h1{font-size:28px;font-weight:500;margin:3px 0 6px;line-height:1.12;text-wrap:balance;}\
.lede{font-style:italic;font-size:15.5px;line-height:1.55;color:#5E584B;margin:0;text-wrap:pretty;}\
.sellada{margin:14px 0 0;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--d);background:var(--t);border:1px solid var(--c);border-radius:4px;padding:7px 11px;}\
.prog{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.08em;color:#6B6557;margin:18px 0 7px;}\
.track{height:6px;background:#E6DCC6;border-radius:4px;overflow:hidden;}\
.fill{height:100%;width:0;background:var(--c);border-radius:4px;transition:width .45s ease;}\
.q{border-top:1px solid #E6DCC6;padding-top:20px;margin-top:20px;}\
.qh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px;}\
.ctx{display:inline-flex;background:var(--t);border:1px solid var(--c);color:var(--d);border-radius:20px;padding:3px 12px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;}\
.num{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6B6557;}\
.qt{font-size:18.5px;font-weight:500;line-height:1.35;margin:0 0 14px;text-wrap:pretty;}\
.opts{display:flex;flex-direction:column;gap:9px;}\
.o{display:flex;gap:11px;align-items:flex-start;width:100%;text-align:left;background:#FCFAF4;border:1px solid #E9E1CE;border-radius:7px;padding:12px 15px;cursor:pointer;font-family:'Newsreader',serif;font-size:15px;line-height:1.45;color:#3A352D;}\
.o:hover{background:#F6F0E3;border-color:#D8CDB4;}\
.o .mk{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:1.5px solid #CFC3A8;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6B6557;margin-top:1px;}\
.o.ok{background:#EAF2E6;border-color:#9CBE86;color:#2C4520;}\
.o.ok .mk{background:#3F7A25;border-color:#3F7A25;color:#fff;}\
.o.no{background:#F9ECE6;border-color:#E0A488;color:#7C3A22;}\
.o.no .mk{background:#B24F2D;border-color:#B24F2D;color:#fff;}\
.o.lock{pointer-events:none;}\
.o.lock:not(.ok):not(.no){opacity:.62;}\
.fb{display:none;font-style:italic;font-size:14px;line-height:1.55;padding:10px 14px;border-radius:0 6px 6px 0;border-left:3px solid var(--c);background:#F6F0E3;color:#4A443A;margin-top:12px;}\
.fb.show{display:block;}\
.re{display:none;margin-top:22px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--d);background:none;border:none;border-bottom:1px solid var(--c);padding:0 0 1px;cursor:pointer;}\
.re.show{display:inline-block;}\
.pte{display:none;border-top:2px solid var(--c);margin-top:30px;padding-top:24px;}\
.pte.show{display:block;}\
.pte .tt{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:500;margin-bottom:6px;}\
.pte .tt span{font-size:20px;color:var(--d);}\
.pte p{font-style:italic;font-size:14.5px;line-height:1.55;color:#5E584B;margin:0 0 14px;text-wrap:pretty;}\
.pte a.btn{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.04em;display:inline-flex;align-items:center;gap:9px;background:var(--t);color:var(--d);border:1px solid var(--c);border-radius:8px;padding:11px 20px;text-decoration:none;}\
.pte a.btn:hover{background:var(--c);color:#fff;}\
.links{display:flex;gap:16px;flex-wrap:wrap;margin-top:18px;}\
.links a{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--d);text-decoration:none;border-bottom:1.5px solid var(--c);}\
.err{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#8C2F17;border:1px dashed #8C2F17;border-radius:4px;padding:10px 14px;}\
.rig{border-top:2px solid #E6DCC6;margin-top:30px;padding-top:22px;}\
.rig .eb{margin-bottom:4px;}\
.rig h2{font-size:21px;font-weight:500;margin:0 0 6px;line-height:1.2;}\
.rig .lede{font-size:14.5px;}\
.rig actividad-rigor{margin:16px 0 0;}\
.espera{display:none;margin-top:18px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--d);background:var(--t);border:1px dashed var(--c);border-radius:4px;padding:8px 12px;}\
.espera.show{display:block;}\
";

  class DialecticaTema extends HTMLElement {
    static get observedAttributes() { return ['tema']; }
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      fuentesTipograficas();
      var self = this;
      // Una actividad de rigor resuelta puede completar el sello (si el tema lo exige).
      this._onEvento = function () { if (self.D) self._progreso(); };
      document.addEventListener('fisica:evento', this._onEvento);
      document.addEventListener('fisica:importado', this._onEvento);
      this._iniciar();
    }
    disconnectedCallback() {
      document.removeEventListener('fisica:evento', this._onEvento);
      document.removeEventListener('fisica:importado', this._onEvento);
    }
    attributeChangedCallback() { if (this.shadowRoot) this._iniciar(); }

    _iniciar() {
      var self = this, tema = this.getAttribute('tema');
      if (!tema) return;
      var turno = (this._turno = (this._turno || 0) + 1);
      var fuente = this.getAttribute('fuente') || (BASE + 'dialecticas.json' + VERSION);
      Promise.all([
        script('MAPA_CONOCIMIENTO', '../mapa.js'),
        script('DESCUBRIMIENTOS', '../descubrimientos.js'),
        script('FisicaSave', '../fisica-save.js')
      ]).then(function () {
        // actividad-rigor.js necesita fisica-save.js ya cargado.
        return Promise.all([json(fuente), jsonOpcional(BASE + 'actividades-rigor.json' + VERSION), componenteRigor()]);
      }).then(function (r) {
        if (turno !== self._turno) return;
        var datos = r[0], D = datos.temas && datos.temas[tema];
        if (!D) throw new Error('dialecticas.json no tiene preguntas para ' + tema);
        self.rigor = actividadesDe(tema, D, r[1]);
        self._pintar(tema, D);
      }).catch(function (e) {
        if (turno !== self._turno) return;
        self.shadowRoot.innerHTML = '<style>' + CSS + '</style><div class="err">dialectica-tema: ' + esc(e.message) + '</div>';
      });
    }

    _nodo(id) { var M = window.MAPA_CONOCIMIENTO; return M && M.nodos && M.nodos.filter(function (n) { return n.id === id; })[0]; }

    _pintar(tema, D) {
      var self = this, R = this.shadowRoot, FS = window.FisicaSave;
      var nodo = this._nodo(tema) || { label: tema, title: '' };
      this.tema = tema; this.D = D; this.ok = {}; this.resp = {}; this.sellada = false;

      var pal = { c: '#A8780C', t: '#F6ECD4', d: '#6F4E08' }, ruta = '';
      try {
        var cl = FS && FS.getClase(), Rr = cl && window.DESCUBRIMIENTOS && window.DESCUBRIMIENTOS.rutas[cl];
        if (Rr) { pal = { c: Rr.color, t: Rr.tint, d: Rr.deep }; ruta = ' · Ruta ' + Rr.name; }
      } catch (e) {}
      var yaSellada = false;
      try { var s = FS.get(); yaSellada = !!(s.fases && s.fases[tema] && s.fases[tema].dialectica); } catch (e) {}

      var puente = this.getAttribute('puente') || ('../dialogicas/' + tema + 'g.html');
      var n = D.preguntas.length;
      var lede = D.lede || ('Preguntas para integrar lo aprendido. Al responderlas correctamente, sellarás esta misión y se abrirá el puente para trazar tu cartografía.');

      var h = '<style>' + CSS + '</style><div class="dia" style="--c:' + pal.c + ';--t:' + pal.t + ';--d:' + pal.d + ';">'
        + '<div class="eb">Dialéctica · ' + esc(nodo.label) + ' · Fase IV' + esc(ruta) + '</div>'
        + '<h1>' + esc(D.titulo || ('¿Comprendiste ' + (nodo.title || tema) + '?')) + '</h1>'
        + '<p class="lede">' + esc(lede) + '</p>'
        + (yaSellada ? '<div class="sellada">Ya sellaste esta fase. Puedes repasar cuando quieras.</div>' : '')
        + '<div class="prog" id="prog"></div><div class="track"><div class="fill" id="fill"></div></div>';

      D.preguntas.forEach(function (p, qi) {
        h += '<div class="q" data-q="' + qi + '"><div class="qh"><span class="ctx">' + esc(p.modo || 'Pregunta') + '</span><span class="num">' + (qi + 1) + ' / ' + n + '</span></div>'
          + '<p class="qt">' + esc(p.q) + '</p><div class="opts">';
        p.opts.forEach(function (o, oi) {
          h += '<button class="o" type="button" data-o="' + oi + '"><span class="mk">' + String.fromCharCode(65 + oi) + '</span><span>' + esc(o) + '</span></button>';
        });
        h += '</div><div class="fb" data-fb></div></div>';
      });

      h += '<button class="re" id="re" type="button">Intentar de nuevo</button>';

      var rigor = this.rigor || [];
      if (rigor.length) {
        h += '<div class="rig"><div class="eb">Demostración' + (rigor.length > 1 ? 'es' : '') + '</div>'
          + '<h2>' + (rigor.length > 1 ? 'Actividades de rigor' : 'Actividad de rigor') + '</h2>'
          + '<p class="lede">' + esc(D.rigorLede || 'Demuestra el resultado por escrito y entrégalo a tu profesor. Aquí se comprueba la parte verificable; la demostración completa la lee él.') + '</p>'
          + '<div id="rig"></div></div>'
          + '<div class="espera" id="espera">Para sellar esta fase falta resolver la actividad de rigor.</div>';
      }

      h += '<div class="pte" id="pte"><div class="tt"><span>☿</span>Misión sellada — traza tu cartografía</div>'
        + '<p>Has integrado las ideas de este tema. Ahora cruza a la nota <em>dialógica</em>: allí elegirás cómo se conecta este tema con los demás y forjarás esos vínculos en tu Atlas.</p>'
        + '<a class="btn" href="' + esc(puente) + '">Traza tu cartografía →</a>'
        + '<div class="links"><a href="' + RAIZ + 'mapa.html">Ver el Mapa →</a><a href="' + RAIZ + 'codice.html">Ver el Códice →</a></div></div></div>';
      R.innerHTML = h;

      // Las actividades se montan como elementos reales para que <actividad-rigor> haga su trabajo.
      var slot = R.getElementById('rig');
      if (slot) {
        slot.style.setProperty('--lang-primary', pal.d);
        slot.style.setProperty('--lang-border', '#E0D6C0');
        rigor.forEach(function (a) {
          var el = document.createElement('actividad-rigor');
          el.setAttribute('evento', a.evento);
          el.setAttribute('tema', tema);
          if (a.titulo) el.setAttribute('titulo', a.titulo);
          slot.appendChild(el);
        });
      }

      R.querySelectorAll('.q').forEach(function (card) {
        var qi = +card.getAttribute('data-q');
        card.querySelectorAll('.o').forEach(function (b) {
          b.addEventListener('click', function () { self._responder(qi, +b.getAttribute('data-o'), card); });
        });
      });
      R.getElementById('re').addEventListener('click', function () { self._reintentar(); });
      this._progreso();
    }

    _responder(qi, oi, card) {
      var p = this.D.preguntas[qi], bien = oi === p.correct;
      card.querySelectorAll('.o').forEach(function (b, i) {
        b.classList.add('lock');
        if (bien && i === oi) b.classList.add('ok');
        if (!bien && i === oi) b.classList.add('no');
      });
      var fb = card.querySelector('[data-fb]');
      fb.textContent = (bien ? '✓ ' : '✕ ') + (bien ? p.fb : 'No es esta. Lee de nuevo la nota y vuelve a intentarlo.');
      fb.classList.add('show');
      this.resp[qi] = true;
      if (bien) this.ok[qi] = true;
      this._progreso();
    }

    _reintentar() {
      var self = this;
      this.shadowRoot.querySelectorAll('.q').forEach(function (card) {
        var qi = +card.getAttribute('data-q');
        delete self.ok[qi]; delete self.resp[qi];
        card.querySelectorAll('.o').forEach(function (b) { b.classList.remove('lock', 'no', 'ok'); });
        card.querySelector('[data-fb]').classList.remove('show');
      });
      this._progreso();
    }

    _progreso() {
      var R = this.shadowRoot, tot = this.D.preguntas.length, n = Object.keys(this.ok).length;
      R.getElementById('prog').textContent = n + ' / ' + tot + ' respondidas correctamente';
      R.getElementById('fill').style.width = (tot ? n / tot * 100 : 0) + '%';
      var todas = Object.keys(this.resp).length === tot;
      R.getElementById('re').classList.toggle('show', todas && n < tot);
      var faltaRigor = !!this.D.sellarConRigor && !this._rigorResuelto();
      var espera = R.getElementById('espera');
      if (espera) espera.classList.toggle('show', !!(n === tot && faltaRigor && !this.sellada));
      if (n === tot && !faltaRigor && !this.sellada) this._sellar();
    }

    _rigorResuelto() {
      var FS = window.FisicaSave;
      return (this.rigor || []).every(function (a) {
        try { return !!(FS && FS.eventoResuelto(a.evento)); } catch (e) { return false; }
      });
    }

    _sellar() {
      this.sellada = true;
      try { window.FisicaSave.completarFase(this.tema, 'dialectica'); } catch (e) {}
      this.shadowRoot.getElementById('pte').classList.add('show');
      this.dispatchEvent(new CustomEvent('fisica:dialectica', { bubbles: true, composed: true, detail: {
        tema: this.tema, preguntas: this.D.preguntas.length,
        rigor: (this.rigor || []).map(function (a) { return a.evento; })
      } }));
    }
  }

  if (!window.customElements.get('dialectica-tema')) window.customElements.define('dialectica-tema', DialecticaTema);
})();
