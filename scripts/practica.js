/*
 * practica.js
 * Física Computacional — notas prácticas (Fase III), por tema y lenguaje.
 *
 * Define dos elementos (los laboratorios <lab-tema> quedan aparte, entre ambos):
 *   <practica-cabecera tema="u1t1"></practica-cabecera>
 *       marcador de lenguaje + enlaces + «Ver la solución en otro lenguaje»
 *   <practica-cierre tema="u1t1"></practica-cierre>
 *       bloque «Generar» + evidencia de criterio (phrónesis) + sello
 *
 * UNA SOLA NOTA PARA TODOS LOS LENGUAJES
 *   La nota entera (cabecera, laboratorios y cierre) va en el lenguaje del alumno, con el
 *   mismo orden que usa <lab-tema>:
 *     1. su ruta: FisicaSave.getClase()
 *     2. localStorage.selectedLang
 *     3. el primer lenguaje con entrada propia en temas.<tema>
 *   y a los <lab-tema> de la página se les pone ruta="<lenguaje>" para que coincidan.
 *   El alumno NO puede cambiar ese lenguaje desde aquí. Con lenguaje="haskell" queda fijo.
 *
 * «Ver la solución en otro lenguaje» (cabecera)
 *   Un botón por cada OTRO lenguaje que tenga laboratorios de código para el tema en
 *   problemas.json. Al pulsarlo se despliega, solo para leer, el código de «solucion» de
 *   esos laboratorios. No toca el guardado: no cuenta como «solución vista». Nunca ofrece
 *   el lenguaje del alumno (ni el que <lab-tema> le monte como sustituto si su ruta no
 *   tiene laboratorio). Atributos: problemas="…json" (fuente alterna) · sin-vias (lo quita).
 *
 * Colores: salen de la tabla `lenguajes` de practicas.json (color, tint, deep). Todo lo
 *   demás (tinta, bordes, fondos, sello, bloque de código) se deriva de esos tres.
 *
 * practicas.json · temas.<tema>._comun
 *   Lo que comparten todos los lenguajes del tema (enlaces, textos de la evidencia…).
 *   Cada temas.<tema>.<lenguaje> solo añade o sustituye lo suyo (mezcla campo a campo).
 *   En las URL, {lenguaje} se sustituye por el lenguaje activo. Un lenguaje sin entrada
 *   propia usa solo _comun; el bloque «Generar» se omite si no tiene items.
 *   Los textos intro, items y hint admiten HTML (<strong>, <code>, <em>); es contenido del autor.
 *
 * Datos: practicas.json (misma carpeta). Atributo opcional: fuente (JSON alterno).
 * Carga ../descubrimientos.js y ../fisica-save.js si hacen falta.
 *
 * CÓMO SE DEMUESTRA LA FASE (cierre) · practicas.json → "demostrar"
 *   El alumno elige una vía y el sello dice cuál fue:
 *     codigo   los laboratorios de código del tema, resueltos (todos, o codigo.min de ellos)
 *     juicio   el laboratorio de juicio, entregado (solo se ofrece si el tema tiene uno)
 *     nopude   una explicación de dónde se atoró (nopude.min caracteres): completa la fase,
 *              pero con resultado «declarada» (estrella hueca). Puede volver y llenarla.
 *              Solo se ofrece al final, y solo después de haber intentado (pulsado «verificar» o
 *              «entregar») al menos nopude.intentos laboratorios del tema (1 por omisión; 0 = sin requisito).
 *              Si el tema no tiene ningún laboratorio en problemas.json no hay qué intentar: se ofrece
 *              sin requisito, junto a «entregar la evidencia».
 *   La cabecera anuncia esas vías y su avance en vivo, sin pedir ninguna decisión: el alumno ve
 *   todos los ejercicios y elige al final. «No pude» ahí solo se menciona. Con sin-rutas se quita.
 *   "demostrar" se lee, de menor a mayor prioridad, de la raíz de practicas.json, de
 *   temas.<tema>._comun y de temas.<tema>.<lenguaje>:
 *     { "modo": "elegir" | "todo",              "todo" = todos los laboratorios, sin «no pude»
 *       "vias": ["codigo","juicio","nopude"],   las que se ofrecen en modo "elegir"
 *       "codigo": { "min": "todos" | n },
 *       "nopude": { "min": 120, "intentos": 1, "label": …, "hint": …, "ph": … } }
 *   Cada vía admite además "titulo" y "desc" para cambiar su texto. Un tema sin
 *   laboratorios se sella con la evidencia escrita, o declarando «no pude».
 *
 * Al sellar: FisicaSave.sellarPractica(tema, obj), que guarda obj en praxis[tema] y la vía en
 * fases[tema].practica = 'lab' | 'juicio' | 'declarado' (lo que leen el Mapa y el Atlas).
 * Con un fisica-save.js anterior: registrarPraxis + completarFase + save.practicaSello[tema].
 *   obj: { tema, fase, lenguaje, clase, via, resultado: "demostrada" | "declarada",
 *          laboratorios: [{id, tipo, resuelto, intentos, pistas, solucionVista}],
 *          justificacion_diseno?, bitacora_error_correccion?, atasco?, atasco_en?,
 *          declarada_antes?, sellado_en }
 * PUENTE A LA DIALÉCTICA (cierre)
 *   Con la práctica sellada (llena o hueca) aparece el botón «Repasa lo aprendido →», al lado
 *   del de «Llenar la estrella» (o solo, si la estrella ya está llena).
 *   Destino, por prioridad: atributo puente="…" · campo "dialectica" de practicas.json
 *   (el mismo de «Autoevaluación →» en la cabecera) · ../dialecticas/<tema>d.html
 *
 * Evento 'fisica:practica' {tema, lenguaje, via, resultado}.
 */
(function () {
  'use strict';
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^\/]*$/, '') : ''; })();
  var VERSION = (function () { var s = document.currentScript && document.currentScript.src, m = s && s.match(/\?[^#]*/); return m ? m[0] : ''; })();

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var cargas = {}, fuentes = {};
  function script(global, archivo) {
    if (window[global]) return Promise.resolve();
    if (!cargas[archivo]) cargas[archivo] = new Promise(function (ok) {
      var s = document.createElement('script'); s.src = BASE + archivo + VERSION; s.onload = ok; s.onerror = ok; document.head.appendChild(s);
    });
    return cargas[archivo];
  }
  function json(url) {
    if (!fuentes[url]) fuentes[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error('no se pudo leer ' + url); return r.json(); });
    return fuentes[url];
  }
  function tipografias() {
    if (document.querySelector('link[data-dialogo-fuentes]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-dialogo-fuentes', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(l);
  }
  /* ── lenguaje del alumno ── */
  var CLAVE = 'selectedLang';
  function leerLang() { try { var l = localStorage.getItem(CLAVE); return l ? l.toLowerCase() : null; } catch (e) { return null; } }
  function rutaAlumno() {
    try { var c = window.FisicaSave && window.FisicaSave.getClase && window.FisicaSave.getClase(); return c ? String(c).toLowerCase() : null; } catch (e) { return null; }
  }
  /* Los <lab-tema> van en el lenguaje de la nota (laboratorio.js observa el atributo `ruta`).
     No se tocan los que el autor fijó a mano con ruta="…". */
  function sincronizarLabs(len) {
    Array.prototype.forEach.call(document.querySelectorAll('lab-tema'), function (lab) {
      if (lab.hasAttribute('ruta') && !lab.hasAttribute('data-ruta-auto')) return;
      if (lab.getAttribute('ruta') === len) return;
      lab.setAttribute('data-ruta-auto', ''); lab.setAttribute('ruta', len);
    });
  }
  function esObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function mezclar(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b) o[k] = esObj(a && a[k]) && esObj(b[k]) ? mezclar(a[k], b[k]) : b[k];
    return o;
  }
  function etiquetaTema(t) { var m = /^u(\d+)t(\d+)/.exec(t); return m ? 'Unidad ' + m[1] + ' · Tema ' + m[2] : t; }

  /* ── guardado: el sello de la fase práctica ──
     fisica-save.js lo guarda con sellarPractica y lo devuelve con selloPractica. Con una
     versión anterior de fisica-save.js se llama a registrarPraxis + completarFase y el
     registro completo se deja además en save.practicaSello[tema]. */
  function claveSave() { return (window.FisicaSave && window.FisicaSave.KEY) || 'fisicaSave'; }
  function leerSave() { try { return JSON.parse(localStorage.getItem(claveSave())) || {}; } catch (e) { return {}; } }
  function leerSello(tema) {
    var F = window.FisicaSave, r = null;
    try { if (F && F.selloPractica) return F.selloPractica(tema) || null; } catch (e) {}
    r = (leerSave().practicaSello || {})[tema] || null;
    // sellos anteriores a este cambio: la fase consta como completa y no hay registro → cuentan como demostrada
    if (!r) { try { if (F && F.faseCompletada && F.faseCompletada(tema, 'practica')) r = { via: 'previa', resultado: 'demostrada' }; } catch (e) {} }
    return r;
  }
  function guardarSello(tema, o) {
    var F = window.FisicaSave;
    if (F && F.sellarPractica) { try { F.sellarPractica(tema, o); return; } catch (e) {} }
    if (F) {
      try { if (F.registrarPraxis) F.registrarPraxis(tema, o); } catch (e) {}
      try { F.completarFase(tema, 'practica', o.via === 'nopude' ? 'declarado' : o.via === 'juicio' ? 'juicio' : 'lab'); } catch (e) {}
    }
    try { var s = leerSave(); if (!s.practicaSello) s.practicaSello = {}; s.practicaSello[tema] = o; localStorage.setItem(claveSave(), JSON.stringify(s)); } catch (e) {}
  }

  /* Los laboratorios que <lab-tema> monta para este tema y lenguaje (misma regla que laboratorio.js). */
  function labsDelTema(datos, tema, len) {
    var todos = (datos.hechizos || datos.ejercicios || datos || []).filter(function (h) {
      return h && h.id && (h.tipo === 'codigo' || h.tipo === 'juicio') && h.tema === tema && !h.clave;
    });
    var jz = function (h) { return h.tipo === 'juicio'; };
    var de = function (l) { return todos.filter(function (h) { return h.lenguaje === l; }); };
    var propios = de(len);
    if (!propios.length && todos.length) propios = de(de('racket').length ? 'racket' : de('haskell').length ? 'haskell' : todos[0].lenguaje);
    if (!propios.some(jz) && todos.some(jz)) propios = propios.concat([de('haskell').filter(jz)[0] || de('racket').filter(jz)[0] || todos.filter(jz)[0]]);
    return { codigo: propios.filter(function (h) { return !jz(h); }), juicio: propios.filter(jz) };
  }
  function nombreLab(h) { return (h.roman ? h.roman + ' · ' : '') + (h.name || h.title || h.id); }

  /* ── vías para demostrar la fase: lo que comparten la cabecera (las anuncia) y el cierre (las pide) ── */
  // valores por omisión ← practicas.json.demostrar ← temas.<tema>._comun.demostrar ← temas.<tema>.<lenguaje>.demostrar
  function configDemostrar(el) { return mezclar(mezclar(DEMOSTRAR, el.G || {}), (el.P && el.P.demostrar) || {}); }
  function viasDelTema(D, labs) {
    var hayC = labs.codigo.length > 0, hayJ = labs.juicio.length > 0, vias;
    if (!hayC && !hayJ)                                              // tema sin laboratorios en problemas.json: la evidencia,
      return D.modo !== 'todo' && (D.vias || []).indexOf('nopude') !== -1 ? ['evidencia', 'nopude'] : ['evidencia'];   // o «no pude» (sin intento previo: no hay qué intentar)
    if (D.modo === 'todo') return ['todo'];                          // sin excepción
    vias = (D.vias || []).filter(function (v) { return v === 'codigo' ? hayC : v === 'juicio' ? hayJ : v === 'nopude'; });
    return vias.some(function (v) { return v !== 'nopude'; }) ? vias : ['todo'];
  }
  // laboratorios del tema que el alumno ya intentó: resueltos, o con algún «verificar» / «entregar» fallido
  function intentados(labs) {
    var s = leerSave(), L = s.laboratorios || {}, B = s.labBorradores || {};
    return labs.codigo.concat(labs.juicio).filter(function (h) { return !!L[h.id] || ((B[h.id] || {}).intentos | 0) > 0; }).length;
  }
  /* ¿Qué pide la vía y cuánto lleva el alumno? Lee el guardado de los laboratorios. */
  function requisito(via, D, labs) {
    var L = leerSave().laboratorios || {}, c = labs.codigo, j = labs.juicio;
    var hecho = function (h) { return !!L[h.id]; }, sin = function (l) { return l.filter(function (h) { return !hecho(h); }).map(nombreLab); };
    var cH = c.filter(hecho).length, jH = j.filter(hecho).length, min = D.codigo && D.codigo.min;
    var cN = typeof min === 'number' ? Math.max(1, Math.min(c.length, min)) : c.length;
    if (via === 'codigo') return { ok: cH >= cN, txt: cH + ' de ' + c.length + (cN < c.length ? ' · bastan ' + cN : ''),
      msg: cH >= cN ? '' : cN < c.length ? 'Resuelve ' + (cN - cH) + ' más de: ' + sin(c).join(', ') : 'Falta resolver: ' + sin(c).join(', ') };
    if (via === 'juicio') return { ok: jH === j.length, txt: jH === j.length ? 'entregado' : 'pendiente', msg: jH === j.length ? '' : 'Falta entregar: ' + sin(j).join(', ') };
    if (via === 'todo') { var f = sin(c.concat(j)); return { ok: !f.length, txt: (cH + jH) + ' de ' + (c.length + j.length), msg: f.length ? 'Falta resolver: ' + f.join(', ') : '' }; }
    if (via === 'nopude') {
      var pide = D.nopude && D.nopude.intentos != null ? D.nopude.intentos | 0 : 1, total = c.length + j.length;
      pide = Math.max(0, Math.min(pide, total));
      var van = intentados(labs), ok = van >= pide;
      return { ok: ok, bloquea: !ok, txt: ok ? '' : 'tras un intento',
        msg: ok ? '' : 'Antes de declarar «no pude» hay que intentarlo: pulsa «verificar» (o «entregar») en ' + (pide === 1 ? 'al menos un laboratorio' : 'al menos ' + pide + ' laboratorios') + ' de este tema.' };
    }
    return { ok: true, txt: '', msg: '' };
  }
  /* El avance cambia con cada «verificar» de un laboratorio, y los intentos fallidos no avisan con
     ningún evento: se vuelve a leer el guardado tras cualquier clic en la página y al volver a ella. */
  function alCambiarAvance(fn) {
    var t = null, tarde = function () { clearTimeout(t); t = setTimeout(fn, 90); };
    var evs = ['fisica:laboratorio', 'fisica:lab', 'fisica:practica', 'fisica:fase', 'click'];
    evs.forEach(function (e) { document.addEventListener(e, tarde); });
    window.addEventListener('focus', tarde);
    return function () { clearTimeout(t); evs.forEach(function (e) { document.removeEventListener(e, tarde); }); window.removeEventListener('focus', tarde); };
  }

  /* Todo el color sale de --c (color), --t (tint) y --d (deep) del lenguaje. */
  var CSS = "\
:host{display:block;}*,*::before,*::after{box-sizing:border-box;}\
.raiz{--ink:color-mix(in srgb,var(--d) 30%,#2B2B2B);--lede:color-mix(in srgb,var(--c) 45%,#808080);--hint:color-mix(in srgb,var(--c) 40%,#6E6E6E);\
--bd:color-mix(in srgb,var(--c) 24%,#fff);--bg:color-mix(in srgb,var(--t) 38%,#fff);--bg2:color-mix(in srgb,var(--t) 55%,#fff);--papel:color-mix(in srgb,var(--t) 10%,#fff);\
font-family:'Newsreader',Georgia,serif;color:var(--ink);}\
code{font-family:'IBM Plex Mono',monospace;font-size:.88em;}\
a{color:var(--c);}a:hover{color:var(--d);}\
.cab{display:flex;flex-direction:column;gap:14px;margin-bottom:1.5rem;}\
.mk{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;font:12px 'IBM Plex Mono',monospace;padding:3px 10px;border-radius:6px;background:var(--t);color:var(--d);}\
.nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;}\
.nav i{font-style:normal;color:var(--bd);}\
.vias{display:flex;flex-direction:column;gap:10px;}.vias[hidden]{display:none;}\
.sel{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font:12px 'IBM Plex Mono',monospace;color:var(--hint);}\
.sel .lg{font:inherit;display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:3px 10px;border-radius:6px;background:#fff;color:var(--lc);border:1px solid color-mix(in srgb,var(--lc) 30%,#fff);}\
.sel .lg:hover{border-color:var(--lc);}\
.sel .lg:focus-visible{outline:2px solid var(--lc);outline-offset:2px;}\
.sel .lg[aria-expanded=true]{background:var(--lt);color:var(--ld);border-color:var(--lc);font-weight:500;}\
.otra{border:1px solid var(--bd);border-top:3px solid var(--c);border-radius:8px;background:var(--bg);padding:16px 18px 18px;}\
.otra .aviso{font-style:italic;font-size:13.5px;line-height:1.5;color:var(--lede);margin:0 0 4px;text-wrap:pretty;}\
.otra .ej{margin-top:14px;}\
.otra .k{font:9.5px 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--d);}\
.otra h4{font-size:16.5px;font-weight:500;margin:2px 0 3px;line-height:1.25;}\
.otra .en{font-size:13.5px;line-height:1.5;color:var(--lede);margin:0 0 7px;text-wrap:pretty;}\
.otra pre{max-height:none;white-space:pre;overflow-x:auto;font-size:12.5px;line-height:1.55;margin:0;}\
.gen{margin:2.4rem 0 1rem;border:1px solid var(--bd);border-radius:10px;background:var(--bg2);padding:22px 24px;}\
.gen .tt{display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:18px;font-weight:500;}.gen .tt span{color:var(--c);}\
.gen p{font-style:italic;color:var(--lede);font-size:14px;line-height:1.55;margin:0 0 14px;text-wrap:pretty;}\
.gen ul{margin:0;padding-left:1.1rem;font-size:14px;line-height:1.6;display:flex;flex-direction:column;gap:6px;}\
.gen li::marker{color:var(--c);}\
.px{max-width:720px;margin:2.6rem auto 1rem;background:var(--bg);border:1px solid var(--bd);border-radius:10px;box-shadow:0 14px 34px -28px color-mix(in srgb,var(--c) 55%,transparent);padding:30px 32px 34px;}\
@media(max-width:680px){.px{padding:24px 18px 28px;}}\
.eb{font:10px 'IBM Plex Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--d);}\
.px h2{font-size:23px;font-weight:500;margin:3px 0 5px;border:0;padding:0;color:var(--ink);}\
.lede{font-style:italic;font-size:14.5px;line-height:1.55;color:var(--lede);margin:0 0 18px;text-wrap:pretty;}\
.f{margin-bottom:16px;}\
label{display:block;font:10px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--d);margin-bottom:5px;}\
.h{font-style:italic;font-size:12.5px;color:var(--hint);margin:2px 0 7px;line-height:1.5;}\
textarea{width:100%;font:15px/1.55 'Newsreader',serif;color:var(--ink);background:var(--papel);border:1px solid var(--bd);border-radius:8px;padding:11px 13px;resize:vertical;min-height:92px;}\
textarea::placeholder{color:var(--hint);opacity:.8;}\
textarea:focus{outline:none;border-color:var(--c);}\
.m{font:10.5px 'IBM Plex Mono',monospace;color:var(--hint);margin-top:4px;}\
.btn{font:12px 'IBM Plex Mono',monospace;letter-spacing:.04em;display:inline-flex;align-items:center;gap:9px;cursor:pointer;background:var(--t);color:var(--d);border:1px solid var(--c);border-radius:8px;padding:11px 20px;margin-top:6px;}\
.btn:hover:not(:disabled){background:color-mix(in srgb,var(--c) 16%,var(--t));}\
.btn:disabled{background:var(--bg2);color:color-mix(in srgb,var(--c) 38%,#fff);border-color:var(--bd);cursor:not-allowed;}\
.sealed{display:inline-flex;align-items:center;gap:9px;font:12px 'IBM Plex Mono',monospace;letter-spacing:.04em;color:color-mix(in srgb,var(--d) 65%,#6A6A6A);background:color-mix(in srgb,var(--t) 80%,#fff);border:1px solid color-mix(in srgb,var(--c) 32%,#fff);border-radius:8px;padding:11px 20px;margin-top:6px;}\
.sealed.hueca{background:transparent;border-style:dashed;border-color:var(--c);}\
.ns{font-style:italic;font-size:13.5px;line-height:1.5;color:var(--lede);margin:9px 0 18px;text-wrap:pretty;}\
.dem{display:flex;flex-direction:column;gap:8px;margin:0 0 20px;}.dem[hidden],.btn[hidden]{display:none;}\
.dem .q{font:10px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--d);margin-bottom:1px;}\
.op{display:flex;gap:11px;align-items:flex-start;font:15px/1.4 'Newsreader',Georgia,serif;letter-spacing:0;text-transform:none;color:var(--ink);margin:0;padding:11px 13px;border:1px solid var(--bd);border-radius:8px;background:var(--papel);cursor:pointer;}\
.op:hover{border-color:var(--c);}.op.on{border-color:var(--c);background:var(--t);}\
.op input{flex:0 0 auto;margin:4px 0 0;accent-color:var(--c);}\
.op.solo{cursor:default;}.op.solo input{display:none;}\
.op .tx{flex:1;min-width:0;}.op b{display:block;font-weight:500;font-size:15.5px;}\
.op .ds{display:block;font-size:13px;line-height:1.45;color:var(--lede);text-wrap:pretty;}\
.op .es{flex:0 0 auto;font:10.5px 'IBM Plex Mono',monospace;color:var(--hint);white-space:nowrap;margin-top:4px;}.op .es.ok{color:var(--d);}\
select{max-width:100%;font:14.5px 'Newsreader',Georgia,serif;color:var(--ink);background:var(--papel);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;}\
select:focus{outline:none;border-color:var(--c);}\
.falta{font:11px/1.5 'IBM Plex Mono',monospace;color:var(--hint);min-height:1.5em;}\
.op.no{cursor:not-allowed;opacity:.62;}.op.no:hover{border-color:var(--bd);}\
.rutas{border:1px solid var(--bd);border-left:3px solid var(--c);border-radius:8px;background:var(--bg);padding:13px 16px 14px;}.rutas[hidden]{display:none;}\
.rutas .q{font:10px 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--d);}\
.rutas p{font-style:italic;font-size:13.5px;line-height:1.5;color:var(--lede);margin:3px 0 0;text-wrap:pretty;}\
.rutas ul{list-style:none;margin:9px 0 0;padding:0;display:flex;flex-direction:column;gap:5px;}\
.rutas li{display:flex;align-items:baseline;gap:9px;font-size:15.5px;line-height:1.35;}\
.rutas li::before{content:'○';flex:none;font:12px 'IBM Plex Mono',monospace;color:var(--c);}.rutas li.ok::before{content:'✓';color:var(--d);}\
.rutas li span{flex:1;min-width:0;}.rutas li i{flex:none;font:normal 10.5px 'IBM Plex Mono',monospace;color:var(--hint);white-space:nowrap;}.rutas li.ok i{color:var(--d);}\
.rutas .np{margin-top:9px;font-size:13px;}\
.ex{margin-top:18px;display:none;}.ex.show{display:block;}\
pre{font:11.5px/1.5 'IBM Plex Mono',monospace;background:var(--ink);color:color-mix(in srgb,var(--t) 70%,#fff);border-radius:8px;padding:13px 15px;white-space:pre-wrap;word-break:break-word;max-height:230px;overflow:auto;margin:5px 0 0;}\
.acts{display:flex;gap:10px;margin-top:9px;}\
.act{font:11px 'IBM Plex Mono',monospace;cursor:pointer;background:var(--papel);border:1px solid var(--bd);border-radius:7px;padding:7px 13px;color:var(--d);}\
.act:hover{border-color:var(--c);}\
.fila{display:flex;flex-wrap:wrap;align-items:center;gap:10px;}\
a.btn{text-decoration:none;}a.btn:hover{color:var(--d);}\
.err{font:12px 'IBM Plex Mono',monospace;color:#8C2F17;border:1px dashed #8C2F17;border-radius:4px;padding:10px 14px;}\
";
  var NEUTRA = { color: '#5F5E5A', tint: '#F1EFE8', deep: '#444441' };
  function vars(p) { return '--c:' + p.color + ';--t:' + p.tint + ';--d:' + p.deep + ';'; }

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

  class Base extends HTMLElement {
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      aislarTeclado(this.shadowRoot);
      tipografias();
      var self = this;
      if (!this._alCambiar) this._alCambiar = function (e) {      // el lenguaje del sitio cambió en otra pestaña
        if (e.key === CLAVE && !self.getAttribute('lenguaje')) self._iniciar();
      };
      window.addEventListener('storage', this._alCambiar);
      this._iniciar();
    }
    disconnectedCallback() { window.removeEventListener('storage', this._alCambiar); }
    _iniciar() {
      var self = this, tema = this.getAttribute('tema'), fijo = (this.getAttribute('lenguaje') || '').toLowerCase();
      if (!tema) return;
      var turno = (this._turno = (this._turno || 0) + 1);
      var fuente = this.getAttribute('fuente') || (BASE + 'practicas.json' + VERSION);
      Promise.all([script('DESCUBRIMIENTOS', '../descubrimientos.js'), script('FisicaSave', '../fisica-save.js')])
        .then(function () { return json(fuente); }).then(function (d) {
          if (turno !== self._turno) return;
          var T = d.temas && d.temas[tema], LS = d.lenguajes || {};
          if (!T) throw new Error('practicas.json no tiene el tema ' + tema);
          var propios = Object.keys(T).filter(function (k) { return k.charAt(0) !== '_'; });
          var disp = propios.concat(Object.keys(LS).filter(function (k) { return propios.indexOf(k) === -1; }));
          if (!T._comun) disp = propios;                           // sin _comun solo hay lo que tenga entrada propia
          var len = fijo || [rutaAlumno(), leerLang()].filter(function (l) { return l && disp.indexOf(l) !== -1; })[0] || disp[0];
          if (!len || (!T[len] && !T._comun)) throw new Error('practicas.json no tiene ' + tema + ' / ' + (len || '—'));
          var P = mezclar(T._comun || {}, T[len] || {}), L = LS[len] || {};
          ['nota', 'implementacion', 'dialectica'].forEach(function (k) { if (typeof P[k] === 'string') P[k] = P[k].replace(/\{lenguaje\}/g, len); });
          var pal = { color: L.color || NEUTRA.color, tint: L.tint || NEUTRA.tint, deep: L.deep || NEUTRA.deep, label: L.label || len, icon: L.icon || '' }, ruta = '';
          try {   // la paleta de la ruta solo aplica si la ruta ES el lenguaje que se muestra
            var cl = rutaAlumno(), R = cl && window.DESCUBRIMIENTOS && window.DESCUBRIMIENTOS.rutas[window.FisicaSave.getClase()];
            if (R) { ruta = R.name; if (cl === len) { pal.color = R.color || pal.color; pal.tint = R.tint || pal.tint; pal.deep = R.deep || pal.deep; } }
          } catch (e) {}
          var previo = self._estado ? self._estado() : null;       // lo ya escrito sobrevive a un repintado
          self.tema = tema; self.len = len; self.P = P; self.pal = pal; self.ruta = ruta; self.LS = LS; self.G = d.demostrar || {};
          self.shadowRoot.innerHTML = '<style>' + CSS + '</style><div class="raiz" style="' + vars(pal) + '">' + self._html() + '</div>';
          self._listo(previo);
        }).catch(function (e) {
          if (turno !== self._turno) return;
          self.shadowRoot.innerHTML = '<style>' + CSS + '</style><div class="err">' + esc(self.localName) + ': ' + esc(e.message) + '</div>';
        });
    }
  }

  class Cabecera extends Base {
    _html() {
      var P = this.P, L = this.pal, sep = '<i>·</i>';
      var enlaces = [P.nota && '<a href="' + esc(P.nota) + '">← Nota conceptual</a>',
        P.implementacion && '<a href="' + esc(P.implementacion) + '">← Implementación</a>',
        P.dialectica && '<a href="' + esc(P.dialectica) + '">Autoevaluación →</a>'].filter(Boolean);
      return '<div class="cab"><span class="mk"><span>' + esc(L.icon) + '</span><span>Leyendo en: <strong>' + esc(L.label) + '</strong></span></span>'
        + '<div class="nav">' + enlaces.join(sep) + '</div>'
        + '<div class="rutas" data-rutas aria-live="polite" hidden></div>'
        + '<div class="vias" data-vias hidden></div></div>';
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      if (this._soltar) { this._soltar(); this._soltar = null; }
    }
    _listo() {
      sincronizarLabs(this.len);            // los laboratorios, en el lenguaje que muestra la nota
      if (!this.hasAttribute('sin-rutas')) this._rutas();
      if (!this.hasAttribute('sin-vias')) this._vias();
    }

    /* «Cómo se termina esta práctica»: las vías del tema y su avance en vivo. Solo informa:
       la decisión se toma en <practica-cierre>, y «no pude» aquí solo se menciona. */
    _rutas() {
      var self = this, turno = this._turno;
      if (this._soltar) { this._soltar(); this._soltar = null; }
      json(this.getAttribute('problemas') || (BASE + 'problemas.json')).then(function (datos) {
        if (turno !== self._turno) return;
        self.labs = labsDelTema(datos, self.tema, self.len);
        self.D = configDemostrar(self);
        self._pintarRutas();
        self._soltar = alCambiarAvance(function () { self._pintarRutas(); });
      }).catch(function () {});             // sin problemas.json, la cabecera queda sin este bloque
    }
    _pintarRutas() {
      var caja = this.shadowRoot.querySelector('[data-rutas]');
      if (!caja || !this.labs) return;
      var D = this.D, labs = this.labs, todas = viasDelTema(D, labs);
      var vias = todas.filter(function (v) { return v !== 'nopude' && v !== 'evidencia'; });
      if (!vias.length) { caja.hidden = true; return; }               // tema sin laboratorios
      var sello = leerSello(this.tema), llena = !!sello && sello.resultado !== 'declarada', hueca = !!sello && !llena;
      var hayNp = todas.indexOf('nopude') !== -1 && !sello, pide = requisito('nopude', D, labs);
      var h = '<div class="q">' + (llena ? '✓ Práctica sellada' : hueca ? '☆ Práctica declarada «no pude»' : 'Cómo se termina esta práctica') + '</div>'
        + '<p>' + (llena ? 'Ya la demostraste. Los ejercicios siguen aquí por si quieres volver a ellos.'
                 : hueca ? 'La fase está completa, con la estrella hueca. Para llenarla, resuelve ' + (vias.length > 1 ? 'una de estas vías' : 'esto') + ' y séllala de nuevo al final.'
                 : vias.length > 1 ? 'Basta <strong>una</strong> de estas vías. No tienes que elegir ahora: mira todos los ejercicios y decide al final.'
                 : vias[0] === 'todo' ? 'Este tema pide todos sus laboratorios. Al final dejas tu evidencia y la sellas.'
                 : 'Resuélvelo aquí abajo; al final dejas tu evidencia y sellas la práctica.') + '</p>';
      if (!llena) h += '<ul>' + vias.map(function (v) {
        var t = mezclar(VIAS[v], esObj(D[v]) ? D[v] : {}), r = requisito(v, D, labs);
        return '<li' + (r.ok ? ' class="ok"' : '') + '><span>' + esc(t.titulo) + '</span><i>' + esc(r.txt) + '</i></li>';
      }).join('') + '</ul>';
      if (hayNp) h += '<p class="np">Si te atoras, al final podrás declarar «no pude» y explicar dónde'
        + (pide.bloquea ? '; antes hay que intentar al menos un laboratorio.' : '.') + '</p>';
      if (caja._html !== h) { caja.innerHTML = h; caja._html = h; }
      caja.hidden = false;
    }

    /* «Ver la solución en otro lenguaje»: solo lectura, sin tocar el guardado. */
    _vias() {
      var self = this, turno = this._turno, tema = this.tema, propio = this.len, LS = this.LS;
      json(this.getAttribute('problemas') || (BASE + 'problemas.json')).then(function (datos) {
        if (turno !== self._turno) return;
        var labs = (datos.hechizos || datos.ejercicios || datos || []).filter(function (h) {
          return h && h.tipo === 'codigo' && h.tema === tema && !h.clave && h.lenguaje;
        });
        var hay = function (l) { return labs.some(function (h) { return h.lenguaje.toLowerCase() === l; }); };
        // lo que <lab-tema> monta de verdad: si la ruta no tiene laboratorio, usa otra (misma regla que laboratorio.js)
        var montado = hay(propio) ? propio : hay('racket') ? 'racket' : hay('haskell') ? 'haskell' : (labs[0] ? labs[0].lenguaje.toLowerCase() : propio);
        var porLen = {}, orden = [];
        labs.forEach(function (h) {
          var l = h.lenguaje.toLowerCase();
          if (!h.solucion || l === propio || l === montado) return;
          if (!porLen[l]) { porLen[l] = []; orden.push(l); }
          porLen[l].push(h);
        });
        if (!orden.length) return;
        var pref = Object.keys(LS);        // mismo orden que la tabla `lenguajes`
        orden.sort(function (a, b) { var i = pref.indexOf(a), j = pref.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
        self._pintarVias(orden, porLen);
      }).catch(function () {});             // sin problemas.json, la cabecera queda sin este bloque
    }
    _pintarVias(orden, porLen) {
      var self = this, LS = this.LS, caja = this.shadowRoot.querySelector('[data-vias]'), abierto = null;
      var meta = function (l) { var m = LS[l] || {}; return { color: m.color || NEUTRA.color, tint: m.tint || NEUTRA.tint, deep: m.deep || NEUTRA.deep, label: m.label || l, icon: m.icon || '' }; };
      caja.innerHTML = '<div class="sel" role="group" aria-label="Ver la solución en otro lenguaje"><span>Ver la solución en otro lenguaje:</span>'
        + orden.map(function (l) {
          var m = meta(l);
          return '<button type="button" class="lg" data-l="' + esc(l) + '" aria-expanded="false" style="--lc:' + m.color + ';--lt:' + m.tint + ';--ld:' + m.deep + ';"><span>' + esc(m.icon) + '</span><span>' + esc(m.label) + '</span></button>';
        }).join('') + '</div><div data-otra aria-live="polite"></div>';
      caja.hidden = false;
      var panel = caja.querySelector('[data-otra]');
      var mostrar = function (l) {
        abierto = abierto === l ? null : l;
        Array.prototype.forEach.call(caja.querySelectorAll('.lg'), function (b) { b.setAttribute('aria-expanded', String(b.getAttribute('data-l') === abierto)); });
        if (!abierto) { panel.innerHTML = ''; return; }
        var m = meta(abierto);
        panel.innerHTML = '<div class="raiz otra" style="' + vars(m) + '">'
          + '<p class="aviso">Así resuelve ' + esc(m.label) + ' sus laboratorios de este tema. Son para comparar con lo que escribiste en ' + esc(self.pal.label) + '; los ejercicios no siempre son los mismos.</p>'
          + porLen[abierto].map(function (h) {
            return '<div class="ej"><div class="k">' + esc((h.roman ? h.roman + ' · ' : '') + (h.name || 'Laboratorio')) + '</div>'
              + '<h4>' + esc(h.title || '') + '</h4>'
              + (h.enunciado ? '<p class="en">' + esc(h.enunciado) + '</p>' : '')
              + '<pre>' + esc((h.dado ? h.dado + '\n' : '') + h.solucion) + '</pre></div>';
          }).join('') + '</div>';
      };
      caja.addEventListener('click', function (e) { var b = e.target.closest('.lg'); if (b) mostrar(b.getAttribute('data-l')); });
    }
  }

  /* ── cierre: el alumno elige cómo demuestra la fase ── */
  var VIAS = {
    codigo:    { titulo: 'Resolver el código', hecho: 'resolviendo el código',
                 desc: 'Los laboratorios de código de este tema, verificados.' },
    juicio:    { titulo: 'Resolver el juicio', hecho: 'resolviendo el juicio',
                 desc: 'Ejecutar las implementaciones, elegir una y justificar la elección.' },
    nopude:    { titulo: 'Declarar «no pude»', hecho: '',
                 desc: 'Explica dónde te atoraste. La fase se completa y puedes seguir, pero tu estrella queda hueca y tu maestro lo ve como punto de atasco. Puedes volver después y llenarla.' },
    todo:      { titulo: 'Resolver todos los laboratorios', hecho: 'resolviendo todos los laboratorios',
                 desc: 'Este tema pide todos sus laboratorios, sin excepción.' },
    evidencia: { titulo: 'Entregar la evidencia', hecho: 'con tu evidencia escrita', desc: 'Este tema todavía no tiene laboratorios aquí: deja tu justificación de diseño y tu bitácora de lo que trabajaste.' }
  };
  /* qué textos pide cada vía: d = justificación de diseño · b = bitácora · a = dónde se atoró
     (el juicio ya lleva su propia justificación dentro del laboratorio) */
  var CAMPOS = { codigo: ['d', 'b'], juicio: ['b'], todo: ['d', 'b'], evidencia: ['d', 'b'], nopude: ['a'] };
  var DEMOSTRAR = {
    modo: 'elegir', vias: ['codigo', 'juicio', 'nopude'], codigo: { min: 'todos' },
    nopude: { min: 120, label: '¿Dónde te atoraste?',
      hint: 'Sé concreto: hasta dónde llegaste, qué intentaste, qué te respondió el intérprete o el compilador y qué es lo que no entiendes. Esto es lo que lee tu maestro.',
      ph: 'Llegué hasta … / intenté … / me respondió … / lo que no entiendo es …' }
  };
  var SELLO_LLENO = '<span class="sealed"><span style="font-size:15px;line-height:1">✓</span> Práctica sellada · La Prueba</span>';
  var SELLO_HUECO = '<span class="sealed hueca"><span style="font-size:15px;line-height:1">☆</span> Práctica declarada · «no pude»</span>';

  class Cierre extends Base {
    disconnectedCallback() {
      super.disconnectedCallback();
      if (this._soltar) { this._soltar(); this._soltar = null; }
    }
    _html() {
      var G = this.P.generar, E = this.P.evidencia || {}, D = this._config(), h = '';
      if (G && (G.items || []).length) h += '<div class="gen"><div class="tt"><span>' + esc(this.pal.icon) + '</span>' + esc(G.titulo || 'Generar') + '</div><p>' + (G.intro || '') + '</p><ul>'
        + (G.items || []).map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>';
      var campo = function (id, c) { return '<div class="f" id="f-' + id + '" hidden><label for="' + id + '">' + esc(c.label) + '</label><div class="h">' + (c.hint || '') + '</div><textarea id="' + id + '" placeholder="' + esc(c.ph) + '"></textarea><div class="m" id="' + id + '-m"></div></div>'; };
      h += '<div class="px"><div class="eb">Práctica · ' + esc(etiquetaTema(this.tema)) + ' · Evidencia' + (this.ruta ? ' · Ruta ' + esc(this.ruta) : '') + '</div>'
        + '<h2>' + esc(E.titulo || 'Antes de terminar') + '</h2><p class="lede">' + (E.intro || '') + '</p>'
        + '<div id="previo"></div>'
        + '<div class="dem" id="dem" role="radiogroup" aria-labelledby="dq" hidden></div>'
        + campo('d', E.diseno || {}) + campo('b', E.bitacora || {})
        + '<div class="f" id="f-donde" hidden><label for="donde">¿En cuál laboratorio?</label><select id="donde"></select></div>'
        + campo('a', D.nopude || {})
        + '<div class="falta" id="falta" aria-live="polite"></div>'
        // el puente a la nota dialéctica va junto al botón de finalizar; se muestra con la práctica sellada (ver _armar)
        + '<div class="fila"><button class="btn" id="fin" disabled>' + esc(this.pal.icon) + ' Finalizar la práctica</button>'
        + '<a class="btn" id="pte" href="' + esc(this._puente()) + '" hidden>Repasa lo aprendido →</a></div>'
        + '<div class="ex" id="ex"><label>Evidencia para tu maestro — copia o descarga</label><pre id="snip"></pre>'
        + '<div class="acts"><button class="act" id="cp">Copiar</button><button class="act" id="dl">Descargar .json</button></div></div></div>';
      return h;
    }
    /* A dónde lleva «Repasa lo aprendido →»: atributo puente · practicas.json "dialectica" · ../dialecticas/<tema>d.html */
    _puente() { return this.getAttribute('puente') || this.P.dialectica || ('../dialecticas/' + this.tema + 'd.html'); }
    _config() { return configDemostrar(this); }
    _estado() {
      var R = this.shadowRoot;
      if (!R || !R.getElementById('d')) return null;
      var v = function (id) { var e = R.getElementById(id); return e ? e.value : ''; };
      return { d: v('d'), b: v('b'), a: v('a'), donde: v('donde'), via: this.via || null };
    }
    _listo(previo) {
      var self = this, R = this.shadowRoot, turno = this._turno;
      this.D = this._config(); this.via = null; this.vias = []; this.labs = { codigo: [], juicio: [] }; this._armado = false;
      ['d', 'b', 'a'].forEach(function (id) {
        var el = R.getElementById(id);
        if (previo && previo[id]) el.value = previo[id];
        el.addEventListener('input', function () { self._refrescar(); });
      });
      R.getElementById('dem').addEventListener('change', function (e) {
        if (e.target && e.target.name === 'via') { self.via = e.target.value; self._refrescar(); }
      });
      R.getElementById('fin').addEventListener('click', function () { self._sellar(); });
      R.getElementById('cp').addEventListener('click', function () { navigator.clipboard && navigator.clipboard.writeText(R.getElementById('snip').textContent); });
      R.getElementById('dl').addEventListener('click', function () {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([R.getElementById('snip').textContent], { type: 'application/json' }));
        a.download = self.tema + '-practica-evidencia.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });
      // cada laboratorio resuelto o intentado en la página actualiza las opciones sin repintar lo escrito
      if (this._soltar) this._soltar();
      this._soltar = alCambiarAvance(function () { self._refrescar(); });

      json(this.getAttribute('problemas') || (BASE + 'problemas.json'))
        .then(function (datos) { return labsDelTema(datos, self.tema, self.len); })
        .catch(function () { return { codigo: [], juicio: [] }; })     // sin problemas.json: solo la evidencia
        .then(function (labs) { if (turno !== self._turno) return; self.labs = labs; self._armar(previo); });
    }

    /* Decide qué vías se ofrecen y pinta el selector. `forzado`: el sello recién puesto. */
    _armar(previo, forzado) {
      var self = this, R = this.shadowRoot, D = this.D, labs = this.labs, sello = forzado || leerSello(this.tema);
      var vias = viasDelTema(D, labs);
      var llena = !!sello && sello.resultado !== 'declarada', hueca = !!sello && !llena;
      if (hueca) vias = vias.filter(function (v) { return v !== 'nopude'; });   // ya declaró: solo queda llenar la estrella
      if (llena) vias = [];
      this.sello = sello; this.llena = llena; this.hueca = hueca; this.vias = vias;
      this.via = vias.length === 1 ? vias[0] : (previo && vias.indexOf(previo.via) !== -1 ? previo.via : null);

      var hecho = llena && VIAS[sello.via] && VIAS[sello.via].hecho;
      R.getElementById('previo').innerHTML = llena
        ? SELLO_LLENO + '<p class="ns">' + (hecho ? 'Demostrada ' + esc(hecho) + '.' : 'Fase práctica completa.') + (sello.declarada_antes ? ' Antes la habías declarado «no pude»: la estrella ya está llena.' : '') + '</p>'
        : hueca ? SELLO_HUECO + '<p class="ns">La fase está completa y tu maestro ya tiene tu explicación. La estrella queda hueca hasta que lo resuelvas: cuando lo logres, vuelve aquí para llenarla.</p>'
        : '';

      // la evidencia sola no necesita selector; si además se ofrece «no pude», se muestran las dos
      var visibles = vias.length > 1 ? vias : vias.filter(function (v) { return v !== 'evidencia'; }), solo = vias.length === 1, dem = R.getElementById('dem');
      dem.hidden = !visibles.length;
      dem.innerHTML = !visibles.length ? '' : '<div class="q" id="dq">' + (hueca ? 'Para llenar la estrella' : solo ? 'Para finalizar' : '¿Cómo demuestras esta práctica? Elige una') + '</div>'
        + visibles.map(function (v) {
          var t = mezclar(VIAS[v], esObj(D[v]) ? D[v] : {});
          return '<label class="op' + (solo ? ' solo' : '') + '" data-op="' + v + '"><input type="radio" name="via" value="' + v + '"' + (self.via === v ? ' checked' : '') + '>'
            + '<span class="tx"><b>' + esc(t.titulo) + '</b><span class="ds">' + esc(t.desc) + '</span></span><span class="es" data-est></span></label>';
        }).join('');

      var donde = R.getElementById('donde');
      donde.innerHTML = '<option value="">En varios, o no sabría decir</option>' + labs.codigo.concat(labs.juicio).map(function (h) {
        return '<option value="' + esc(h.id) + '">' + esc(nombreLab(h)) + '</option>';
      }).join('');
      if (previo && previo.donde) donde.value = previo.donde;

      R.getElementById('fin').hidden = llena;
      // el puente a la dialéctica se abre con el sello, lleno o hueco («no pude» también deja seguir)
      R.getElementById('pte').hidden = !sello;
      if (sello && sello.sellado_en) this._exportar(sello);
      this._armado = true;
      this._refrescar();
    }

    _req(via) { return requisito(via, this.D, this.labs); }

    _refrescar() {
      if (!this._armado) return;
      var self = this, R = this.shadowRoot, via = this.via, E = this.P.evidencia || {}, D = this.D;
      Array.prototype.forEach.call(R.querySelectorAll('[data-op]'), function (op) {
        var v = op.getAttribute('data-op'), r = self._req(v), es = op.querySelector('[data-est]');
        var inp = op.querySelector('input');
        // «no pude» no se puede elegir hasta haber intentado algún laboratorio
        if (r.bloquea && v === via) { self.via = via = null; inp.checked = false; }
        inp.disabled = !!r.bloquea; op.classList.toggle('no', !!r.bloquea);
        op.title = r.bloquea ? r.msg : '';
        op.classList.toggle('on', v === via);
        es.textContent = r.txt + (r.ok && r.txt ? ' ✓' : '');
        es.classList.toggle('ok', r.ok && !!r.txt);
      });
      var pide = (via && CAMPOS[via]) || [], MIN = { d: E.min || 40, b: E.min || 40, a: (D.nopude && D.nopude.min) || 120 }, textos = true;
      ['d', 'b', 'a'].forEach(function (id) {
        var on = pide.indexOf(id) !== -1;
        R.getElementById('f-' + id).hidden = !on;
        if (!on) return;
        var n = R.getElementById(id).value.trim().length;
        R.getElementById(id + '-m').textContent = n + ' caracteres' + (n < MIN[id] ? ' · faltan ' + (MIN[id] - n) : ' ✓');
        if (n < MIN[id]) textos = false;
      });
      R.getElementById('f-donde').hidden = via !== 'nopude' || !(this.labs.codigo.length + this.labs.juicio.length);
      var r = via ? this._req(via) : null, fin = R.getElementById('fin');
      var np = !via && !this.llena && this.vias.indexOf('nopude') !== -1 ? this._req('nopude') : null;
      R.getElementById('falta').textContent = this.llena ? '' : !via ? 'Elige una opción para continuar.' + (np && np.bloquea ? ' «No pude» se habilita cuando hayas intentado algún laboratorio.' : '') : r.msg;
      fin.disabled = !(via && r.ok && textos);
      fin.textContent = via === 'nopude' ? '☆ Declarar «no pude» y continuar' : this.pal.icon + ' ' + (this.hueca ? 'Llenar la estrella' : 'Finalizar la práctica');
    }

    _exportar(o) {
      var R = this.shadowRoot;
      R.getElementById('snip').textContent = JSON.stringify(o, null, 2);
      R.getElementById('ex').classList.add('show');
    }

    _sellar() {
      var R = this.shadowRoot, via = this.via, FS = window.FisicaSave;
      if (!via || !this._req(via).ok) return;
      var s = leerSave(), L = s.laboratorios || {}, B = s.labBorradores || {}, pide = CAMPOS[via] || [], clase = null;
      var val = function (id) { return R.getElementById(id).value.trim(); };
      try { clase = FS && FS.getClase ? FS.getClase() : null; } catch (e) {}
      var o = { tema: this.tema, fase: 'practica', lenguaje: this.len, clase: clase, via: via, resultado: via === 'nopude' ? 'declarada' : 'demostrada' };
      // el estado de cada laboratorio al sellar: para el Panel, dónde hubo intentos y dónde no
      o.laboratorios = this.labs.codigo.concat(this.labs.juicio).map(function (h) {
        var r = L[h.id], x = r || B[h.id] || {};
        return { id: h.id, tipo: h.tipo, resuelto: !!r, intentos: x.intentos | 0, pistas: x.pistas | 0, solucionVista: !!x.solucionVista };
      });
      if (pide.indexOf('d') !== -1) o.justificacion_diseno = val('d');
      if (pide.indexOf('b') !== -1) o.bitacora_error_correccion = val('b');
      if (pide.indexOf('a') !== -1) { o.atasco = val('a'); o.atasco_en = R.getElementById('donde').value || null; }
      if (this.hueca) o.declarada_antes = { atasco: this.sello.atasco || '', atasco_en: this.sello.atasco_en || null, sellado_en: this.sello.sellado_en || null };
      o.sellado_en = new Date().toISOString();
      guardarSello(this.tema, o);
      this._armar(null, o);
      this.dispatchEvent(new CustomEvent('fisica:practica', { bubbles: true, composed: true,
        detail: { tema: this.tema, lenguaje: this.len, via: o.via, resultado: o.resultado } }));
    }
  }

  if (!customElements.get('practica-cabecera')) customElements.define('practica-cabecera', Cabecera);
  if (!customElements.get('practica-cierre')) customElements.define('practica-cierre', Cierre);
})();
