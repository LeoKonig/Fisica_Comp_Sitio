/*
 * rutas.js — rutas de estudio por unidad: completa · óptima · personalizada.
 *
 *   · <rutas-unidad unidad="u1" optima="u1t1 u1t3 u1t5" [completa="…"] [catalogo="…"]>
 *       Va en la portada de cada unidad (uX.qmd). Declara las rutas y deja que el alumno elija.
 *         completa  por omisión, la lista de interludios.json → unidades.uX
 *         optima    la ruta corta (si falta, igual a la completa)
 *         catalogo  notas elegibles en la ruta personalizada; por omisión, la unión de la ruta
 *                   completa y los nodos uXtN de mapa.js
 *       Las listas se separan con espacios o comas. Se guardan en el navegador al visitar la
 *       portada, así las demás páginas (quest, narrativa) conocen la versión vigente.
 *       Nombre y descripción de cada opción (opcionales, las tres rutas los aceptan):
 *         optima-nombre="Ruta práctica"  optima-desc="Lo mínimo para llegar al laboratorio."
 *         completa-nombre / completa-desc · personalizada-nombre / personalizada-desc
 *
 *   · <siguiente-tema [tema="u1t3"] [variante="bloque"]>
 *       variante="bloque": botón a todo el ancho (para colocarlo bajo otro botón, p. ej. en dialogo.js).
 *       Botón al siguiente tema según la ruta elegida. Sin «tema», lo toma de window.QUEST_TEMA
 *       o del nombre de la página (u1t3g.html → u1t3). Al final de la ruta lleva al primer tema
 *       pendiente de la ruta o, si no queda ninguno, a la portada de la unidad siguiente.
 *
 *   · window.FisicaRutas
 *       elegida(u)      temas de la ruta que eligió el alumno, o null si no ha elegido
 *                       (narrativa.js usa entonces interludios.json, como antes)
 *       temas(u)        la ruta efectiva: elegida o completa
 *       modo(u)         'completa' | 'optima' | 'personalizada'
 *       elegir(u, modo, temas?)
 *       siguiente(tema) { tipo: 'tema' | 'pendiente' | 'unidad', id, url, titulo } o null
 *       catalogo(u), completa(u), optima(u)
 *
 *   · Evento 'fisica:ruta' (detail: { unidad }) al cambiar una ruta. narrativa.js lo escucha para
 *     revisar si la unidad quedó completa con la nueva ruta.
 *
 * La elección vive en localStorage («fisica-rutas», separada por cuenta si FisicaSave la tiene).
 * Requiere (opcional pero recomendado): mapa.js para los títulos, descubrimientos.js para los
 * colores de la ruta del alumno, fisica-save.js para saber qué temas están completos.
 */
(function () {
  if (window.FisicaRutas) return;

  var BASE = (function () { try { return new URL('.', document.currentScript.src).href; } catch (e) { return '/'; } })();
  var BASE = (function () { try { return new URL('.', document.currentScript.src).href; } catch (e) { return '/'; } })();
  var RAIZ = (function () { try { return new URL('../', BASE).href; } catch (e) { return '/'; } })();
  var SECCIONES = window.RUTAS_SECCIONES || (RAIZ + 'secciones/');
  var K_ELEC = 'fisica-rutas', K_DEFS = 'fisica-rutas-defs';
  var NOMBRES = { completa: 'Ruta completa', optima: 'Ruta óptima', personalizada: 'Ruta personalizada' };
  var DESCS = { completa: 'Todos los temas de la unidad, en orden.', optima: 'Lo esencial para continuar.', personalizada: 'Tú eliges qué notas recorrer.' };
  var ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  var unidadesJSON = null;

  /* ── utilidades ── */
  function FS() { return window.FisicaSave || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lista(x) { return Array.isArray(x) ? x.slice() : String(x == null ? '' : x).split(/[\s,]+/).filter(Boolean); }
  function num(t) { var m = /^u(\d+)t(\d+)$/.exec(t || ''); return m ? (+m[1]) * 1000 + (+m[2]) : Infinity; }
  function porOrden(a, b) { return num(a) - num(b); }
  function unidadDe(t) { var m = /^(u\d+)/.exec(t || ''); return m ? m[1] : null; }
  function romano(u) { var n = +String(u).slice(1); return ROMANOS[n] || String(n); }
  function unico(a) { var s = {}; return a.filter(function (x) { return s[x] ? false : (s[x] = true); }); }
  function esTemaDe(u) { var re = new RegExp('^' + u + 't\\d+$'); return function (t) { return re.test(t); }; }
  function leer(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function claveElec() {
    var c = '';
    try { var s = FS() && FS().get && FS().get(); if (s && s.cuenta) c = ':' + s.cuenta; } catch (e) {}
    return K_ELEC + c;
  }
  function avisar(u) { try { document.dispatchEvent(new CustomEvent('fisica:ruta', { detail: { unidad: u } })); } catch (e) {} }

  function nodos() { return (window.MAPA_CONOCIMIENTO && window.MAPA_CONOCIMIENTO.nodos) || []; }
  function nodo(t) { return nodos().filter(function (n) { return n.id === t; })[0] || null; }
  function titulo(t) { var n = nodo(t); return (n && (n.title || n.label)) || t; }
  function etiqueta(t) { var n = nodo(t); return (n && n.label) || t.replace(/^u(\d+)t(\d+)$/, 'T$2'); }
  function completadas() { try { return (FS() && FS().completadas && FS().completadas()) || []; } catch (e) { return []; } }

  /* ── definiciones del autor (declaradas en uX.qmd) ── */
  function defs(u) { return leer(K_DEFS)[u] || {}; }
  function catalogo(u) {
    var D = defs(u), ok = esTemaDe(u);
    if (D.catalogo && D.catalogo.length) return D.catalogo.filter(ok).sort(porOrden);
    return unico([].concat(D.completa || [], (unidadesJSON && unidadesJSON[u]) || [],
      nodos().map(function (n) { return n.id; }))).filter(ok).sort(porOrden);
  }
  function completa(u) {
    var D = defs(u);
    if (D.completa && D.completa.length) return D.completa.slice();
    if (unidadesJSON && unidadesJSON[u]) return unidadesJSON[u].slice();
    return catalogo(u);
  }
  function optima(u) { var D = defs(u); return D.optima && D.optima.length ? D.optima.slice() : completa(u); }
  // nombre y descripción de cada ruta: los de uX.qmd si los hay, si no los de omisión
  function nombreRuta(u, m) { var t = defs(u).textos || {}; return (t[m] && t[m].nombre) || NOMBRES[m] || m; }
  function descRuta(u, m) { var t = defs(u).textos || {}; return (t[m] && t[m].desc) || DESCS[m] || ''; }

  /* ── elección del alumno ── */
  function registro(u) { return leer(claveElec())[u] || null; }
  function modo(u) { var r = registro(u); return (r && r.modo) || 'completa'; }
  /* La ruta completa y la óptima siguen a la definición vigente del autor (si cambia uX.qmd,
     cambia para todos). La personalizada es la lista que armó el alumno. */
  function elegida(u) {
    var r = registro(u); if (!r) return null;
    var D = defs(u);
    if (r.modo === 'completa') return D.completa && D.completa.length ? D.completa.slice() : null;
    if (r.modo === 'optima' && D.optima && D.optima.length) return D.optima.slice();
    return r.temas && r.temas.length ? r.temas.slice() : null;
  }
  function temas(u) { return elegida(u) || completa(u); }
  function elegir(u, m, t) {
    if (!NOMBRES[m]) return;
    var todo = leer(claveElec()), prev = todo[u] || null;
    var lst = m === 'optima' ? optima(u) : m === 'completa' ? completa(u)
      : unico(lista(t != null ? t : ((prev && prev.personal) || temas(u)))).filter(esTemaDe(u)).sort(porOrden);
    if (!lst.length) return;
    if (prev && prev.modo === m && (prev.temas || []).join() === lst.join()) return;
    todo[u] = { modo: m, temas: lst, personal: m === 'personalizada' ? lst : ((prev && prev.personal) || null), fecha: new Date().toISOString() };
    escribir(claveElec(), todo);
    avisar(u);
  }

  /* ── navegación ── */
  function urlTema(t) { return SECCIONES + t + '.html'; }
  function existeUnidad(u) {
    var ok = esTemaDe(u);
    return !!((unidadesJSON && unidadesJSON[u]) || defs(u).completa || nodos().some(function (n) { return ok(n.id); }));
  }
  function pendiente(u, excepto) {
    var hechas = completadas();
    return temas(u).filter(function (t) { return t !== excepto && hechas.indexOf(t) === -1; })[0] || null;
  }
  function siguiente(tema) {
    var u = unidadDe(tema); if (!u) return null;
    var r = temas(u), i = r.indexOf(tema);
    // si el tema no está en la ruta (el alumno se desvió), se sigue con el próximo de la ruta
    var despues = i !== -1 ? r.slice(i + 1) : r.filter(function (t) { return num(t) > num(tema); });
    if (despues.length) return { tipo: 'tema', id: despues[0], url: urlTema(despues[0]), titulo: titulo(despues[0]) };
    var falta = pendiente(u, tema);
    if (falta) return { tipo: 'pendiente', id: falta, url: urlTema(falta), titulo: titulo(falta) };
    var nu = 'u' + (+u.slice(1) + 1);
    if (existeUnidad(nu)) return { tipo: 'unidad', id: nu, url: SECCIONES + nu + '.html', titulo: 'Unidad ' + romano(nu) };
    return null;
  }

  /* ── barra lateral: atenúa los temas que quedan fuera de la ruta (siguen siendo accesibles) ── */
  function marcarBarra() {
    if (!document.getElementById('rutas-estilo')) {
      var st = document.createElement('style'); st.id = 'rutas-estilo';
      st.textContent = '.fuera-de-ruta{opacity:.45;transition:opacity .2s}.fuera-de-ruta:hover{opacity:.85}';
      (document.head || document.documentElement).appendChild(st);
    }
    var links = document.querySelectorAll('#quarto-sidebar a[href]');
    Array.prototype.forEach.call(links, function (a) {
      var m = /(?:^|\/)(u\d+t\d+)\.html(?:[#?].*)?$/.exec(a.getAttribute('href') || ''); if (!m) return;
      var t = m[1], fuera = temas(unidadDe(t)).indexOf(t) === -1;
      var item = (a.closest && a.closest('.sidebar-item')) || a;
      item.classList.toggle('fuera-de-ruta', fuera);
      if (fuera) a.setAttribute('title', 'Fuera de tu ruta');
      else if (a.getAttribute('title') === 'Fuera de tu ruta') a.removeAttribute('title');
    });
  }

  /* ── colores y fuentes ── */
  function paleta() {
    var R = null;
    try {
      var rs = (window.DESCUBRIMIENTOS && window.DESCUBRIMIENTOS.rutas) || {};
      var c = FS() && FS().getClase && FS().getClase();
      R = rs[c] || rs.mercury || null;
    } catch (e) {}
    return { color: (R && R.color) || '#A8A8A8', tint: (R && R.tint) || '#F0F0F0', deep: (R && R.deep) || '#707070' };
  }
  (function fuentes() {
    if (document.querySelector('link[data-rutas-fuentes]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.setAttribute('data-rutas-fuentes', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap';
    (document.head || document.documentElement).appendChild(l);
  })();

  /* ── repintado de los componentes vivos ── */
  var vivos = [];
  function repintarTodo() {
    vivos.slice().forEach(function (el) { try { el._pintar(); } catch (e) {} });
    marcarBarra();
  }
  ['fisica:ruta', 'fisica:fase', 'fisica:nota', 'fisica:rutas-listas'].forEach(function (ev) { document.addEventListener(ev, repintarTodo); });
  window.addEventListener('focus', repintarTodo);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', repintarTodo); else setTimeout(repintarTodo, 0);
  (function esperarMapa(n) {
    if (window.MAPA_CONOCIMIENTO) return repintarTodo();
    if (n < 60) setTimeout(function () { esperarMapa(n + 1); }, 80);
  })(0);

  // la ruta completa por omisión sale de interludios.json (la misma lista que usaba narrativa.js)
  fetch(BASE + 'interludios.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { unidadesJSON = (j && j.unidades) || null; })
    .catch(function () {})
    .then(function () { try { document.dispatchEvent(new CustomEvent('fisica:rutas-listas')); } catch (e) {} });

  /* ── <rutas-unidad> ── */
  if (!customElements.get('rutas-unidad')) {
    customElements.define('rutas-unidad', class extends HTMLElement {
      connectedCallback() {
        var self = this, u = this.getAttribute('unidad');
        if (!u) return;
        var todo = leer(K_DEFS), D = {}, ok = esTemaDe(u);
        ['completa', 'optima', 'catalogo'].forEach(function (k) {
          var v = lista(self.getAttribute(k)).filter(ok);
          if (v.length) D[k] = v;
        });
        Object.keys(NOMBRES).forEach(function (m) {
          var n = (self.getAttribute(m + '-nombre') || '').trim(), d = (self.getAttribute(m + '-desc') || '').trim();
          if (n || d) { D.textos = D.textos || {}; D.textos[m] = {}; if (n) D.textos[m].nombre = n; if (d) D.textos[m].desc = d; }
        });
        var cambio = JSON.stringify(todo[u] || {}) !== JSON.stringify(D);
        todo[u] = D; escribir(K_DEFS, todo);
        if (cambio && registro(u)) avisar(u);
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        this._abierto = false;
        if (vivos.indexOf(this) === -1) vivos.push(this);
        this._pintar();
      }
      disconnectedCallback() { var i = vivos.indexOf(this); if (i !== -1) vivos.splice(i, 1); }
      _pintar() {
        var self = this, u = this.getAttribute('unidad'); if (!u || !this.shadowRoot) return;
        var P = paleta(), m = modo(u), r = temas(u), hechas = completadas();
        var cat = catalogo(u), restantes = cat.filter(function (t) { return r.indexOf(t) === -1; });
        var nC = completa(u).length, nO = optima(u).length;
        var hechasRuta = r.filter(function (t) { return hechas.indexOf(t) !== -1; }).length;
        var pend = pendiente(u, null);
        var opciones = [
          { m: 'completa', n: nC },
          { m: 'optima', n: nO },
          { m: 'personalizada', n: m === 'personalizada' ? r.length : null }
        ];
        var html = '<style>'
          + ':host{display:block;margin:1.5rem 0 2rem;}'
          + '*{box-sizing:border-box;}'
          + '.b{font-family:"Newsreader",Georgia,serif;max-width:760px;margin:0 auto;background:#F5F5F5;border:1px solid #6E6F73;border-radius:6px;padding:24px 26px 22px;color:#333;}'
          + '.k{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:' + P.deep + ';margin-bottom:12px;}'
          + '.ops{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;}'
          + '.op{font:inherit;text-align:left;cursor:pointer;background:#fff;border:1px solid #C8C8C8;border-radius:5px;padding:12px 14px;color:#333;}'
          + '.op:hover{border-color:' + P.color + ';}'
          + '.op[aria-checked="true"]{background:' + P.tint + ';border:2px solid ' + P.color + ';padding:11px 13px;}'
          + '.op b{display:block;font-size:17px;font-weight:500;}'
          + '.op span{display:block;font-size:13.5px;font-style:italic;color:#666;margin-top:2px;}'
          + '.op small{display:block;font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.06em;color:' + P.deep + ';margin-top:6px;}'
          + 'ol{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;}'
          + 'li{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid #D0D0D0;border-radius:999px;padding:5px 7px 5px 12px;font-size:14.5px;}'
          + 'li.ok{border-color:' + P.color + ';background:' + P.tint + ';}'
          + 'li a{color:#333;text-decoration:none;}'
          + 'li a:hover{text-decoration:underline;}'
          + '.n{font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:' + P.deep + ';}'
          + '.chk{color:' + P.deep + ';font-size:12px;}'
          + '.x,.mas,.add{font-family:"IBM Plex Mono",monospace;cursor:pointer;border-radius:999px;line-height:1;}'
          + '.x{background:transparent;border:none;color:#888;font-size:14px;padding:2px 5px;}'
          + '.x:hover{color:#B00020;}'
          + '.x:disabled{visibility:hidden;}'
          + '.mas{width:32px;height:32px;font-size:18px;background:' + P.color + ';color:#fff;border:none;}'
          + '.mas:disabled{background:#C8C8C8;cursor:default;}'
          + '.menu{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}'
          + '.add{font-size:11.5px;background:#fff;color:' + P.deep + ';border:1px dashed ' + P.color + ';padding:7px 12px;}'
          + '.add:hover{background:' + P.tint + ';}'
          + '.pie{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-top:16px;font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.04em;color:#777;}'
          + '.ir{color:' + P.deep + ';border-bottom:1.5px solid ' + P.color + ';text-decoration:none;padding-bottom:1px;}'
          + 'button:focus-visible,a:focus-visible{outline:2px solid ' + P.deep + ';outline-offset:2px;}'
          + '</style><div class="b">'
          + '<div class="k">Unidad ' + esc(romano(u)) + ' · elige tu ruta</div>'
          + '<div class="ops" role="radiogroup" aria-label="Ruta de la unidad">'
          + opciones.map(function (o) {
              return '<button type="button" class="op" role="radio" data-m="' + o.m + '" aria-checked="' + (o.m === m) + '">'
                + '<b>' + esc(nombreRuta(u, o.m)) + '</b><span>' + esc(descRuta(u, o.m)) + '</span>'
                + (o.n != null ? '<small>' + o.n + (o.n === 1 ? ' tema' : ' temas') + '</small>' : '') + '</button>';
            }).join('')
          + '</div><ol aria-label="Temas de tu ruta">'
          + r.map(function (t, i) {
              var ok = hechas.indexOf(t) !== -1;
              return '<li' + (ok ? ' class="ok"' : '') + '><span class="n">' + (i + 1) + '</span>'
                + '<a href="' + esc(urlTema(t)) + '" title="' + esc(titulo(t)) + '">' + esc(etiqueta(t) === titulo(t) ? t : etiqueta(t) + ' · ' + titulo(t)) + '</a>'
                + (ok ? '<span class="chk" aria-label="completado">✓</span>' : '')
                + (m === 'personalizada' ? '<button type="button" class="x" data-quitar="' + esc(t) + '" aria-label="Quitar ' + esc(titulo(t)) + '"' + (r.length <= 1 ? ' disabled' : '') + '>×</button>' : '')
                + '</li>';
            }).join('')
          + (m === 'personalizada' ? '<li style="border:none;background:none;padding:0;"><button type="button" class="mas" aria-expanded="' + this._abierto + '" aria-label="Agregar nota"'
              + (restantes.length ? '' : ' disabled title="Ya están todas las notas"') + '>+</button></li>' : '')
          + '</ol>'
          + (m === 'personalizada' && this._abierto && restantes.length
              ? '<div class="menu">' + restantes.map(function (t) {
                  return '<button type="button" class="add" data-agregar="' + esc(t) + '">+ ' + esc(etiqueta(t) === titulo(t) ? t : etiqueta(t) + ' · ' + titulo(t)) + '</button>';
                }).join('') + '</div>' : '')
          + '<div class="pie"><span>La unidad termina al completar ' + r.length + (r.length === 1 ? ' tema' : ' temas') + ' · llevas ' + hechasRuta + '</span>'
          + (pend ? '<a class="ir" href="' + esc(urlTema(pend)) + '">' + (hechasRuta ? 'Continuar' : 'Comenzar') + ' → ' + esc(titulo(pend)) + '</a>'
              : (existeUnidad('u' + (+u.slice(1) + 1)) ? '<a class="ir" href="' + esc(SECCIONES + 'u' + (+u.slice(1) + 1) + '.html') + '">Unidad completada · ir a la siguiente →</a>' : '<span>Unidad completada</span>'))
          + '</div></div>';
        this.shadowRoot.innerHTML = html;

        var sh = this.shadowRoot;
        Array.prototype.forEach.call(sh.querySelectorAll('.op'), function (b) {
          b.addEventListener('click', function () { self._abierto = false; elegir(u, b.getAttribute('data-m')); self._pintar(); });
        });
        Array.prototype.forEach.call(sh.querySelectorAll('[data-quitar]'), function (b) {
          b.addEventListener('click', function () {
            var t = b.getAttribute('data-quitar');
            elegir(u, 'personalizada', temas(u).filter(function (x) { return x !== t; }));
            self._pintar();
          });
        });
        Array.prototype.forEach.call(sh.querySelectorAll('[data-agregar]'), function (b) {
          b.addEventListener('click', function () {
            elegir(u, 'personalizada', temas(u).concat([b.getAttribute('data-agregar')]));
            if (!catalogo(u).some(function (t) { return temas(u).indexOf(t) === -1; })) self._abierto = false;
            self._pintar();
          });
        });
        var mas = sh.querySelector('.mas');
        if (mas) mas.addEventListener('click', function () { self._abierto = !self._abierto; self._pintar(); });
      }
    });
  }

  /* ── <siguiente-tema> ── */
  if (!customElements.get('siguiente-tema')) {
    customElements.define('siguiente-tema', class extends HTMLElement {
      connectedCallback() {
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        if (vivos.indexOf(this) === -1) vivos.push(this);
        this._pintar();
      }
      disconnectedCallback() { var i = vivos.indexOf(this); if (i !== -1) vivos.splice(i, 1); }
      _tema() {
        var a = this.getAttribute('tema');
        if (a) return a;
        var pag = /(u\d+t\d+)/.exec((location.pathname.split('/').pop()) || '');
        return (pag && pag[1]) || window.QUEST_TEMA || null;
      }
      _pintar() {
        if (!this.shadowRoot) return;
        var t = this._tema(), s = t && siguiente(t);
        if (!s) { this.shadowRoot.innerHTML = ''; this.style.display = 'none'; return; }
        this.style.display = '';
        var P = paleta(), u = unidadDe(t), bloque = this.getAttribute('variante') === 'bloque';
        var que = s.tipo === 'unidad' ? 'Siguiente unidad' : s.tipo === 'pendiente' ? 'Pendiente en tu ruta' : 'Siguiente tema';
        this.shadowRoot.innerHTML = '<style>'
          + ':host{display:block;}'
          + (bloque
            ? '.w{display:flex;margin:10px 0 0;}'
              + 'a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;text-decoration:none;background:' + P.tint + ';border:1px solid ' + P.color + ';border-radius:8px;padding:11px 22px;}'
              + 'b{text-align:center;}'
            : '.w{display:flex;justify-content:flex-end;margin:1.6rem auto 1rem;max-width:760px;}'
              + 'a{display:inline-flex;flex-direction:column;align-items:flex-end;gap:3px;text-decoration:none;background:' + P.tint + ';border:1px solid ' + P.color + ';border-radius:8px;padding:11px 18px;max-width:100%;}'
              + 'b{text-align:right;}')
          + 'a:hover{background:#fff;}'
          + 'a:focus-visible{outline:2px solid ' + P.deep + ';outline-offset:3px;}'
          + 'small{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:' + P.deep + ';}'
          + 'b{font-family:"Newsreader",Georgia,serif;font-size:17px;font-weight:500;color:#333;}'
          + '</style><div class="w"><a href="' + esc(s.url) + '">'
          + '<small>' + que + ' · ' + esc(nombreRuta(u, modo(u))) + '</small>'
          + '<b>' + esc(s.titulo) + ' →</b></a></div>';
      }
    });
  }

  window.FisicaRutas = {
    elegida: elegida, temas: temas, modo: modo, elegir: elegir, siguiente: siguiente,
    catalogo: catalogo, completa: completa, optima: optima, nombres: NOMBRES,
    nombre: nombreRuta, descripcion: descRuta
  };
})();
