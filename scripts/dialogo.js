/*
 * dialogo.js
 * Física Computacional — <dialogo-tema>: la nota dialógica (Fase V) de un tema.
 *
 * Uso en un .qmd:
 *   <script src="/dialogo.js"></script>
 *   <dialogo-tema tema="u1t4"></dialogo-tema>
 *
 * Carga por sí mismo lo que necesita, desde la carpeta de este archivo:
 *   mapa.js · descubrimientos.js · fisica-save.js · grupo-stats.js · dialogicas.json
 *
 * Qué hace:
 *   · Preguntas sin respuesta correcta: cada opción traza un vínculo tema → otro tema.
 *   · «Otra conexión»: el alumno elige cualquier tema del mapa y escribe por qué.
 *   · Tras elegir, muestra cómo trazó el grupo ese mismo vínculo (GRUPO_STATS.vinculos,
 *     generado por el Panel del Docente; anónimo, solo con 5 alumnos o más).
 *   · Voces del grupo (foro por rondas): observaciones que compañeros compartieron sobre el
 *     mismo vínculo (VOCES_GRUPO, lo publica el Panel del Docente). Se puede responder, ver el
 *     hilo completo o adoptar el vínculo de otra lectura. Atributo voces-demo = voces de ejemplo.
 *   · Al terminar: FisicaSave.forjarConexion() por vínculo + completarFase(tema, 'dialogica'),
 *     y un snippet para informacionGrafo.json.
 *
 * Atributos:  tema (obligatorio) · fuente (JSON de preguntas) · grupo-demo (datos de ejemplo)
 * Convención: todo vínculo parte del tema de la nota (from = tema).
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
  var MIN_GRUPO = 5;
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var cargas = {};
  function script(global, archivo) {
    if (window[global]) return Promise.resolve();
    if (!cargas[archivo]) {
      cargas[archivo] = new Promise(function (ok) {
        var s = document.createElement('script');
        s.src = BASE + archivo + VERSION;
        s.onload = ok; s.onerror = ok;   // sin el archivo, el componente degrada con elegancia
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
  function fuentesTipograficas() {
    if (document.querySelector('link[data-dialogo-fuentes]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.setAttribute('data-dialogo-fuentes', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(l);
  }

  /* datos de ejemplo, deterministas, para ver la comparación sin grupo real */
  function grupoDemo(tema, destinos) {
    var h = 0; (tema + destinos.join('')).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; });
    var a = {}, n = 34;
    destinos.forEach(function (d, i) { h = (h * 1103515245 + 12345) >>> 0; a[d] = 3 + (h % 14) + (i === 0 ? 4 : 0); });
    return { n: n, a: a, demo: true };
  }

  var CSS = "\
:host{display:block;margin:1.5rem auto 2.5rem;max-width:720px;}\
*,*::before,*::after{box-sizing:border-box;}\
.dlg{--c:#A8780C;--t:#F6ECD4;--d:#6F4E08;font-family:'Newsreader',Georgia,serif;background:#FAF5EA;border:1px solid #E0D6C0;border-radius:6px;box-shadow:0 1px 0 #FFFCF5 inset,0 14px 34px -28px rgba(60,48,20,.4);padding:34px 36px 38px;color:#2A2722;}\
@media(max-width:680px){.dlg{padding:26px 20px 30px;}}\
.eb{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--d);}\
h1{font-size:28px;font-weight:500;margin:3px 0 6px;line-height:1.12;text-wrap:balance;}\
.lede{font-style:italic;font-size:15.5px;line-height:1.55;color:#5E584B;margin:0;text-wrap:pretty;}\
.sellada{margin:14px 0 0;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--d);background:var(--t);border:1px solid var(--c);border-radius:4px;padding:7px 11px;}\
.id{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0 6px;}\
.f{flex:1 1 190px;min-width:0;display:flex;flex-direction:column;gap:5px;}\
.lb{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#6B6557;}\
input,select,textarea{font-family:'Newsreader',serif;font-size:15px;color:#2A2722;background:#FCFAF4;border:1px solid #D8CDB4;border-radius:7px;padding:9px 12px;width:100%;}\
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--c);}\
textarea{resize:vertical;min-height:62px;line-height:1.5;font-size:14px;}\
.prog{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.08em;color:#6B6557;margin:18px 0 7px;}\
.track{height:6px;background:#E6DCC6;border-radius:4px;overflow:hidden;}\
.fill{height:100%;width:0;background:var(--c);border-radius:4px;transition:width .45s ease;}\
.q{border-top:1px solid #E6DCC6;padding-top:22px;margin-top:22px;}\
.qh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px;}\
.ctx{display:inline-flex;background:var(--t);border:1px solid var(--c);color:var(--d);border-radius:20px;padding:3px 12px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;}\
.num{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6B6557;}\
.qt{font-size:18.5px;font-weight:500;line-height:1.35;margin:0 0 16px;text-wrap:pretty;}\
.opts{display:flex;flex-direction:column;gap:9px;}\
.o{display:flex;gap:11px;align-items:flex-start;width:100%;text-align:left;background:#FCFAF4;border:1px solid #E9E1CE;border-radius:7px;padding:12px 15px;cursor:pointer;font-family:'Newsreader',serif;font-size:15px;line-height:1.45;color:#3A352D;}\
.o:hover{background:#F6F0E3;border-color:#D8CDB4;}\
.o .mk{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:1.5px solid #CFC3A8;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6B6557;margin-top:1px;}\
.o .dest{margin-left:auto;flex:0 0 auto;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6B6557;padding-top:3px;}\
.o.on{background:var(--t);border-color:var(--c);color:var(--d);font-weight:500;}\
.o.on .mk{background:var(--c);border-color:var(--c);color:#fff;}\
.o.propia{border-style:dashed;}\
.pr{display:none;margin-top:10px;padding:12px 14px;border:1px dashed var(--c);border-radius:7px;background:#FCFAF4;}\
.pr.show{display:flex;flex-direction:column;gap:9px;}\
.fb{display:none;margin-top:12px;font-size:13.5px;line-height:1.6;padding:11px 14px;border-radius:0 6px 6px 0;border-left:3px solid var(--c);background:#F6F0E3;color:#4A443A;}\
.fb.show{display:block;}\
.conn{display:inline-flex;gap:5px;background:var(--t);border:1px solid var(--c);color:var(--d);border-radius:20px;padding:2px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;margin:4px 0 2px;}\
.obs{display:none;margin-top:12px;}\
.obs.show{display:block;}\
.gr{display:none;margin-top:14px;padding:12px 14px 13px;border:1px solid #E6DCC6;border-radius:7px;background:#FCFAF4;}\
.gr.show{display:block;}\
.gr .k{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#6B6557;margin-bottom:9px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}\
.bar{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:4px 10px;align-items:center;margin:6px 0;}\
.bar .lab{font-size:13.5px;line-height:1.3;color:#4A443A;}\
.bar .lab b{font-weight:500;color:var(--d);}\
.bar .pct{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#4A443A;text-align:right;}\
.bar .tr{grid-column:1 / -1;height:5px;background:#EDE5D3;border-radius:3px;overflow:hidden;}\
.bar .tr i{display:block;height:100%;background:#CFC3A8;border-radius:3px;}\
.bar.mia .tr i{background:var(--c);}\
.gr .nota{font-size:12.5px;font-style:italic;color:#6B6557;margin:8px 0 0;line-height:1.45;}\
.fin{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:var(--c);border:none;border-radius:8px;padding:13px 22px;cursor:pointer;margin-top:26px;width:100%;}\
.fin:disabled{background:#D8CDB4;cursor:not-allowed;}\
.res{display:none;margin-top:26px;border:1px solid var(--c);border-radius:10px;overflow:hidden;}\
.res.show{display:block;}\
.rh{background:var(--t);padding:16px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--c);}\
.rh .k{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--d);}\
.rh .t{font-size:15px;line-height:1.45;margin-top:3px;max-width:44ch;}\
.acts{display:flex;gap:8px;flex-shrink:0;}\
.a{font-family:'IBM Plex Mono',monospace;font-size:11px;padding:8px 14px;border:1px solid #D8CDB4;border-radius:7px;background:#FCFAF4;color:#4A443A;cursor:pointer;}\
.a.p{background:var(--c);color:#fff;border-color:var(--c);}\
pre{margin:0;background:#2A2722;color:#E9DFC8;font-family:'IBM Plex Mono',monospace;font-size:12.5px;line-height:1.7;padding:18px 20px;overflow:auto;white-space:pre;max-height:320px;}\
.links{display:flex;gap:16px;flex-wrap:wrap;padding:14px 18px;background:#FCFAF4;}\
.links a{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--d);text-decoration:none;border-bottom:1.5px solid var(--c);}\
.vz{display:none;margin-top:14px;}.vz.show{display:block;}.vz .k{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#6B6557;margin-bottom:8px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}.voz{border:1px solid #E6DCC6;border-radius:7px;background:#FCFAF4;padding:11px 14px;margin:8px 0;}.voz.otra{border-style:dashed;}.voz .tx{font-size:14.5px;line-height:1.5;color:#3A352D;margin:0;text-wrap:pretty;}.voz .meta{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6B6557;margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;}.voz .meta button{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--d);background:none;border:none;border-bottom:1px solid var(--c);padding:0 0 1px;cursor:pointer;}.voz .rs{margin:8px 0 0 14px;padding-left:10px;border-left:2px solid #E6DCC6;}.voz .rs p{margin:4px 0;font-size:13.5px;line-height:1.45;color:#4A443A;}.voz .rs span{font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#6B6557;}.voz .rf{display:none;margin-top:9px;gap:8px;flex-direction:column;}.voz .rf.show{display:flex;}.voz .rf button{align-self:flex-start;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#fff;background:var(--c);border:none;border-radius:6px;padding:7px 13px;cursor:pointer;}.voz .ok{font-size:12.5px;font-style:italic;color:var(--d);margin:6px 0 0;}.comp{margin-top:24px;padding:14px 16px;border:1px solid #E6DCC6;border-radius:7px;background:#FCFAF4;display:flex;flex-direction:column;gap:10px;}.comp label{display:flex;gap:9px;align-items:flex-start;font-size:14.5px;line-height:1.45;cursor:pointer;}.comp input{width:auto;margin-top:3px;accent-color:var(--c);}.comp .firmas{display:flex;gap:18px;flex-wrap:wrap;padding-left:24px;}.comp .firmas label{font-size:13.5px;}.comp .firmas.off{opacity:.45;pointer-events:none;}.err{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#8C2F17;border:1px dashed #8C2F17;border-radius:4px;padding:10px 12px;background:#FBF3EF;}\
";

  /* Quarto enfoca su buscador al teclear «f», «s» o «/» si no ve un campo de texto enfocado,
     y desde fuera un campo dentro de shadow DOM no se ve (document.activeElement es el
     elemento anfitrión). Las teclas escritas en un campo no salen del componente. */
  function aislarTeclado(raiz) {
    if (raiz._teclado) return;
    raiz._teclado = true;
    ['keydown', 'keypress', 'keyup'].forEach(function (tipo) {
      raiz.addEventListener(tipo, function (e) {
        var o = e.target;
        if (o && (/^(INPUT|TEXTAREA|SELECT)$/.test(o.tagName) || o.isContentEditable)) e.stopPropagation();
      });
    });
  }

  class DialogoTema extends HTMLElement {
    static get observedAttributes() { return ['tema', 'grupo-demo', 'voces-demo']; }
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      aislarTeclado(this.shadowRoot);
      fuentesTipograficas();
      this._iniciar();
    }
    attributeChangedCallback() { if (this.shadowRoot) this._iniciar(); }

    _iniciar() {
      var self = this, tema = this.getAttribute('tema');
      if (!tema) return;
      var turno = (this._turno = (this._turno || 0) + 1);
      var fuente = this.getAttribute('fuente') || (BASE + 'dialogicas.json' + VERSION);
      Promise.all([
        script('MAPA_CONOCIMIENTO', '../mapa.js'),
        script('DESCUBRIMIENTOS', '../descubrimientos.js'),
        script('FisicaSave', '../fisica-save.js'),
        script('GRUPO_STATS', 'grupo-stats.js'),
        script('VOCES_GRUPO', 'voces-grupo.js'),
        script('FisicaRutas', '../scripts/rutas.js')
      ]).then(function () { return json(fuente); }).then(function (datos) {
        if (turno !== self._turno) return;
        var D = datos.temas && datos.temas[tema];
        if (!D) throw new Error('dialogicas.json no tiene preguntas para ' + tema);
        self._pintar(tema, D);
      }).catch(function (e) {
        if (turno !== self._turno) return;
        self.shadowRoot.innerHTML = '<style>' + CSS + '</style><div class="err">dialogo-tema: ' + esc(e.message) + '</div>';
      });
    }

    _siguienteHTML(tema) {
      return window.customElements.get('siguiente-tema') ? '<siguiente-tema tema="' + esc(tema) + '" variante="bloque"></siguiente-tema>' : '';
    }

    _nodo(id) { var M = window.MAPA_CONOCIMIENTO; return M && M.nodos.filter(function (n) { return n.id === id; })[0]; }

    _grupo(tema, destinos) {
      if (this.hasAttribute('grupo-demo')) return grupoDemo(tema, destinos);
      var V = window.GRUPO_STATS && window.GRUPO_STATS.vinculos && window.GRUPO_STATS.vinculos[tema];
      return V && V.n >= MIN_GRUPO ? V : null;
    }

    _pintar(tema, D) {
      var self = this, R = this.shadowRoot, M = window.MAPA_CONOCIMIENTO || { nodos: [], regiones: [] };
      var nodo = this._nodo(tema) || { label: tema, title: '', unit: '' };
      var FS = window.FisicaSave;
      this.tema = tema; this.D = D; this.sel = {};

      var pal = { c: '#A8780C', t: '#F6ECD4', d: '#6F4E08' }, ruta = '';
      try {
        var cl = FS && FS.getClase(), Rr = cl && window.DESCUBRIMIENTOS && window.DESCUBRIMIENTOS.rutas[cl];
        if (Rr) { pal = { c: Rr.color, t: Rr.tint, d: Rr.deep }; ruta = ' · Ruta ' + Rr.name; }
      } catch (e) {}
      var sellada = false;
      try { var s = FS.get(); sellada = !!(s.fases && s.fases[tema] && s.fases[tema].dialogica); } catch (e) {}

      var opcionesTemas = M.nodos.filter(function (n) { return n.id !== tema; })
        .map(function (n) { return '<option value="' + n.id + '">' + esc(n.label + ' · ' + n.title) + '</option>'; }).join('');

      var h = '<style>' + CSS + '</style><div class="dlg" style="--c:' + pal.c + ';--t:' + pal.t + ';--d:' + pal.d + ';">'
        + '<div class="eb">Dialógica · ' + esc(nodo.label) + ' · Fase V' + esc(ruta) + '</div>'
        + '<h1>' + esc(D.titulo || ('Traza tu cartografía de ' + nodo.title)) + '</h1>'
        + '<p class="lede">Aquí no hay respuestas correctas. Cada elección traza un vínculo entre ' + esc(nodo.label) + ' y otro tema: el dibujo de cómo tú organizas lo aprendido. Si ninguna opción te convence, traza la tuya.</p>'
        + (sellada ? '<div class="sellada">Ya sellaste esta fase. Puedes volver a trazar: los vínculos nuevos se suman a tu Atlas.</div>' : '')
        + '<div class="id"><div class="f"><label class="lb" for="al">Nombre</label><input id="al" type="text" placeholder="Tu nombre completo"></div>'
        + '<div class="f"><label class="lb" for="cu">Número de cuenta</label><input id="cu" type="text" placeholder="Ej. 123456789"></div></div>'
        + '<div class="prog" id="prog"></div><div class="track"><div class="fill" id="fill"></div></div>';

      D.preguntas.forEach(function (p, qi) {
        h += '<div class="q" data-q="' + qi + '"><div class="qh"><span class="ctx">Desde ' + esc(nodo.label) + '</span><span class="num">' + (qi + 1) + ' / ' + D.preguntas.length + '</span></div>'
          + '<p class="qt">' + esc(p.q) + '</p><div class="opts">';
        p.opts.forEach(function (o, oi) {
          var dn = self._nodo(o.to);
          h += '<button class="o" type="button" data-o="' + oi + '"><span class="mk">' + ROMAN[oi] + '</span><span>' + esc(o.label) + '</span><span class="dest">→ ' + esc(dn ? dn.label : o.to) + '</span></button>';
        });
        h += '<button class="o propia" type="button" data-o="propia"><span class="mk">+</span><span>Ninguna me convence: trazo otra conexión</span></button></div>'
          + '<div class="pr" data-pr><label class="lb">¿Con qué tema lo conectas?</label><select data-to><option value="">— elige un tema —</option>' + opcionesTemas + '</select>'
          + '<label class="lb">¿Por qué?</label><textarea data-porque placeholder="Escribe la relación que ves entre los dos temas."></textarea></div>'
          + '<div class="fb" data-fb></div>'
          + '<div class="obs" data-obs><label class="lb" style="display:block;margin-bottom:5px;">Amplía tu observación (opcional)</label><textarea data-obs-t placeholder="¿Por qué elegiste esta conexión?"></textarea></div>'
          + '<div class="gr" data-gr></div><div class="vz" data-vz></div></div>';
      });

      h += '<div class="comp"><label><input type="checkbox" id="compartir"> <span>Compartir mis observaciones con el grupo. Aparecerán en la siguiente ronda, junto a las de mis compañeros.</span></label>'
        + '<div class="firmas off" id="firmas"><label><input type="radio" name="firma" value="anonimo" checked> Anónimo</label><label><input type="radio" name="firma" value="nombre"> Con mi nombre</label></div></div>'
        + '<button class="fin" id="fin" type="button" disabled>Forjar vínculos y sellar la fase</button>'
        // siguiente tema de la ruta (rutas.js): aparece al sellar, o desde el inicio si la fase ya estaba sellada
        + '<div id="sig">' + (sellada ? this._siguienteHTML(tema) : '') + '</div>'
        + '<div class="res" id="res"><div class="rh"><div><div class="k">⟡ Vínculos forjados en tu Atlas</div>'
        + '<div class="t">Ya aparecen en tu Atlas. Para conservarlos de forma permanente, pega el snippet en <code>informacionGrafo.json</code> o descárgalo.</div></div>'
        + '<div class="acts"><button class="a" id="copy" type="button">Copiar</button><button class="a p" id="down" type="button">Descargar .json</button></div></div>'
        + '<pre id="snip"></pre><div class="links"><a href="' + RAIZ + 'nota-A.html">Ver mi Atlas →</a><a href="' + RAIZ + 'mapa.html">Ver el Mapa →</a><a href="' + RAIZ + 'codice.html">Ver el Códice →</a></div></div></div>';
      R.innerHTML = h;

      try { var sv = FS.get(); if (sv.alumno) R.getElementById('al').value = sv.alumno; if (sv.cuenta) R.getElementById('cu').value = sv.cuenta; } catch (e) {}

      R.querySelectorAll('.q').forEach(function (card) {
        var qi = +card.getAttribute('data-q');
        card.querySelectorAll('.o').forEach(function (b) {
          b.addEventListener('click', function () { self._elegir(qi, b.getAttribute('data-o'), card); });
        });
        card.querySelector('[data-to]').addEventListener('change', function () { self._propia(qi, card); });
        card.querySelector('[data-porque]').addEventListener('input', function () { self._propia(qi, card); });
      });
      R.getElementById('compartir').addEventListener('change', function (e) { R.getElementById('firmas').classList.toggle('off', !e.target.checked); });
      R.getElementById('fin').addEventListener('click', function () { self._terminar(); });
      R.getElementById('copy').addEventListener('click', function () { self._copiar(); });
      R.getElementById('down').addEventListener('click', function () { self._descargar(); });
      this._progreso();
    }

    _elegir(qi, o, card) {
      card.querySelectorAll('.o').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-o') === o); });
      var pr = card.querySelector('[data-pr]'), fb = card.querySelector('[data-fb]'), ob = card.querySelector('[data-obs]');
      if (o === 'propia') {
        pr.classList.add('show'); fb.classList.remove('show'); ob.classList.remove('show');
        delete this.sel[qi];
        this._propia(qi, card);
        return;
      }
      pr.classList.remove('show');
      var opt = this.D.preguntas[qi].opts[+o];
      this.sel[qi] = { to: opt.to, obs: opt.obs, propia: false };
      var dn = this._nodo(opt.to);
      fb.innerHTML = 'Tu perspectiva traza el vínculo<br><span class="conn">' + esc(this.tema) + ' → ' + esc(opt.to) + '</span>'
        + (dn ? ' <span style="font-size:12.5px;color:#6B6557;">' + esc(dn.title) + '</span>' : '')
        + '<span style="display:block;margin-top:5px;font-style:italic;color:var(--d);">' + esc(opt.obs) + '</span>';
      fb.classList.add('show'); ob.classList.add('show');
      var ta = card.querySelector('[data-obs-t]'); if (!ta.value || ta.dataset.auto) { ta.value = opt.obs; ta.dataset.auto = '1'; }
      ta.oninput = function () { delete ta.dataset.auto; };
      this._grupoPanel(qi, card, opt.to);
      this._vocesPanel(qi, card, opt.to);
      this._progreso();
    }

    _propia(qi, card) {
      var to = card.querySelector('[data-to]').value, por = card.querySelector('[data-porque]').value.trim();
      if (!card.querySelector('.o.propia').classList.contains('on')) return;
      if (to && por) this.sel[qi] = { to: to, obs: por, propia: true };
      else delete this.sel[qi];
      if (to) { this._grupoPanel(qi, card, to); this._vocesPanel(qi, card, to); }
      else { card.querySelector('[data-gr]').classList.remove('show'); card.querySelector('[data-vz]').classList.remove('show'); }
      this._progreso();
    }

    _grupoPanel(qi, card, elegido) {
      var self = this, p = this.D.preguntas[qi], gr = card.querySelector('[data-gr]');
      var destinos = p.opts.map(function (o) { return o.to; });
      if (destinos.indexOf(elegido) === -1) destinos = destinos.concat([elegido]);
      var G = this._grupo(this.tema, destinos);
      if (!G) {
        gr.innerHTML = '<div class="k"><span>Cómo lo trazó el grupo</span></div><p class="nota" style="margin:0;">Todavía no hay datos del grupo para este tema. Cuando tu profesor publique las estadísticas, aquí verás cómo lo conectaron tus compañeros, sin nombres.</p>';
        gr.classList.add('show');
        return;
      }
      var filas = destinos.map(function (d) {
        var k = (G.a && G.a[d]) || 0, pct = Math.round(k / G.n * 100);
        var dn = self._nodo(d), opt = p.opts.filter(function (o) { return o.to === d; })[0];
        var etiqueta = opt ? opt.label : 'Tu conexión propia';
        return '<div class="bar' + (d === elegido ? ' mia' : '') + '"><span class="lab">' + (d === elegido ? '<b>' + esc(etiqueta) + '</b>' : esc(etiqueta))
          + ' <span style="font-family:IBM Plex Mono,monospace;font-size:10px;color:#6B6557;">→ ' + esc(dn ? dn.label : d) + '</span></span>'
          + '<span class="pct">' + pct + ' %</span><span class="tr"><i style="width:' + pct + '%"></i></span></div>';
      }).join('');
      var raro = ((G.a && G.a[elegido]) || 0) / G.n < 0.15;
      gr.innerHTML = '<div class="k"><span>Cómo lo trazó el grupo</span><span>' + G.n + ' alumnos' + (G.demo ? ' · datos de ejemplo' : '') + '</span></div>' + filas
        + '<p class="nota">' + (raro
          ? 'Pocos trazaron este vínculo. No es un error: es una lectura menos transitada, y vale la pena que la expliques en tu observación.'
          : 'Porcentaje de compañeros que conectó ' + esc(this.tema) + ' con cada tema, en esta u otra pregunta. Una misma persona puede trazar varios.') + '</p>';
      gr.classList.add('show');
    }

    _voces() {
      if (this.hasAttribute('voces-demo')) return this._vocesDemo();
      return (window.VOCES_GRUPO && window.VOCES_GRUPO.voces) || [];
    }
    _vocesDemo() {
      var t = this.tema, D = this.D, out = [], textos = [
        'Lo vi así porque la misma resta de números parecidos aparece en los dos temas.',
        'Para mí la conexión es de método: se cambia el algoritmo y el problema queda igual.',
        'Me costó al principio, pero al hacer el laboratorio lo entendí por este lado.',
        'Creo que es la misma idea con otro nombre: cuánto crece un error pequeño.'
      ];
      D.preguntas.forEach(function (p, qi) {
        p.opts.forEach(function (o, oi) {
          out.push({ id: 'd' + qi + oi, from: t, to: o.to, texto: textos[(qi + oi) % textos.length], fecha: '2026-09-1' + oi,
            firma: oi === 1 ? 'Ana R.' : 'Anónimo',
            respuestas: oi === 0 ? [{ id: 'dr' + qi, texto: 'Yo lo conecté distinto, pero tu argumento me convence.', fecha: '2026-09-18', firma: 'Anónimo' }] : [] });
        });
      });
      return out;
    }
    _vocesPanel(qi, card, destino) {
      var self = this, t = this.tema, vz = card.querySelector('[data-vz]');
      var todas = this._voces().filter(function (v) { return !v.via; });
      var mismas = todas.filter(function (v) { return (v.from === t && v.to === destino) || (v.to === t && v.from === destino); });
      var otras = todas.filter(function (v) { return (v.from === t || v.to === t) && v.to !== destino && v.from !== destino; });
      var ronda = this.hasAttribute('voces-demo') ? 'ejemplo' : (window.VOCES_GRUPO ? 'ronda ' + window.VOCES_GRUPO.ronda : '');
      if (!mismas.length && !otras.length) {
        vz.innerHTML = '<div class="k"><span>Voces del grupo</span></div><p class="nota" style="font-size:12.5px;font-style:italic;color:#6B6557;margin:0;">Todavía nadie ha compartido una observación sobre este vínculo. Si compartes la tuya, abrirás el hilo en la próxima ronda.</p>';
        vz.classList.add('show');
        return;
      }
      var abierto = vz.dataset.hilo === destino;
      var visibles = abierto ? mismas : mismas.slice(0, 2);
      var h = '<div class="k"><span>Voces del grupo · ' + esc(t) + ' → ' + esc(destino) + '</span><span>' + esc(ronda) + '</span></div>';
      h += visibles.map(function (v) { return self._vozHTML(v, false, abierto); }).join('');
      if (mismas.length > 2 || (mismas.some(function (v) { return v.respuestas && v.respuestas.length; }) && !abierto)) {
        h += '<div class="voz" style="border:none;background:none;padding:0 2px;margin:4px 0 8px;"><div class="meta"><button type="button" data-hilo>' + (abierto ? 'Cerrar el hilo' : 'Ver el hilo completo (' + mismas.length + (mismas.length === 1 ? ' voz' : ' voces') + ')') + '</button></div></div>';
      }
      if (otras.length) {
        var otra = otras[(qi + mismas.length) % otras.length];
        h += '<div class="k" style="margin-top:12px;"><span>Otra lectura del grupo</span></div>' + this._vozHTML(otra, true, false);
      }
      vz.innerHTML = h;
      vz.classList.add('show');
      var bh = vz.querySelector('[data-hilo]');
      if (bh) bh.addEventListener('click', function () { vz.dataset.hilo = abierto ? '' : destino; self._vocesPanel(qi, card, destino); });
      vz.querySelectorAll('[data-responder]').forEach(function (b) {
        b.addEventListener('click', function () { vz.querySelector('[data-rf="' + b.getAttribute('data-responder') + '"]').classList.toggle('show'); });
      });
      vz.querySelectorAll('[data-enviar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-enviar'), box = vz.querySelector('[data-rf="' + id + '"]');
          var texto = box.querySelector('textarea').value.trim();
          if (!texto) return;
          var firma = (self.shadowRoot.querySelector('input[name="firma"]:checked') || {}).value || 'anonimo';
          try { window.FisicaSave.responderVoz(id, texto, firma); } catch (e) {}
          box.innerHTML = '<p class="ok">Tu respuesta viajará en tu próxima entrega y aparecerá publicada en la ronda siguiente.</p>';
        });
      });
      vz.querySelectorAll('[data-adoptar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = todas.filter(function (x) { return x.id === b.getAttribute('data-adoptar'); })[0];
          if (!v) return;
          var dest = v.from === t ? v.to : v.from;
          var extra = card.querySelectorAll('.adoptado').length;
          var key = qi + '·' + dest;
          self.sel[key] = { to: dest, obs: 'A partir de una voz del grupo: ' + v.texto, propia: false, adoptadaDe: v.id };
          b.outerHTML = '<span style="color:var(--d);">✓ Vínculo ' + esc(t) + ' → ' + esc(dest) + ' añadido a los que vas a forjar</span>';
          self._progreso();
        });
      });
    }
    _vozHTML(v, esOtra, conRespuestas) {
      var t = this.tema, dest = v.from === t ? v.to : v.from, dn = this._nodo(dest);
      var rs = (conRespuestas && v.respuestas && v.respuestas.length)
        ? '<div class="rs">' + v.respuestas.map(function (r) { return '<p>' + esc(r.texto) + ' <span>— ' + esc(r.firma) + ' · ' + esc(r.fecha) + '</span></p>'; }).join('') + '</div>' : '';
      var nr = (v.respuestas || []).length;
      return '<div class="voz' + (esOtra ? ' otra' : '') + '">'
        + (esOtra ? '<div class="meta" style="margin:0 0 6px;"><span class="conn" style="margin:0;">' + esc(t) + ' → ' + esc(dest) + '</span>' + (dn ? '<span>' + esc(dn.title) + '</span>' : '') + '</div>' : '')
        + '<p class="tx">' + esc(v.texto) + '</p>'
        + '<div class="meta"><span>' + esc(v.firma) + ' · ' + esc(v.fecha) + (nr && !conRespuestas ? ' · ' + nr + (nr === 1 ? ' respuesta' : ' respuestas') : '') + '</span>'
        + '<button type="button" data-responder="' + esc(v.id) + '">Responder</button>'
        + (esOtra ? '<button type="button" data-adoptar="' + esc(v.id) + '">Adoptar su vínculo</button>' : '')
        + '</div>' + rs
        + '<div class="rf" data-rf="' + esc(v.id) + '"><textarea placeholder="Tu respuesta a esta observación"></textarea><button type="button" data-enviar="' + esc(v.id) + '">Enviar respuesta</button></div>'
        + '</div>';
    }

    _progreso() {
      var R = this.shadowRoot, tot = this.D.preguntas.length;
      var n = Object.keys(this.sel).filter(function (k) { return k.indexOf('·') === -1; }).length;
      R.getElementById('prog').textContent = n + ' de ' + tot + ' vínculos trazados';
      R.getElementById('fill').style.width = (tot ? n / tot * 100 : 0) + '%';
      R.getElementById('fin').disabled = Object.keys(this.sel).length === 0;
    }

    _terminar() {
      var self = this, R = this.shadowRoot, FS = window.FisicaSave;
      var keys = Object.keys(this.sel);
      keys.forEach(function (qi) {
        if (self.sel[qi].propia || String(qi).indexOf('·') > -1) return;
        var ta = R.querySelector('.q[data-q="' + qi + '"] [data-obs-t]');
        if (ta && ta.value.trim()) self.sel[qi].obs = ta.value.trim();
      });
      var alumno = R.getElementById('al').value.trim(), cuenta = R.getElementById('cu').value.trim();
      if (FS) {
        try {
          if (alumno || cuenta) FS.setIdentidad(cuenta || null, alumno || null);
          var comp = R.getElementById('compartir').checked;
          var firma = (R.querySelector('input[name="firma"]:checked') || {}).value || 'anonimo';
          keys.forEach(function (qi) {
            var s = self.sel[qi];
            FS.forjarConexion(self.tema, s.to, s.obs, { compartir: comp, firma: firma, propia: !!s.propia, adoptadaDe: s.adoptadaDe || null });
          });
          FS.completarFase(self.tema, 'dialogica');
        } catch (e) {}
      }
      var fecha = new Date().toISOString().slice(0, 10);
      this.entradas = keys.map(function (qi) {
        var e = { from: self.tema, to: self.sel[qi].to, observacion: self.sel[qi].obs, fecha: fecha, cuenta: cuenta || 'sin-cuenta' };
        if (alumno) e.alumno = alumno;
        if (self.sel[qi].propia) e.propia = true;
        if (self.sel[qi].adoptadaDe) e.adoptadaDe = self.sel[qi].adoptadaDe;
        if (R.getElementById('compartir').checked) { e.compartir = true; e.firma = (R.querySelector('input[name="firma"]:checked') || {}).value || 'anonimo'; }
        return e;
      });
      R.getElementById('snip').textContent = this.entradas.map(function (e) { return JSON.stringify(e, null, 2); }).join(',\n');
      R.getElementById('res').classList.add('show');
      var sig = R.getElementById('sig');
      if (sig && !sig.firstChild) sig.innerHTML = this._siguienteHTML(this.tema);
      this.dispatchEvent(new CustomEvent('fisica:dialogica', { bubbles: true, composed: true, detail: { tema: this.tema, vinculos: this.entradas.length } }));
    }

    _copiar() {
      var b = this.shadowRoot.getElementById('copy'), t = this.shadowRoot.getElementById('snip').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(t);
      b.textContent = '✓ Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 2000);
    }

    _descargar() {
      var cuenta = this.shadowRoot.getElementById('cu').value.trim() || 'alumno', fecha = new Date().toISOString().slice(0, 10);
      var blob = new Blob([JSON.stringify({ _instrucciones: 'Pega el contenido de "conexiones" dentro del array homónimo en informacionGrafo.json', generadoEl: fecha, cuenta: cuenta, conexiones: this.entradas || [] }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'conexiones_' + this.tema + '_' + cuenta + '_' + fecha + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }
  }

  if (!window.customElements.get('dialogo-tema')) window.customElements.define('dialogo-tema', DialogoTema);
})();
