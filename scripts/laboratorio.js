/*
 * laboratorio.js
 * Física Computacional — <lab-codigo>: editor de código con verificación.
 *
 * Lo más simple, en una nota .qmd — todos los ejercicios del tema para la
 * ruta del alumno, cargando solo el motor que necesita:
 *
 *   <script src="/fisica-save.js"></script>
 *   <script src="/laboratorio.js"></script>
 *   <lab-tema tema="u2t3"></lab-tema>
 *
 * Uso de un ejercicio suelto (en una nota .qmd o en cualquier HTML):
 *
 *   <script src="mini-racket.js"></script>
 *   <script src="mini-haskell.js"></script>
 *   <script src="laboratorio.js"></script>
 *   <lab-codigo ejercicio="rkt-lab-1" fuente="problemas.json"></lab-codigo>
 *
 * O con el ejercicio escrito en el propio HTML:
 *
 *   <lab-codigo><script type="application/json">{ …ejercicio… }</script></lab-codigo>
 *
 * Verificación híbrida:
 *   1. el mini-intérprete del lenguaje ejecuta el programa (errores → panel Salida)
 *   2. se evalúan los "casos" y se comparan con lo esperado
 *   3. los "pasos" se marcan en vivo por reconocimiento de texto (no deciden)
 *   4. botón «compilador real» → manda el código al playground oficial
 *
 * Guardado (window.FisicaSave, clave "fisicaSave" de localStorage):
 *   · al resolver → FisicaSave.resolverLab(id, {tema, lenguaje, clave, intentos, pistas,
 *     solucionVista, codigo}) y evento 'fisica:lab'. Es lo que lee narrativa.js
 *     (progreso de la unidad, «labs», «labsUnidad», condición «si: { lab: … }»).
 *   · mientras tanto → FisicaSave.guardarBorradorLab(id, …): el código a medias, los
 *     intentos y las pistas. No cuenta para la narrativa.
 *   · al volver a la página el ejercicio recupera su código y su marca de «resuelto».
 *   No importa en qué orden se carguen fisica-save.js y este archivo: si FisicaSave aún
 *   no existe se lee y escribe el mismo guardado directamente.
 *
 * Ejercicio de juicio (tipo "juicio", <lab-juicio>): tres implementaciones ejecutables del
 * mismo método; el alumno las prueba, elige cuál usaría y justifica. Se verifica la elección;
 * la justificación viaja en el guardado para el profesor. Campos: candidatos [{etiqueta,
 * titulo, codigo, salidas?}], pruebas [{expr, nota?}], pregunta, correcta, retro [..],
 * minJustificacion, porque, dado?.
 *
 * «La misma idea en otras vías»: al resolver un ejercicio de código aparece la solución del
 * mismo tema en los demás lenguajes y una pregunta para comparar. La respuesta se guarda con
 * FisicaSave.observarVia y, si el alumno la comparte, el Panel la publica en voces-grupo.js.
 *
 * Campo opcional del ejercicio para la narrativa:
 *   "clave": "u1t1-kahan"  nombre del laboratorio que no depende de la ruta; es el que
 *   usan las condiciones «lab» de interludios.json. <lab-tema clave="u1t1-kahan"> monta
 *   ese laboratorio en la ruta del alumno (y <lab-tema tema="…"> deja fuera los que
 *   tienen clave, que van en su propia sección opcional).
 */
(function () {
  'use strict';

  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/[^\/]*$/, '') : '';
  })();
  /* la versión de laboratorio.js (?v=6) se reenvía a los motores que carga,
     para que una actualización no conviva con motores viejos en caché */
  var VERSION = (function () {
    var s = document.currentScript && document.currentScript.src;
    var m = s && s.match(/\?[^#]*/);
    return m ? m[0] : '';
  })();

  var PALETAS = {
    racket:  { p: '#534AB7', l: '#AFA9EC', a: '#3C3489' },
    haskell: { p: '#0F6E56', l: '#5DCAA5', a: '#085041' },
    idris:   { p: '#993C1D', l: '#F0997B', a: '#712B13' },
    agda:    { p: '#A8780C', l: '#E5C87A', a: '#6F4E08' },
    ats:     { p: '#5F5E5A', l: '#BFBDB5', a: '#403F3C' },
    mercury: { p: '#185FA5', l: '#85B7EB', a: '#0C447C' },
    lean:    { p: '#96770F', l: '#E3C878', a: '#6E5709' }
  };

  var SIMBOLOS = {
    haskell: ['->', '=>', '::', '<-', '\\', '$', '.', '++', '!!', '|'],
    racket:  ['λ', '(', ')', '[', ']', "'", '#t', '#f'],
    idris:   ['->', '=>', ':', '?', '\\', '{', '}', '**'],
    agda:    ['→', '∀', 'λ', '≡', '×', '⊎', '⊥', '⊤', '∷', '≤'],
    lean:    ['→', '∀', '∃', '¬', '∧', '∨', '↔', 'λ', '≤', '≠', '⟨', '⟩', '·'],
    ats:     ['->', '<>', ':', '{', '}', '@', '!'],
    mercury: [':-', '->', '=', ',', '.', '!']
  };

  var PLAYGROUNDS = {
    racket:  { nombre: 'try-racket', url: 'https://try-racket.defn.io/' },
    haskell: { nombre: 'play.haskell.org', url: 'https://play.haskell.org/' },
    idris:   { nombre: 'Idris2 playground', url: 'https://idris2-playground.vercel.app/' },
    agda:    { nombre: 'Agda pad', url: 'https://agdapad.quasicoherent.io/' },
    lean:    { nombre: 'Lean 4 web', url: 'https://live.lean-lang.org/#code=', plantilla: true },
    ats:     { nombre: 'ATS playground', url: 'http://www.ats-lang.org/SERVER/MYCODE/Patsoptaas_serve.php' },
    mercury: { nombre: 'Mercury (docs)', url: 'https://mercurylang.org/documentation/documentation.html' }
  };

  var VERIF_TXT = { interprete: 'revisado en el navegador', estructura: 'revisión por estructura' };
  var VERIF_AYUDA = {
    compilador: 'La solución de referencia se compiló y probó con la cadena de herramientas real del lenguaje.',
    interprete: 'Se ejecuta en un intérprete del navegador que cubre un subconjunto del lenguaje. Confírmalo en el compilador real.',
    estructura: 'Sin intérprete local: se revisa que el código tenga la estructura esperada. Confírmalo en el compilador real.'
  };
  var NOMBRES = { racket: 'Racket', haskell: 'Haskell', idris: 'Idris 2', agda: 'Agda', ats: 'ATS', mercury: 'Mercury', lean: 'Lean 4' };

  var MOTORES = {
    racket:  function () { return window.MiniRacket; },
    haskell: function () { return window.MiniHaskell; },
    idris:   function () { return window.MiniIdris; },
    mercury: function () { return window.MiniMercury; }
  };

  /* ── Guardado ─────────────────────────────────────────────────
     Se usa la API de fisica-save.js cuando está; si no, el mismo
     localStorage["fisicaSave"] con la misma forma.                 */
  var CLAVE_SAVE = 'fisicaSave', MAX_CODIGO = 8000;
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function leerSave() {
    try { return JSON.parse(localStorage.getItem((window.FisicaSave && window.FisicaSave.KEY) || CLAVE_SAVE)) || {}; }
    catch (e) { return {}; }
  }
  function escribirSave(s) { try { localStorage.setItem(CLAVE_SAVE, JSON.stringify(s)); } catch (e) {} }
  function temaDe(ej) {
    var m = String(ej.id || '').match(/u\d+t\d+/) || String(ej.clave || '').match(/u\d+t\d+/);
    return ej.tema || (m ? m[0] : null);
  }
  function estadoLab(id) {
    var s = leerSave();
    return { resuelto: (s.laboratorios || {})[id] || null, borrador: (s.labBorradores || {})[id] || null };
  }
  function guardarBorrador(id, datos) {
    var F = window.FisicaSave;
    if (F && F.guardarBorradorLab) { try { F.guardarBorradorLab(id, datos); } catch (e) {} return; }
    var s = leerSave();
    if (s.laboratorios && s.laboratorios[id]) return;
    if (!s.labBorradores) s.labBorradores = {};
    var b = s.labBorradores[id] || {};
    Object.keys(datos).forEach(function (k) { if (datos[k] != null) b[k] = datos[k]; });
    if (b.codigo != null) b.codigo = String(b.codigo).slice(0, MAX_CODIGO);
    b.fecha = hoy();
    s.labBorradores[id] = b;
    escribirSave(s);
  }
  function guardarResuelto(id, meta) {
    var F = window.FisicaSave;
    if (F && F.resolverLab) return F.resolverLab(id, meta);       // dispara 'fisica:lab'
    var s = leerSave();
    if (!s.laboratorios) s.laboratorios = {};
    if (s.laboratorios[id]) return s.laboratorios[id];
    var r = { fecha: hoy(), lenguaje: meta.lenguaje || null, tema: meta.tema || null };
    if (meta.clave) r.clave = meta.clave;
    r.intentos = Math.max(1, meta.intentos | 0);
    r.pistas = meta.pistas | 0;
    r.solucionVista = !!meta.solucionVista;
    if (meta.codigo != null) r.codigo = String(meta.codigo).slice(0, MAX_CODIGO);
    if (meta.tipo) r.tipo = meta.tipo;
    if (meta.eleccion != null) r.eleccion = meta.eleccion;
    if (meta.justificacion) r.justificacion = String(meta.justificacion).slice(0, 4000);
    if (meta.probadas != null) r.probadas = meta.probadas | 0;
    s.laboratorios[id] = r;
    if (s.labBorradores && s.labBorradores[id]) delete s.labBorradores[id];
    escribirSave(s);
    try { document.dispatchEvent(new CustomEvent('fisica:lab', { detail: { id: id, tema: r.tema, clave: r.clave || null } })); } catch (e) {}
    return r;
  }

  var cacheFuentes = {};
  function cargarFuente(url) {
    if (!cacheFuentes[url]) {
      cacheFuentes[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('no se pudo leer ' + url);
        return r.json();
      });
    }
    return cacheFuentes[url];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function normaliza(s) {
    return String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  }

  /* Un caso con "tolerancia" compara números, no texto: así 2, 2.0 y
     1.9999999999999998 valen lo mismo en Racket, Haskell y Mercury.
     La tolerancia es relativa al valor esperado (absoluta si se espera 0). */
  function coincide(obtenido, caso) {
    if (caso.tolerancia == null) return normaliza(obtenido) === normaliza(caso.espera);
    var a = parseFloat(String(obtenido).replace(/^\(|\)$/g, ''));
    var b = parseFloat(caso.espera);
    if (isNaN(a) || isNaN(b)) return false;
    var margen = b === 0 ? caso.tolerancia : caso.tolerancia * Math.abs(b);
    return Math.abs(a - b) <= margen;
  }

  var CSS = function (P) { return "\
:host{display:block;margin:2.2rem 0;font-family:'Newsreader',Georgia,serif;color:#2A2722;--p:" + P.p + ";--pl:" + P.l + ";--pa:" + P.a + ";}\
*{box-sizing:border-box;}\
.caja{border:1px solid rgba(60,48,20,.2);border-top:3px solid var(--p);border-radius:6px;background:#FAF5EA;overflow:hidden;}\
.cab{padding:14px 18px 12px;border-bottom:1px solid rgba(60,48,20,.14);}\
.kicker{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--pa);display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;}\
.kicker b{font-weight:600;}\
.kicker .hecho{margin-left:auto;color:var(--pa);border:1px solid var(--pl);border-radius:3px;padding:1px 7px;letter-spacing:.12em;}\
.kicker .hecho[hidden]{display:none;}\
h3{margin:.3rem 0 0;font-size:1.22rem;font-weight:500;line-height:1.2;}\
.enun{margin:.5rem 0 0;font-size:.98rem;line-height:1.5;text-wrap:pretty;}\
.cuerpo{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:0;}\
@media(max-width:720px){.cuerpo{grid-template-columns:minmax(0,1fr);}}\
.col-izq{border-right:1px solid rgba(60,48,20,.14);min-width:0;}\
@media(max-width:720px){.col-izq{border-right:none;border-bottom:1px solid rgba(60,48,20,.14);}}\
.barra{display:flex;align-items:center;gap:10px;padding:7px 12px;background:rgba(60,48,20,.045);border-bottom:1px solid rgba(60,48,20,.1);font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;color:#6A5F49;}\
.barra .archivo{flex:1;letter-spacing:.06em;}\
.dado{padding:8px 12px 0;}\
.dado pre{margin:0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.55;color:#6A5F49;background:rgba(60,48,20,.05);border-left:2px solid rgba(60,48,20,.18);padding:8px 10px;border-radius:3px;white-space:pre-wrap;}\
.dado .et{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#6A5F49;margin-bottom:4px;}\
.ed{position:relative;display:flex;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;line-height:1.6;background:#FCFAF3;}\
.gutter{flex:0 0 auto;padding:10px 8px 10px 12px;text-align:right;color:#6A5F49;user-select:none;white-space:pre;border-right:1px solid rgba(60,48,20,.1);background:rgba(60,48,20,.03);}\
textarea{flex:1;min-width:0;border:0;outline:0;resize:vertical;background:transparent;color:#2A2722;font:inherit;line-height:inherit;padding:10px 12px;min-height:118px;tab-size:2;}\
textarea::placeholder{color:#6A5F49;}\
.simb{display:flex;flex-wrap:wrap;gap:5px;padding:8px 12px;border-top:1px solid rgba(60,48,20,.1);background:rgba(60,48,20,.02);}\
.simb button{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;padding:2px 7px;background:#FAF5EA;border:1px solid rgba(60,48,20,.22);border-radius:3px;color:#4A4336;cursor:pointer;}\
.simb button:hover{border-color:var(--p);color:var(--pa);}\
.acc{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid rgba(60,48,20,.12);}\
button.b{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.09em;text-transform:uppercase;padding:7px 13px;border-radius:3px;cursor:pointer;border:1px solid var(--p);background:var(--p);color:#FFF;}\
button.b:hover{background:var(--pa);border-color:var(--pa);}\
button.g{background:transparent;color:var(--pa);}\
button.g:hover{background:rgba(60,48,20,.06);color:var(--pa);}\
button.b[disabled]{opacity:.45;cursor:default;}\
.atajo{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px;color:#6A5F49;letter-spacing:.06em;}\
.col-der{display:flex;flex-direction:column;min-width:0;}\
.panel{border-bottom:1px solid rgba(60,48,20,.12);}\
.panel:last-child{border-bottom:none;}\
.ph{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.17em;text-transform:uppercase;color:var(--pa);padding:9px 14px 0;}\
.pc{padding:6px 14px 12px;font-size:.9rem;line-height:1.5;}\
.obj{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;color:#2A2722;background:rgba(60,48,20,.045);border-left:2px solid var(--pl);padding:7px 10px;border-radius:3px;white-space:pre-wrap;}\
.obj .turn{color:var(--p);font-weight:600;margin-right:6px;}\
ol.pasos{list-style:none;margin:0;padding:0;}\
ol.pasos li{display:flex;gap:9px;align-items:flex-start;padding:3px 0;font-size:.88rem;line-height:1.4;color:#6A5F49;}\
ol.pasos li .mk{flex:0 0 auto;width:15px;height:15px;margin-top:2px;border:1px solid rgba(60,48,20,.28);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:9px;color:transparent;}\
ol.pasos li.ok{color:#2A2722;}\
ol.pasos li.ok .mk{background:var(--p);border-color:var(--p);color:#FFF;}\
.salida{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;color:#4A4336;min-height:2.6em;max-height:190px;overflow:auto;}\
.salida .err{color:#8C2F17;}\
.salida .ok{color:var(--pa);}\
.salida .vacio{color:#6A5F49;font-family:'Newsreader',Georgia,serif;font-style:italic;}\
.casos{list-style:none;margin:6px 0 0;padding:0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;}\
.casos li{display:flex;gap:8px;padding:2px 0;align-items:baseline;color:#6A5F49;}\
.casos li .est{flex:0 0 auto;width:1.1em;}\
.casos li.bien .est{color:var(--p);}\
.casos li.mal{color:#8C2F17;}\
.veredicto{margin:0;padding:12px 14px;border-top:1px solid rgba(60,48,20,.12);font-size:.95rem;line-height:1.5;display:none;}\
.veredicto.on{display:block;}\
.veredicto.bien{background:rgba(60,48,20,.04);border-left:3px solid var(--p);}\
.veredicto.mal{background:rgba(140,47,23,.05);border-left:3px solid #8C2F17;}\
.veredicto .t{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;display:block;margin-bottom:4px;color:var(--pa);}\
.veredicto.mal .t{color:#8C2F17;}\
.pista{margin:8px 14px 0;padding:9px 11px;background:rgba(60,48,20,.045);border-left:2px solid var(--pl);border-radius:3px;font-size:.9rem;line-height:1.45;}\
.pista .n{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--pa);display:block;margin-bottom:3px;}\
.sol{margin:8px 14px 12px;}\
.sol pre{margin:0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.55;background:rgba(60,48,20,.05);border-left:2px solid var(--p);padding:9px 11px;border-radius:3px;white-space:pre-wrap;}\
.nota{padding:8px 14px 12px;font-size:.82rem;line-height:1.45;color:#6A5F49;font-style:italic;}\
a{color:var(--p);}a:hover{color:var(--pa);}\
.vias,.jz{margin:0 14px 12px;border:1px solid rgba(60,48,20,.14);border-radius:6px;background:rgba(255,255,255,.55);}\
.vh{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--p);padding:10px 14px 0;}\
.vtabs,.jtabs{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px 0;}\
.vtabs button,.jtabs button{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;padding:5px 11px;border-radius:4px;border:1px solid rgba(60,48,20,.22);background:transparent;color:#3E3627;cursor:pointer;}\
.vtabs button.on,.jtabs button.on{background:var(--p);border-color:var(--p);color:#fff;}\
.vcod,.jcod{margin:10px 14px 0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.55;background:#1C1B18;color:#ECE8DD;padding:11px 13px;border-radius:5px;white-space:pre;overflow-x:auto;}\
.vq,.jq{padding:10px 14px 14px;display:flex;flex-direction:column;gap:8px;font-size:.92rem;line-height:1.45;color:#3E3627;}\
.vq textarea,.jq textarea{font:inherit;font-size:.92rem;min-height:64px;padding:8px 10px;border:1px solid rgba(60,48,20,.22);border-radius:5px;background:#fff;resize:vertical;}\
.fila{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}\
.fila label{display:flex;gap:6px;align-items:center;font-size:.85rem;cursor:pointer;}\
.chico{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;color:#7A6F58;}\
.voz{border-left:2px solid var(--l);padding:4px 10px;margin:4px 0;font-size:.88rem;}\
.ops{display:flex;flex-direction:column;gap:6px;}\
.ops label{display:flex;gap:9px;align-items:flex-start;padding:7px 10px;border:1px solid rgba(60,48,20,.16);border-radius:5px;cursor:pointer;background:#fff;}\
.ops label.mal{border-color:#C46A6A;background:#FBEFEE;}\
.ops label.bien{border-color:#3E8E5A;background:#EEF7F0;}\
.retro{margin:0;padding-left:18px;font-size:.88rem;line-height:1.5;color:#4A4232;}\
"; };

  var HTML = '\
<div class="caja">\
  <div class="cab">\
    <div class="kicker"><b data-k-roman></b><span data-k-tag></span><span class="hecho" data-k-hecho hidden></span></div>\
    <h3 data-titulo></h3>\
    <p class="enun" data-enunciado></p>\
  </div>\
  <div class="cuerpo">\
    <div class="col-izq">\
      <div class="barra"><span class="archivo" data-archivo></span><span class="atajo">Ctrl ⏎ verificar</span></div>\
      <div class="dado" data-dado hidden><div class="et">Dado</div><pre data-dado-pre></pre></div>\
      <div class="ed"><div class="gutter" data-gutter>1</div><textarea spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div>\
      <div class="simb" data-simb></div>\
      <div class="acc">\
        <button class="b" data-verificar>Verificar</button>\
        <button class="b g" data-pista>Pista</button>\
        <button class="b g" data-solucion>Revelar solución</button>\
        <button class="b g" data-copiar>Copiar</button>\
        <button class="b g" data-bajar>Descargar</button>\
        <button class="b g" data-real hidden>Compilador real</button>\
      </div>\
    </div>\
    <div class="col-der">\
      <div class="panel" data-panel-obj><div class="ph">Objetivo</div><div class="pc"><div class="obj" data-obj></div></div></div>\
      <div class="panel" data-panel-pasos><div class="ph">Pasos sugeridos</div><div class="pc"><ol class="pasos" data-pasos></ol></div></div>\
      <div class="panel"><div class="ph">Salida</div><div class="pc"><div class="salida" data-salida><span class="vacio">Escribe y pulsa Verificar.</span></div><ul class="casos" data-casos></ul></div></div>\
    </div>\
  </div>\
  <div class="veredicto" data-veredicto></div>\
  <div data-pistas></div>\
  <div class="sol" data-sol hidden><pre data-sol-pre></pre></div>\
  <div class="nota" data-nota></div>\
</div>';

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

  class LabCodigo extends HTMLElement {
    connectedCallback() {
      if (this._listo) return;
      this._listo = true;
      this.attachShadow({ mode: 'open' });
      aislarTeclado(this.shadowRoot);
      var inline = this.querySelector('script[type="application/json"]');
      if (inline) {
        try { this._pintar(JSON.parse(inline.textContent)); }
        catch (e) { this._fallo('el ejercicio incrustado no es JSON válido: ' + e.message); }
        return;
      }
      var id = this.getAttribute('ejercicio');
      var fuente = this.getAttribute('fuente') || 'problemas.json';
      if (!id) { this._fallo('falta el atributo ejercicio="…"'); return; }
      var self = this;
      cargarFuente(fuente).then(function (datos) {
        var lista = datos.hechizos || datos.ejercicios || datos;
        var ej = (lista || []).filter(function (x) { return x && x.id === id; })[0];
        if (!ej) throw new Error('no encontré el ejercicio "' + id + '" en ' + fuente);
        self._pintar(ej);
      }).catch(function (e) { self._fallo(e.message); });
    }

    _fallo(msg) {
      this.shadowRoot.innerHTML = '<div style="font-family:IBM Plex Mono,monospace;font-size:12px;color:#8C2F17;'
        + 'border:1px dashed #8C2F17;border-radius:4px;padding:10px 12px;background:#FBF3EF;">'
        + 'lab-codigo: ' + esc(msg) + '</div>';
    }

    _pintar(ej) {
      this.ej = ej;
      var lang = (ej.lenguaje || 'racket').toLowerCase();
      var P = PALETAS[lang] || PALETAS.racket;
      var raiz = this.shadowRoot;
      raiz.innerHTML = '<style>' + CSS(P) + '</style>' + HTML;
      var q = function (s) { return raiz.querySelector(s); };
      this.q = q;

      q('[data-k-roman]').textContent = (ej.roman ? ej.roman + ' · ' : '') + (ej.name || 'Laboratorio');
      q('[data-k-tag]').textContent = ej.tag || '';
      var verif = ej.verificado || (MOTORES[lang] ? 'interprete' : 'estructura');
      var sv = document.createElement('span');
      sv.title = VERIF_AYUDA[verif] || '';
      sv.style.cssText = 'margin-left:auto;font-size:9.5px;letter-spacing:.06em;padding:2px 7px;border-radius:3px;border:1px solid ' + (verif === 'compilador' ? 'var(--p);color:var(--p);' : 'rgba(60,48,20,.25);color:#7A6F58;');
      sv.textContent = verif === 'compilador' ? ('verificado con ' + (ej.verificadoCon || 'compilador real')) : (VERIF_TXT[verif] || verif);
      q('.kicker').appendChild(sv);
      q('[data-titulo]').textContent = ej.title || '';
      q('[data-enunciado]').textContent = ej.enunciado || '';
      q('[data-archivo]').textContent = ej.archivo || ('ejercicio.' + (lang === 'haskell' ? 'hs' : lang === 'racket' ? 'rkt' : 'txt'));

      if (ej.dado) {
        q('[data-dado]').hidden = false;
        q('[data-dado-pre]').textContent = ej.dado;
      }
      if (ej.objetivo) q('[data-obj]').innerHTML = '<span class="turn">⊢</span>' + esc(ej.objetivo);
      else q('[data-panel-obj]').remove();

      var pasos = ej.pasos || [];
      if (pasos.length) {
        q('[data-pasos]').innerHTML = pasos.map(function (p, i) {
          return '<li data-i="' + i + '"><span class="mk">✓</span><span>' + esc(p.texto || p) + '</span></li>';
        }).join('');
      } else {
        q('[data-panel-pasos]').remove();
      }

      var simbolos = ej.simbolos || SIMBOLOS[lang] || [];
      var cs = q('[data-simb]');
      if (simbolos.length) {
        cs.innerHTML = simbolos.map(function (s) { return '<button type="button" data-ins="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
      } else cs.remove();

      var ta = raiz.querySelector('textarea');
      ta.value = ej.plantilla || '';
      ta.rows = Math.max(5, (ta.value.split('\n').length + 2));
      ta.placeholder = ej.marcador || 'escribe tu código aquí…';

      var pg = ej.playground || PLAYGROUNDS[lang];
      if (pg) {
        var br = q('[data-real]');
        br.hidden = false;
        br.textContent = 'Abrir en ' + pg.nombre;
      }

      var motor = MOTORES[lang] && MOTORES[lang]();
      q('[data-nota]').textContent = motor
        ? 'Verificación local con un subconjunto de ' + lang + ' (sin compilador). Otra solución correcta puede usar pasos distintos; los casos de prueba deciden.'
        : 'Este lenguaje aún no tiene intérprete local: se comprueban los pasos por reconocimiento de texto y puedes confirmarlo en el compilador real.';

      if (!(ej.pistas || []).length) q('[data-pista]').remove();
      if (!ej.solucion) q('[data-solucion]').remove();

      this._cablear();
      this._restaurar();
      this._marcarPasos();
      this._gutter();
    }

    /* Recupera del guardado el código, los contadores y la marca de «resuelto». */
    _restaurar() {
      this.intentos = 0; this.pistasVistas = 0; this.solucionVista = false;
      var ej = this.ej; if (!ej.id) return;
      var e = estadoLab(ej.id), previo = e.resuelto || e.borrador;
      if (!previo) return;
      var ta = this.shadowRoot.querySelector('textarea');
      if (previo.codigo != null && previo.codigo !== '') {
        ta.value = previo.codigo;
        ta.rows = Math.max(5, ta.value.split('\n').length + 2);
      }
      this.intentos = previo.intentos | 0;
      this.pistasVistas = previo.pistas | 0;
      this.solucionVista = !!previo.solucionVista;
      if (e.resuelto) this._marcarResuelto(e.resuelto);
    }

    _marcarResuelto(r) {
      var m = this.q('[data-k-hecho]'); if (!m) return;
      m.hidden = false;
      m.textContent = '✓ resuelto' + (r && r.fecha ? ' · ' + r.fecha : '');
      this._otrasVias();
    }

    /* «La misma idea en otras vías»: solo después de resolver, para no adelantar la solución */
    _otrasVias() {
      if (this._viasHechas || this.getAttribute('sin-vias') != null) return;
      this._viasHechas = true;
      var self = this, ej = this.ej, tema = temaDe(ej), propio = (ej.lenguaje || '').toLowerCase();
      if (!tema) return;
      var fuente = this.getAttribute('fuente') || (BASE + 'problemas.json');
      cargarFuente(fuente).then(function (datos) {
        var visto = {}, otras = (datos.hechizos || datos.ejercicios || datos || []).filter(function (h) {
          if (!h || h.tipo !== 'codigo' || h.tema !== tema || (h.clave || null) !== (ej.clave || null) || !h.solucion) return false;
          var l = (h.lenguaje || '').toLowerCase();
          if (l === propio || visto[l]) return false;
          return (visto[l] = true);
        });
        if (otras.length) self._pintarVias(tema, propio, otras);
      }).catch(function () {});
    }

    _pintarVias(tema, propio, otras) {
      var self = this, caja = this.shadowRoot.querySelector('.caja'), nota = this.q('[data-nota]');
      var d = document.createElement('div');
      d.className = 'vias';
      d.innerHTML = '<div class="vh">La misma idea en otras vías</div>'
        + '<div class="vtabs">' + otras.map(function (h, i) { return '<button type="button" data-v="' + i + '">' + esc(NOMBRES[h.lenguaje] || h.lenguaje) + '</button>'; }).join('') + '</div>'
        + '<div class="vcod" data-vcod></div>'
        + '<div class="vq"><span data-vpreg></span><textarea data-vtxt placeholder="Por ejemplo: aquí el tipo obliga a declarar…, allá la recursión deja a la vista…"></textarea>'
        + '<div class="fila"><label><input type="checkbox" data-vcomp> Compartir con el grupo</label>'
        + '<label><input type="radio" name="vfirma" value="anonimo" checked> Anónimo</label><label><input type="radio" name="vfirma" value="nombre"> Con mi nombre</label>'
        + '<button type="button" class="b" data-vguardar>Guardar observación</button><span class="chico" data-vok></span></div>'
        + '<div data-vvoces></div></div>';
      caja.insertBefore(d, nota);
      var actual = 0;
      var mostrar = function (i) {
        actual = i;
        var h = otras[i], otro = h.lenguaje;
        d.querySelectorAll('[data-v]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === i); });
        d.querySelector('[data-vcod]').textContent = h.solucion;
        d.querySelector('[data-vpreg]').innerHTML = '¿Qué hace explícito <b>' + esc(NOMBRES[otro] || otro) + '</b> que <b>' + esc(NOMBRES[propio] || propio) + '</b> deja implícito, o al revés?';
        var previa = (leerSave().observacionesVias || []).filter(function (o) { return o.tema === tema && o.de === propio && o.a === otro; })[0];
        d.querySelector('[data-vtxt]').value = previa ? previa.texto : '';
        d.querySelector('[data-vcomp]').checked = !!(previa && previa.compartir);
        d.querySelector('[data-vok]').textContent = previa ? 'guardada · ' + previa.fecha : '';
        var G = (window.VOCES_GRUPO && window.VOCES_GRUPO.voces) || [];
        var vs = G.filter(function (v) { return v.via && v.tema === tema && ((v.via.de === propio && v.via.a === otro) || (v.via.de === otro && v.via.a === propio)); });
        d.querySelector('[data-vvoces]').innerHTML = vs.length
          ? '<div class="chico" style="margin-top:4px;">VOCES DEL GRUPO</div>' + vs.map(function (v) { return '<div class="voz">' + esc(v.texto) + ' <span class="chico">— ' + esc(v.firma) + ' · ' + esc(v.via.de) + ' ↔ ' + esc(v.via.a) + '</span></div>'; }).join('')
          : '';
      };
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]');
        if (b) mostrar(+b.getAttribute('data-v'));
      });
      d.querySelector('[data-vguardar]').addEventListener('click', function () {
        var otro = otras[actual].lenguaje, txt = d.querySelector('[data-vtxt]').value;
        var extra = { compartir: d.querySelector('[data-vcomp]').checked, firma: (d.querySelector('input[name=vfirma]:checked') || {}).value || 'anonimo' };
        var r = window.FisicaSave && window.FisicaSave.observarVia
          ? window.FisicaSave.observarVia(tema, propio, otro, txt, extra) : { ok: false, motivo: 'sin fisica-save.js' };
        d.querySelector('[data-vok]').textContent = r.ok ? (extra.compartir ? 'guardada · viajará en tu guardado' : 'guardada') : (r.motivo === 'vacía' ? 'escribe algo primero' : 'no se pudo guardar');
      });
      mostrar(0);
      if (!window.VOCES_GRUPO) cargarScript('VOCES_GRUPO', 'voces-grupo.js').then(function () { mostrar(actual); }).catch(function () {});
    }

    _estado() {
      var ej = this.ej;
      return {
        tema: temaDe(ej), lenguaje: ej.lenguaje || null, clave: ej.clave || null,
        intentos: this.intentos | 0, pistas: this.pistasVistas | 0, solucionVista: !!this.solucionVista,
        codigo: this.shadowRoot.querySelector('textarea').value
      };
    }

    /* guarda el trabajo a medias (con retraso al escribir, de inmediato en lo demás) */
    _borrador(ya) {
      var self = this;
      if (!this.ej.id) return;
      clearTimeout(this._tb);
      var hacer = function () { guardarBorrador(self.ej.id, self._estado()); };
      if (ya) hacer(); else this._tb = setTimeout(hacer, 900);
    }

    _cablear() {
      var self = this, raiz = this.shadowRoot, ta = raiz.querySelector('textarea'), q = this.q;
      this.pistaN = 0;

      ta.addEventListener('input', function () { self._marcarPasos(); self._gutter(); self._borrador(); });
      ta.addEventListener('blur', function () { if (self._tb) self._borrador(true); });
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          var i = ta.selectionStart, j = ta.selectionEnd;
          ta.value = ta.value.slice(0, i) + '  ' + ta.value.slice(j);
          ta.selectionStart = ta.selectionEnd = i + 2;
          self._gutter();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); self._verificar(); }
      });
      ta.addEventListener('scroll', function () { q('[data-gutter]').style.transform = 'translateY(' + (-ta.scrollTop) + 'px)'; });

      raiz.addEventListener('click', function (e) {
        var ins = e.target.closest('[data-ins]');
        if (ins) {
          var s = ins.getAttribute('data-ins'), i = ta.selectionStart, j = ta.selectionEnd;
          ta.value = ta.value.slice(0, i) + s + ta.value.slice(j);
          ta.focus();
          ta.selectionStart = ta.selectionEnd = i + s.length;
          self._marcarPasos();
          self._gutter();
        }
      });

      q('[data-verificar]').addEventListener('click', function () { self._verificar(); });

      var bp = q('[data-pista]');
      if (bp) bp.addEventListener('click', function () {
        var ps = self.ej.pistas || [];
        if (self.pistaN >= ps.length) return;
        var d = document.createElement('div');
        d.className = 'pista';
        d.innerHTML = '<span class="n">Pista ' + (self.pistaN + 1) + ' de ' + ps.length + '</span>' + esc(ps[self.pistaN]);
        q('[data-pistas]').appendChild(d);
        self.pistaN++;
        self.pistasVistas = Math.max(self.pistasVistas | 0, self.pistaN);
        self._borrador(true);
        bp.textContent = self.pistaN >= ps.length ? 'Sin más pistas' : 'Pista ' + (self.pistaN + 1);
        if (self.pistaN >= ps.length) bp.disabled = true;
      });

      var bs = q('[data-solucion]');
      if (bs) bs.addEventListener('click', function () {
        var caja = q('[data-sol]');
        caja.hidden = !caja.hidden;
        if (!caja.hidden && !self.solucionVista) { self.solucionVista = true; self._borrador(true); }
        q('[data-sol-pre]').textContent = self.ej.solucion;
        bs.textContent = caja.hidden ? 'Revelar solución' : 'Ocultar solución';
      });

      q('[data-copiar]').addEventListener('click', function () {
        navigator.clipboard && navigator.clipboard.writeText(self._codigo());
        var b = q('[data-copiar]');
        b.textContent = 'Copiado';
        setTimeout(function () { b.textContent = 'Copiar'; }, 1400);
      });

      q('[data-bajar]').addEventListener('click', function () {
        var blob = new Blob([self._codigo()], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = q('[data-archivo]').textContent || 'ejercicio.txt';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      });

      var br = q('[data-real]');
      if (br) br.addEventListener('click', function () {
        var lang = (self.ej.lenguaje || 'racket').toLowerCase();
        var pg = self.ej.playground || PLAYGROUNDS[lang];
        var codigo = self._codigo();
        if (pg.plantilla) { window.open(pg.url + encodeURIComponent(codigo), '_blank', 'noopener'); return; }
        if (navigator.clipboard) navigator.clipboard.writeText(codigo);
        br.textContent = 'Código copiado ↗';
        setTimeout(function () { br.textContent = 'Abrir en ' + pg.nombre; }, 2200);
        window.open(pg.url, '_blank', 'noopener');
      });
    }

    _codigo() {
      var ta = this.shadowRoot.querySelector('textarea');
      return ((this.ej.dado ? this.ej.dado + '\n' : '') + ta.value);
    }

    _gutter() {
      var ta = this.shadowRoot.querySelector('textarea');
      var n = ta.value.split('\n').length;
      var g = this.q('[data-gutter]');
      var txt = [];
      for (var i = 1; i <= Math.max(n, 1); i++) txt.push(i);
      g.textContent = txt.join('\n');
      if (n * 21 + 20 > ta.clientHeight) ta.style.height = (n * 21 + 24) + 'px';
    }

    _marcarPasos() {
      var pasos = this.ej.pasos || [];
      if (!pasos.length) return;
      // los pasos juzgan SOLO lo que escribió el alumno, nunca el bloque "dado"
      var codigo = this.shadowRoot.querySelector('textarea').value, plano = normaliza(codigo);
      var lis = this.shadowRoot.querySelectorAll('ol.pasos li');
      this._pasosOk = [];
      pasos.forEach(function (p, i) {
        var ok = false;
        try {
          // se prueba sobre el código tal cual está escrito: así un patrón como
          // "=[ \t]*\S" distingue una línea con cuerpo de una línea a medias.
          if (p.patron) ok = new RegExp(p.patron).test(codigo);
          else if (p.contiene) ok = plano.indexOf(normaliza(p.contiene)) !== -1;
        } catch (e) { ok = false; }
        this._pasosOk.push(ok);
        if (lis[i]) lis[i].classList.toggle('ok', ok);
      }, this);
    }

    _verificar() {
      var ej = this.ej, q = this.q, lang = (ej.lenguaje || 'racket').toLowerCase();
      var codigo = this._codigo();
      var motor = MOTORES[lang] && MOTORES[lang]();
      var salida = q('[data-salida]'), casos = q('[data-casos]'), ver = q('[data-veredicto]');
      casos.innerHTML = '';
      this._marcarPasos();

      if (!String(this.shadowRoot.querySelector('textarea').value).trim()) {
        salida.innerHTML = '<span class="vacio">El editor está vacío.</span>';
        ver.className = 'veredicto'; return;
      }
      this.intentos = (this.intentos | 0) + 1;
      this._borrador(true);

      // patrones prohibidos: lo que compila pero no resuelve (sorry, admit, …)
      var vetado = (ej.prohibido || []).filter(function (p) {
        try { return new RegExp(p.patron).test(codigo); } catch (e) { return false; }
      })[0];
      if (vetado) {
        salida.innerHTML = '<span class="err">' + esc(vetado.mensaje || 'Queda algo pendiente en tu código.') + '</span>';
        this._veredicto(false, vetado.mensaje || 'Queda algo pendiente en tu código.');
        return;
      }

      if (!motor) {                     // sin intérprete: solo reconocimiento de texto
        var faltan = (ej.pasos || []).filter(function (p, i) { return !this._pasosOk[i]; }, this);
        var listo = !faltan.length && (ej.pasos || []).length > 0;
        salida.innerHTML = '<span class="' + (listo ? 'ok' : '') + '">'
          + esc(listo ? 'Los pasos esperados aparecen en tu código.' : 'Aún faltan pasos por cubrir.') + '</span>';
        this._veredicto(listo, listo ? (ej.porque || 'Tu código cubre los pasos. Confírmalo en el compilador real.')
          : 'Revisa los pasos sin marcar en el panel de la derecha.');
        if (listo) this._guardar();
        return;
      }

      var res = motor.ejecutar(codigo);
      var partes = [];
      if (res.salida) partes.push(esc(res.salida.replace(/\n$/, '')));
      (res.valores || []).forEach(function (v) {
        partes.push(esc((v.nombre ? v.nombre + ' = ' : '') + v.texto));
      });
      if (!res.ok) {
        salida.innerHTML = (partes.length ? partes.join('\n') + '\n' : '')
          + '<span class="err">' + esc(res.error) + '</span>';
        this._veredicto(false, 'El programa no llegó a ejecutarse. Lee el error en Salida: suele señalar el paréntesis, el nombre o el patrón que falta.');
        return;
      }

      var listaCasos = ej.casos || [];
      var bien = 0;
      listaCasos.forEach(function (c) {
        var r = motor.evaluarEn(codigo, c.expr);
        var obtenido = r.ok ? r.texto : ('✗ ' + r.error);
        var pasa = r.ok && coincide(obtenido, c);
        if (pasa) bien++;
        var li = document.createElement('li');
        li.className = pasa ? 'bien' : 'mal';
        li.innerHTML = '<span class="est">' + (pasa ? '✓' : '✗') + '</span><span>' + esc(c.expr)
          + ' → ' + esc(obtenido) + (pasa ? '' : '   <i>(esperado ' + esc(c.espera) + (c.tolerancia != null ? ' ± ' + Number((c.tolerancia * 100).toPrecision(2)) + ' %' : '') + ')</i>') + '</span>';
        casos.appendChild(li);
      });

      var salidaOk = true;
      if (ej.salidaEspera != null) {
        salidaOk = normaliza(res.salida) === normaliza(ej.salidaEspera);
      }
      salida.innerHTML = partes.length
        ? partes.join('\n')
        : '<span class="vacio">Sin salida impresa; los casos de prueba van abajo.</span>';

      var todoBien = salidaOk && bien === listaCasos.length && listaCasos.length > 0;
      if (todoBien) {
        var faltantes = (ej.pasos || []).filter(function (p, i) { return p.requerido && !this._pasosOk[i]; }, this);
        if (faltantes.length) {
          this._veredicto(true, (ej.porque || 'Los casos pasan.') + ' Observación: el ejercicio pedía «'
            + faltantes[0].texto + '»; funciona, pero no por el camino que practicamos.');
        } else {
          this._veredicto(true, ej.porque || 'Todos los casos de prueba pasan.');
        }
        this._guardar();
      } else if (!salidaOk) {
        this._veredicto(false, 'El resultado es correcto pero la salida impresa no coincide con la esperada.');
      } else {
        this._veredicto(false, bien
          ? 'Pasan ' + bien + ' de ' + listaCasos.length + ' casos. Mira cuál falla y con qué valor.'
          : 'Ningún caso de prueba pasa todavía. Compara tu resultado con el esperado.');
      }
    }

    _veredicto(bien, texto) {
      var v = this.q('[data-veredicto]');
      v.className = 'veredicto on ' + (bien ? 'bien' : 'mal');
      v.innerHTML = '<span class="t">' + (bien ? 'Resuelto' : 'Todavía no') + '</span>' + esc(texto);
    }

    _guardar() {
      var ej = this.ej;
      if (!ej.id) return;
      clearTimeout(this._tb);
      try {
        var m = this._estado();
        var r = guardarResuelto(ej.id, m);
        this._marcarResuelto(r);
        // 'fisica:lab' lo dispara el guardado (solo la primera vez); este otro avisa siempre
        document.dispatchEvent(new CustomEvent('fisica:laboratorio', { detail: { id: ej.id, tema: m.tema, clave: m.clave } }));
      } catch (e) {}
    }
  }

  if (!window.customElements.get('lab-codigo')) window.customElements.define('lab-codigo', LabCodigo);

  /* ── <lab-juicio>: elegir entre implementaciones plausibles ── */
  class LabJuicio extends HTMLElement {
    connectedCallback() {
      if (this._listo) return;
      this._listo = true;
      this.attachShadow({ mode: 'open' });
      aislarTeclado(this.shadowRoot);
      var inline = this.querySelector('script[type="application/json"]'), self = this;
      if (inline) { try { this._pintar(JSON.parse(inline.textContent)); } catch (e) { this._fallo('JSON inválido: ' + e.message); } return; }
      var id = this.getAttribute('ejercicio'), fuente = this.getAttribute('fuente') || (BASE + 'problemas.json');
      if (!id) { this._fallo('falta el atributo ejercicio="…"'); return; }
      cargarFuente(fuente).then(function (datos) {
        var ej = (datos.hechizos || datos.ejercicios || datos || []).filter(function (x) { return x && x.id === id; })[0];
        if (!ej) throw new Error('no encontré el ejercicio "' + id + '"');
        return cargarMotor((ej.lenguaje || '').toLowerCase()).then(function () { self._pintar(ej); });
      }).catch(function (e) { self._fallo(e.message); });
    }
    _fallo(msg) {
      this.shadowRoot.innerHTML = '<div style="font-family:IBM Plex Mono,monospace;font-size:12px;color:#8C2F17;border:1px dashed #8C2F17;border-radius:4px;padding:10px 12px;background:#FBF3EF;">lab-juicio: ' + esc(msg) + '</div>';
    }
    _pintar(ej) {
      this.ej = ej;
      var self = this, lang = (ej.lenguaje || 'racket').toLowerCase(), P = PALETAS[lang] || PALETAS.racket;
      var C = ej.candidatos || [], R = this.shadowRoot;
      this.probadas = {}; this.intentos = 0;
      R.innerHTML = '<style>' + CSS(P) + '</style><div class="caja">'
        + '<div class="cab"><div class="kicker"><b>' + esc((ej.roman ? ej.roman + ' · ' : '') + (ej.name || 'Juicio')) + '</b><span>' + esc(ej.tag || 'elegir entre implementaciones') + '</span><span class="hecho" data-hecho hidden></span></div>'
        + '<h3>' + esc(ej.title || '') + '</h3><p class="enun">' + esc(ej.enunciado || '') + '</p></div>'
        + '<div class="jz"><div class="jtabs">' + C.map(function (c, i) { return '<button type="button" data-t="' + i + '">' + esc(c.etiqueta + ' · ' + c.titulo) + '</button>'; }).join('') + '</div>'
        + '<div class="jcod" data-jcod></div>'
        + '<div class="acc" style="padding:10px 14px 0;"><button class="b" data-ejec>Ejecutar pruebas</button><span class="chico" data-jinfo></span></div>'
        + '<ul class="casos" data-jres style="margin:8px 14px 12px;"></ul></div>'
        + '<div class="jz"><div class="jq"><b>' + esc(ej.pregunta || '¿Cuál usarías?') + '</b>'
        + '<div class="ops">' + C.map(function (c, i) { return '<label data-op="' + i + '"><input type="radio" name="jop" value="' + i + '"> <span><b>' + esc(c.etiqueta) + '</b> · ' + esc(c.titulo) + '</span></label>'; }).join('') + '</div>'
        + '<span>Justifica tu elección con lo que viste al ejecutar: qué falla en las otras y por qué.</span>'
        + '<textarea data-just placeholder="Con b negativo, la opción … resta dos números casi iguales y …"></textarea>'
        + '<div class="fila"><button class="b" data-entregar>Entregar elección</button><span class="chico" data-cont></span></div></div></div>'
        + '<div class="veredicto" data-ver></div><div data-retro></div>'
        + '<div class="nota">' + esc(MOTORES[lang] && MOTORES[lang]() ? 'Las pruebas se ejecutan en tu navegador. Se verifica la elección; tu profesor lee la justificación.' : 'Este lenguaje no tiene intérprete local: se muestran las salidas registradas. Se verifica la elección; tu profesor lee la justificación.') + '</div></div>';
      var min = ej.minJustificacion || 80, just = R.querySelector('[data-just]');
      var cont = function () { var n = just.value.trim().length; R.querySelector('[data-cont]').textContent = n + ' / ' + min + ' caracteres'; };
      just.addEventListener('input', cont); cont();
      R.addEventListener('click', function (e) {
        var t = e.target.closest('[data-t]'); if (t) self._ver(+t.getAttribute('data-t'));
      });
      R.querySelector('[data-ejec]').addEventListener('click', function () { self._ejecutar(self.actual); });
      R.querySelector('[data-entregar]').addEventListener('click', function () { self._entregar(); });
      this._ver(0);
      this._restaurar();
    }
    _ver(i) {
      this.actual = i;
      var R = this.shadowRoot, c = this.ej.candidatos[i];
      R.querySelectorAll('[data-t]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-t') === i); });
      R.querySelector('[data-jcod]').textContent = c.codigo;
      R.querySelector('[data-jres]').innerHTML = this['_res' + i] || '';
      R.querySelector('[data-jinfo]').textContent = this.probadas[i] ? '' : 'aún no la ejecutas';
    }
    _ejecutar(i) {
      var ej = this.ej, c = ej.candidatos[i], lang = (ej.lenguaje || '').toLowerCase();
      var motor = MOTORES[lang] && MOTORES[lang](), codigo = (ej.dado ? ej.dado + '\n' : '') + c.codigo;
      var html = (ej.pruebas || []).map(function (p, k) {
        var txt, ok = true;
        if (motor) { var r = motor.evaluarEn(codigo, p.expr); ok = r.ok; txt = r.ok ? r.texto : r.error; }
        else txt = (c.salidas || [])[k] != null ? c.salidas[k] : '—';
        return '<li class="' + (ok ? '' : 'mal') + '"><span class="est">▷</span><span>' + esc(p.expr) + ' → ' + esc(txt)
          + (p.nota ? '   <i>(' + esc(p.nota) + ')</i>' : '') + '</span></li>';
      }).join('');
      this['_res' + i] = html;
      this.probadas[i] = true;
      this._ver(i);
    }
    _entregar() {
      var ej = this.ej, R = this.shadowRoot, sel = R.querySelector('input[name=jop]:checked');
      var ver = R.querySelector('[data-ver]'), just = R.querySelector('[data-just]').value.trim(), min = ej.minJustificacion || 80;
      var dice = function (bien, t) { ver.className = 'veredicto on ' + (bien ? 'bien' : 'mal'); ver.innerHTML = '<span class="t">' + (bien ? 'Entregado' : 'Todavía no') + '</span>' + esc(t); };
      if (!sel) { dice(false, 'Elige una de las implementaciones.'); return; }
      var i = +sel.value, nProb = Object.keys(this.probadas).length;
      this.intentos++;
      R.querySelectorAll('[data-op]').forEach(function (l) { l.classList.remove('mal', 'bien'); });
      if (i !== ej.correcta) {
        R.querySelector('[data-op="' + i + '"]').classList.add('mal');
        dice(false, ((ej.retro || [])[i] || 'Esa no es la que conviene.') + (nProb < (ej.candidatos || []).length ? ' Ejecuta las tres antes de decidir.' : ''));
        guardarBorrador(ej.id, { tema: temaDe(ej), lenguaje: ej.lenguaje, intentos: this.intentos });
        return;
      }
      if (just.length < min) { dice(false, 'La elección es correcta. Falta la justificación: explica en al menos ' + min + ' caracteres qué viste en las pruebas.'); return; }
      var r = guardarResuelto(ej.id, { tema: temaDe(ej), lenguaje: ej.lenguaje, clave: ej.clave || null, intentos: this.intentos, tipo: 'juicio', eleccion: i, justificacion: just, probadas: nProb });
      this._cerrar(r, i);
      try { document.dispatchEvent(new CustomEvent('fisica:laboratorio', { detail: { id: ej.id, tema: temaDe(ej), clave: ej.clave || null } })); } catch (e) {}
    }
    _cerrar(r, i) {
      var ej = this.ej, R = this.shadowRoot;
      R.querySelector('[data-op="' + i + '"]').classList.add('bien');
      R.querySelectorAll('input[name=jop], [data-just], [data-entregar]').forEach(function (x) { x.disabled = true; });
      var h = R.querySelector('[data-hecho]'); h.hidden = false; h.textContent = '✓ entregado' + (r && r.fecha ? ' · ' + r.fecha : '');
      var ver = R.querySelector('[data-ver]');
      ver.className = 'veredicto on bien';
      ver.innerHTML = '<span class="t">Entregado</span>' + esc(ej.porque || 'Elección correcta. Tu profesor revisará la justificación.');
      R.querySelector('[data-retro]').innerHTML = '<ul class="retro" style="margin:0 14px 12px;">' + (ej.candidatos || []).map(function (c, k) {
        return '<li><b>' + esc(c.etiqueta) + '</b> · ' + esc((ej.retro || [])[k] || '') + '</li>';
      }).join('') + '</ul>';
    }
    _restaurar() {
      var e = estadoLab(this.ej.id), r = e.resuelto, R = this.shadowRoot;
      if (e.borrador) this.intentos = e.borrador.intentos | 0;
      if (!r) return;
      this.intentos = r.intentos | 0;
      var op = R.querySelector('input[name=jop][value="' + (r.eleccion | 0) + '"]'); if (op) op.checked = true;
      R.querySelector('[data-just]').value = r.justificacion || '';
      this._cerrar(r, r.eleccion | 0);
    }
  }
  if (!window.customElements.get('lab-juicio')) window.customElements.define('lab-juicio', LabJuicio);

  /* ── <lab-tema tema="u2t3"> ────────────────────────────────────
     Monta los ejercicios de un tema para la ruta del alumno y carga
     solo el motor que esa ruta necesita. Atributos:
       tema    id del tema en mapa.js: monta sus ejercicios (menos los que tienen "clave")
       clave   en lugar de tema: monta solo el laboratorio opcional con esa clave
       ruta    (opcional)     fuerza un lenguaje; si falta, se lee de FisicaSave
       fuente  (opcional)     JSON de ejercicios; por omisión, junto a este script  */
  var MOTOR_ARCHIVOS = {
    racket:  [['MiniRacket', 'mini-racket.js']],
    haskell: [['MiniHaskell', 'mini-haskell.js']],
    idris:   [['MiniHaskell', 'mini-haskell.js'], ['MiniIdris', 'mini-idris.js']],
    mercury: [['MiniMercury', 'mini-mercury.js']]
  };
  var cargas = {};
  function cargarScript(global, archivo) {
    if (window[global]) return Promise.resolve();
    if (!cargas[archivo]) {
      cargas[archivo] = new Promise(function (ok, mal) {
        var s = document.createElement('script');
        s.src = BASE + archivo + VERSION;
        s.onload = ok;
        s.onerror = function () { mal(new Error('no se pudo cargar ' + s.src)); };
        document.head.appendChild(s);
      });
    }
    return cargas[archivo];
  }
  function cargarMotor(lang) {
    return (MOTOR_ARCHIVOS[lang] || []).reduce(function (p, par) {
      return p.then(function () { return cargarScript(par[0], par[1]); });
    }, Promise.resolve());
  }
  function rutaDelAlumno() {
    try {
      var c = window.FisicaSave && window.FisicaSave.getClase && window.FisicaSave.getClase();
      return (c || localStorage.getItem('selectedLang') || 'racket').toLowerCase();
    } catch (e) { return 'racket'; }
  }

  class LabTema extends HTMLElement {
    static get observedAttributes() { return ['tema', 'ruta', 'clave']; }
    connectedCallback() { this._render(); }
    attributeChangedCallback() { if (this.isConnected) this._render(); }

    _render() {
      var tema = this.getAttribute('tema'), clave = this.getAttribute('clave');
      if (!tema && !clave) return;
      var ruta = (this.getAttribute('ruta') || rutaDelAlumno()).toLowerCase();
      var fuente = this.getAttribute('fuente') || (BASE + 'problemas.json');
      var turno = (this._turno = (this._turno || 0) + 1);
      var self = this;

      cargarFuente(fuente).then(function (datos) {
        var todos = (datos.hechizos || datos.ejercicios || datos || [])
          .filter(function (h) {
            if (!h || (h.tipo !== 'codigo' && h.tipo !== 'juicio')) return false;
            return clave ? h.clave === clave : (h.tema === tema && !h.clave);
          });
        var propios = todos.filter(function (h) { return h.lenguaje === ruta; });
        var aviso = null;
        if (!propios.length && todos.length) {
          var hay = function (l) { return todos.some(function (h) { return h.lenguaje === l; }); };
          var alterna = hay('racket') ? 'racket' : hay('haskell') ? 'haskell' : todos[0].lenguaje;
          propios = todos.filter(function (h) { return h.lenguaje === alterna; });
          aviso = 'La ruta ' + ruta + ' todavía no tiene laboratorio para este tema; mientras tanto, el de ' + alterna + '.';
        }
        // el juicio solo existe en algunas vías: si la ruta no lo tiene, se ofrece el de otra
        var jz = function (h) { return h.tipo === 'juicio'; };
        if (!propios.some(jz) && todos.some(jz)) {
          var j = todos.filter(function (h) { return jz(h) && h.lenguaje === 'haskell'; })[0]
               || todos.filter(function (h) { return jz(h) && h.lenguaje === 'racket'; })[0]
               || todos.filter(jz)[0];
          propios = propios.concat([j]);
        }
        var langs = propios.map(function (h) { return h.lenguaje; }).filter(function (l, i, a) { return a.indexOf(l) === i; });
        if (!langs.length) langs = [ruta];
        return langs.reduce(function (pr, l) { return pr.then(function () { return cargarMotor(l); }); }, Promise.resolve())
          .then(function () { return { propios: propios, aviso: aviso }; });
      }).then(function (r) {
        if (turno !== self._turno) return;          // llegó una petición más nueva
        self.innerHTML = '';
        if (!r.propios.length) {
          self.innerHTML = '<p style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:#6A5F49;font-style:italic;">Este tema todavía no tiene ejercicios de laboratorio.</p>';
          return;
        }
        if (r.aviso) {
          var p = document.createElement('p');
          p.style.cssText = "font-family:'IBM Plex Mono',monospace;font-size:12px;color:#6A5F49;font-style:italic;margin:1rem 0 0;";
          p.textContent = r.aviso;
          self.appendChild(p);
        }
        // primero los de código; después, los de juicio
        r.propios.sort(function (a, b) { return (a.tipo === 'juicio') - (b.tipo === 'juicio'); });
        r.propios.forEach(function (ej) {
          var el = document.createElement(ej.tipo === 'juicio' ? 'lab-juicio' : 'lab-codigo');
          var s = document.createElement('script');
          s.type = 'application/json';
          s.textContent = JSON.stringify(ej);
          el.appendChild(s);
          self.appendChild(el);
        });
      }).catch(function (e) {
        if (turno !== self._turno) return;
        self.innerHTML = '<div style="font-family:IBM Plex Mono,monospace;font-size:12px;color:#8C2F17;border:1px dashed #8C2F17;border-radius:4px;padding:10px 12px;background:#FBF3EF;">lab-tema: ' + esc(e.message) + '</div>';
      });
    }
  }
  if (!window.customElements.get('lab-tema')) window.customElements.define('lab-tema', LabTema);
})();
