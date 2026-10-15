/*
 * fisica-save.js
 * Física Computacional — capa de guardado del estudiante (localStorage).
 *
 * Un único "archivo de guardado" en localStorage["fisicaSave"]:
 *   {
 *     clase:           "mercury",            // ruta elegida
 *     descubrimientos: ["noasoc","epsilon"], // ids de sellos rotos
 *     sellados:        { noasoc:"2026-06-22" } // fecha por descubrimiento
 *   }
 *
 * API global  window.FisicaSave:
 *   .get()                  -> objeto de guardado (con clase heredada de selectedLang)
 *   .getClase()             -> "mercury" | null
 *   .setClase(c)            -> fija la ruta
 *   .descubierto(id)        -> bool
 *   .descubrir(id, opts?)   -> rompe el sello; dispara evento + aviso. opts.silencioso = sin aviso
 *   .exportar()             -> descarga el guardado como .json (incluye los tutoriales de la Unidad 0)
 *   .importar(archivo|obj)  -> Promise: fusiona un guardado exportado con el actual (no borra nada)
 *   .resolverEvento(id, {tema, via}) -> guarda el evento resuelto y devuelve { fecha, token, tema, via }
 *                              via: 'auto' (parte verificable) | 'declarado' (entrega del alumno) | 'profesor' (código)
 *   .codigoEvento(cuenta, id) / .canjearCodigo(id, codigo, {tema}) -> códigos que da el profesor
 *   .resolverLab(id, {tema, lenguaje, clave, intentos, pistas, solucionVista, codigo})
 *                              -> registra un ejercicio RESUELTO del laboratorio de código
 *   .borradorLab(id) / .guardarBorradorLab(id, {codigo, intentos, pistas, solucionVista})
 *                              -> trabajo a medias de un laboratorio (no cuenta para la narrativa)
 *   .forjarConexion(from, to, obs, {compartir, firma, adoptadaDe}) -> vínculo del Atlas (y voz del foro)
 *   .responderVoz(idVoz, texto, firma) / .respuestas() -> respuestas del foro por rondas
 *   .investigarAnomalia(id) / .anomalia() -> eventos especiales (Futhark)
 *   .registrarHistoria(ruta, u, datos) / .historia() -> versión de cada interludio que vio el alumno
 *   .registrarPraxis(tema, {justificacion_diseno, bitacora_error_correccion, lenguaje}) / .praxis(tema)
 *                              -> evidencia escrita de la nota práctica (tope de 4000 caracteres por texto)
 *   .completarFase(tema, fase, via?) -> marca la fase. En 'practica' guarda CÓMO se completó:
 *                              fases[tema].practica = 'lab' | 'juicio' | 'declarado'
 *                              ('declarado' = «no pude»: completa la fase, pero la estrella queda hueca;
 *                              puede subir después a 'lab' o 'juicio', nunca al revés)
 *   .viaPractica(tema)      -> 'lab' | 'juicio' | 'declarado' | null
 *   .sellarPractica(tema, registro) / .selloPractica(tema)
 *                              -> lo que usa practica.js: guarda la evidencia (praxis) y la vía (fases)
 *   .labResuelto(id|clave) / .laboratorios() / .labsPorTema()
 *   .getModo() / .setModo('narrativa'|'sin') -> curso con o sin narrativa
 *   .decidir(clave, valor, rasgo) / .decision(clave) -> elecciones narrativas de las notas
 *   .interludioVisto(u) / .marcarInterludio(u) -> interludios de fin de unidad ya mostrados
 *
 * Evento:  document → 'fisica:descubrimiento'  con detail = { id }
 *          document → 'fisica:lab'             con detail = { id, tema, clave }
 *          document → 'fisica:evento'          con detail = { id, token, via }
 *          document → 'fisica:praxis'          con detail = { tema }
 *          document → 'fisica:fase'            con detail = { tema, fase, via }
 *          document → 'fisica:sin-espacio'     el navegador no aceptó guardar (se muestra un aviso)
 *          document → 'fisica:importado'       con detail = resumen de lo restaurado
 */
(function () {
  var KEY = 'fisicaSave';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); return true; }
    catch (e) { sinEspacio(); return false; }
  }
  /* El navegador rechazó la escritura (almacenamiento lleno o bloqueado, p. ej. en una
     ventana privada). Se avisa una vez por página: lo ya guardado sigue ahí y se puede exportar. */
  var avisado = false;
  function sinEspacio() {
    try { document.dispatchEvent(new CustomEvent('fisica:sin-espacio', { detail: {} })); } catch (e) {}
    if (avisado || !document.body) return;
    avisado = true;
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = [
      'position:fixed', 'left:22px', 'bottom:22px', 'z-index:99999', 'max-width:340px',
      'background:#FBF3EF', 'border:1px solid #8C2F17', 'border-left:4px solid #8C2F17', 'border-radius:8px',
      'box-shadow:0 14px 34px -16px rgba(60,48,20,.55)', 'padding:14px 16px',
      "font-family:'Newsreader',Georgia,serif", 'font-size:15px', 'line-height:1.45', 'color:#2A2722'
    ].join(';');
    var t = document.createElement('strong');
    t.style.cssText = "display:block;font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#8C2F17;margin-bottom:4px;";
    t.textContent = 'No se pudo guardar';
    var p = document.createElement('span');
    p.textContent = 'El navegador no acept\u00f3 guardar tu \u00faltimo avance: su almacenamiento est\u00e1 lleno o bloqueado. Lo anterior sigue guardado. ';
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Exportar mi guardado';
    b.style.cssText = "display:block;margin-top:9px;font-family:'IBM Plex Mono',monospace;font-size:11px;cursor:pointer;background:#8C2F17;color:#FFF;border:0;border-radius:4px;padding:7px 12px;";
    b.addEventListener('click', function () { try { window.FisicaSave.exportar(); } catch (e) {} });
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar aviso');
    x.style.cssText = "margin-top:6px;font-family:'IBM Plex Mono',monospace;font-size:11px;cursor:pointer;background:transparent;color:#8C2F17;border:0;padding:4px 0;text-decoration:underline;";
    x.addEventListener('click', function () { if (box.parentNode) box.parentNode.removeChild(box); });
    box.appendChild(t); box.appendChild(p); box.appendChild(b); box.appendChild(x);
    document.body.appendChild(box);
  }

  function paleta(clase) {
    var R = window.DESCUBRIMIENTOS && window.DESCUBRIMIENTOS.rutas && window.DESCUBRIMIENTOS.rutas[clase];
    return R || { name: '', glyph: '\u263F', color: '#A8780C', tint: '#F6ECD4', deep: '#6F4E08' };
  }

  // orden de los modos de resolución: uno posterior solo puede subir de categoría
  var RANGO = { declarado: 1, auto: 2, profesor: 3 };
  // sal de los códigos del profesor: cámbiala aquí Y en el Panel del Docente si quieres códigos propios
  var SAL_CODIGOS = 'fiscomp-rigor-2026';
  // tutoriales de la Unidad 0: cada uno guarda con su clave (tutorialLeanSave, …)
  var RE_TUTORIAL = /^tutorial[A-Za-z]+Save$/;

  /* Fusión de guardados: nunca borra lo local.
     · listas de valores → unión        · listas de objetos → unión por id / vid / (from,to)
     · números → el mayor               · objetos → recursivo
     · texto y demás → se conserva el local; si falta, se toma el importado */
  function claveItem(x) {
    if (x && typeof x === 'object') {
      if (x.id != null) return 'id:' + x.id;
      if (x.vid != null) return 'vid:' + x.vid;
      if (x.from != null && x.to != null) return 'ft:' + [x.from, x.to].sort().join('|');
      return 'js:' + JSON.stringify(x);
    }
    return 'v:' + JSON.stringify(x);
  }
  function fusionar(local, otro) {
    if (otro === undefined || otro === null) return local;
    if (local === undefined || local === null || local === '') return otro;
    if (Array.isArray(local) && Array.isArray(otro)) {
      var visto = {}, out = local.slice();
      local.forEach(function (x) { visto[claveItem(x)] = true; });
      otro.forEach(function (x) { var k = claveItem(x); if (!visto[k]) { visto[k] = true; out.push(x); } });
      return out;
    }
    if (typeof local === 'number' && typeof otro === 'number') return Math.max(local, otro);
    if (typeof local === 'object' && typeof otro === 'object' && !Array.isArray(local) && !Array.isArray(otro)) {
      var o = {};
      Object.keys(local).forEach(function (k) { o[k] = local[k]; });
      Object.keys(otro).forEach(function (k) { o[k] = (k in local) ? fusionar(local[k], otro[k]) : otro[k]; });
      return o;
    }
    return local;
  }
  function leerTutoriales() {
    var t = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (RE_TUTORIAL.test(k)) { try { t[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {} }
      }
    } catch (e) {}
    return t;
  }

  /* Cómo se completó la fase práctica. 'declarado' («no pude») vale menos que haberla
     demostrado: solo se puede subir. Los guardados antiguos traen `true` (demostrada). */
  var VIAS_PRACTICA = { lab: 1, juicio: 1, declarado: 1 };
  function rangoPractica(v) { return !v ? 0 : (v === 'declarado' ? 1 : 2); }
  // vía que elige el alumno en <practica-cierre> → valor de fases[tema].practica
  var VIA_DE_CIERRE = { codigo: 'lab', todo: 'lab', evidencia: 'lab', juicio: 'juicio', nopude: 'declarado' };

  // textos de la evidencia de práctica: tope por texto
  var MAX_PRAXIS = 4000;
  // código guardado por laboratorio: tope para no inflar el guardado
  var MAX_CODIGO = 8000;
  // "u1t1-kahan", "hs-u2t3-1" → "u2t3" (los ids sin tema, como "hs-lab-1", dan null)
  function temaDeId(id) { var m = String(id == null ? '' : id).match(/u\d+t\d+/); return m ? m[0] : null; }

  function nuevoId() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

  var API = {
    KEY: KEY,

    get: function () {
      var s = read();
      if (!s.descubrimientos) s.descubrimientos = [];
      if (!s.sellados) s.sellados = {};
      if (!s.notasCompletadas) s.notasCompletadas = [];
      if (!s.fases) s.fases = {};
      if (!s.conexiones) s.conexiones = [];
      if (!s.clase) {
        var legado = null;
        try { legado = localStorage.getItem('selectedLang'); } catch (e) {}
        if (legado) s.clase = legado;
      }
      return s;
    },

    getClase: function () { return API.get().clase || null; },

    /* ── Modo de curso: 'narrativa' (portadas, interludios, elecciones) o 'sin' ── */
    getModo: function () { var m = API.get().modo; return m === 'narrativa' ? 'narrativa' : 'sin'; },
    setModo: function (m) { var s = read(); s.modo = m === 'narrativa' ? 'narrativa' : 'sin'; write(s); return s.modo; },

    /* ── Elecciones narrativas escondidas en las notas ── */
    decision: function (clave) { return (API.get().decisiones || {})[clave] || null; },
    decidir: function (clave, valor, rasgo) {
      var s = read();
      if (!s.decisiones) s.decisiones = {};
      s.decisiones[clave] = { valor: valor, rasgo: rasgo || null, fecha: new Date().toISOString().slice(0, 10) };
      write(s);
      try { document.dispatchEvent(new CustomEvent('fisica:decision', { detail: { clave: clave, valor: valor } })); } catch (e) {}
      return s.decisiones[clave];
    },
    interludioVisto: function (u) { return !!(API.get().interludios || {})[u]; },
    marcarInterludio: function (u) {
      var s = read();
      if (!s.interludios) s.interludios = {};
      s.interludios[u] = new Date().toISOString().slice(0, 10);
      write(s);
    },

    setClase: function (c) {
      var s = read();
      s.clase = c;
      write(s);
      return c;
    },

    descubierto: function (id) {
      return API.get().descubrimientos.indexOf(id) !== -1;
    },

    /* ── Temas completados (alimentan el Mapa del Conocimiento) ── */
    completadas: function () { return API.get().notasCompletadas; },

    notaCompletada: function (id) {
      return API.get().notasCompletadas.indexOf(id) !== -1;
    },

    completarNota: function (id, opts) {
      opts = opts || {};
      var s = read();
      if (!s.notasCompletadas) s.notasCompletadas = [];
      if (s.notasCompletadas.indexOf(id) !== -1) return false;
      s.notasCompletadas.push(id);
      write(s);
      try {
        document.dispatchEvent(new CustomEvent('fisica:nota', { detail: { id: id } }));
      } catch (e) {}
      return true;
    },

    /* ── Fases de una misión (Pergamino / Hechizo / Prueba / Sello) ── */
    fasesDe: function (tema) { return API.get().fases[tema] || {}; },

    faseCompletada: function (tema, fase) {
      var f = API.get().fases[tema];
      return !!(f && f[fase]);
    },

    /* via (solo fase 'practica'): 'lab' | 'juicio' | 'declarado'. Sin via, o en otra fase, se guarda true. */
    completarFase: function (tema, fase, via) {
      var s = read();
      if (!s.fases) s.fases = {};
      if (!s.fases[tema]) s.fases[tema] = {};
      var valor = (fase === 'practica' && VIAS_PRACTICA[via]) ? via : true;
      var previo = s.fases[tema][fase];
      // ya completada: solo cambia si estaba declarada «no pude» y ahora se demuestra
      if (previo && !(fase === 'practica' && rangoPractica(valor) > rangoPractica(previo))) return false;
      s.fases[tema][fase] = valor;
      write(s);
      try {
        document.dispatchEvent(new CustomEvent('fisica:fase', { detail: { tema: tema, fase: fase, via: valor === true ? null : valor } }));
      } catch (e) {}
      // ¿Misión completa? → conquista el territorio y rompe el sello del tema
      var FASES = ['conceptual', 'implementacional', 'practica', 'dialectica', 'dialogica'];
      var todas = FASES.every(function (f) { return s.fases[tema][f]; });
      if (todas) {
        API.completarNota(tema);
        if (window.DESCUBRIMIENTOS) {
          window.DESCUBRIMIENTOS.tomos.forEach(function (t) {
            t.entries.forEach(function (e) {
              var key = (e.origin.split('\u00b7')[0] || '').replace(/\//g, '').replace(/\s/g, '');
              if (key === tema) API.descubrir(e.id);
            });
          });
        }
      }
      return true;
    },

    /* Cómo se completó la práctica: 'lab' | 'juicio' | 'declarado' | null (sin completar).
       Los guardados anteriores a las vías (valor true) cuentan como 'lab'. */
    viaPractica: function (tema) {
      var v = (API.get().fases[tema] || {}).practica;
      return !v ? null : (VIAS_PRACTICA[v] ? v : 'lab');
    },
    practicaDeclarada: function (tema) { return API.viaPractica(tema) === 'declarado'; },

    /* Sello de la nota práctica (lo llama <practica-cierre>). `datos` es el registro completo:
       { via: 'codigo'|'juicio'|'nopude'|'todo'|'evidencia', resultado, laboratorios, atasco, … }.
       Guarda la evidencia en praxis[tema] y la vía en fases[tema].practica. */
    sellarPractica: function (tema, datos) {
      datos = datos || {};
      var r = API.registrarPraxis(tema, datos);
      API.completarFase(tema, 'practica', VIA_DE_CIERRE[datos.via] || 'lab');
      return r;
    },
    /* El sello tal como lo lee <practica-cierre>: null si la fase no está completa. */
    selloPractica: function (tema) {
      var v = API.viaPractica(tema);
      if (!v) return null;
      var p = API.praxis(tema) || {}, o = {};
      Object.keys(p).forEach(function (k) { o[k] = p[k]; });
      o.resultado = v === 'declarado' ? 'declarada' : 'demostrada';
      if (v === 'declarado') o.via = 'nopude';
      else if (!o.via || o.via === 'nopude') o.via = v === 'juicio' ? 'juicio' : 'previa';
      return o;
    },

    descubrir: function (id, opts) {
      opts = opts || {};
      var s = read();
      if (!s.descubrimientos) s.descubrimientos = [];
      if (!s.sellados) s.sellados = {};
      if (s.descubrimientos.indexOf(id) !== -1) return false; // ya estaba
      s.descubrimientos.push(id);
      s.sellados[id] = new Date().toISOString().slice(0, 10);
      write(s);
      try {
        document.dispatchEvent(new CustomEvent('fisica:descubrimiento', { detail: { id: id } }));
      } catch (e) {}
      if (!opts.silencioso) API._aviso(id);
      return true;
    },

    /* ── La Hoguera (punto de descanso / guardado de bienestar) ── */
    descansar: function () {
      var s = read();
      s.descansos = (s.descansos || 0) + 1;
      s.ultimaHoguera = Date.now();
      write(s);
      try { document.dispatchEvent(new CustomEvent('fisica:descanso', { detail: {} })); } catch (e) {}
      return s.descansos;
    },
    descansos: function () { return API.get().descansos || 0; },
    ultimaHoguera: function () { return API.get().ultimaHoguera || null; },

    /* ── El Comerciante (moneda + inventario) ──────────────────
       Moneda: "esquirlas de luz", ganadas por progreso.
         · cada sello roto      → 10
         · cada tema conquistado → 15
         · cada descanso         →  5
       Saldo = ganadas − gastadas.                                */
    esquirlasGanadas: function () {
      var s = API.get();
      return (s.descubrimientos.length * 10) + (s.notasCompletadas.length * 15) + ((s.descansos || 0) * 5) + (s.bono || 0);
    },

    /* Crédito directo de esquirlas (demo / recompensas especiales) */
    creditarBono: function (n) {
      var s = read();
      s.bono = (s.bono || 0) + n;
      write(s);
      return API.esquirlas();
    },
    esquirlasGastadas: function () {
      var s = API.get(), tot = 0;
      var inv = s.inventario || {};
      Object.keys(inv).forEach(function (k) { tot += (inv[k].costo || 0); });
      return tot;
    },
    esquirlas: function () { return API.esquirlasGanadas() - API.esquirlasGastadas(); },

    inventario: function () { return API.get().inventario || {}; },
    tieneItem: function (id) { return !!(API.get().inventario || {})[id]; },

    comprar: function (id, costo) {
      var s = read();
      if (!s.inventario) s.inventario = {};
      if (s.inventario[id]) return { ok: false, motivo: 'repetido' };
      if (API.esquirlas() < costo) return { ok: false, motivo: 'fondos' };
      s.inventario[id] = { costo: costo, fecha: new Date().toISOString().slice(0, 10) };
      write(s);
      try { document.dispatchEvent(new CustomEvent('fisica:compra', { detail: { id: id } })); } catch (e) {}
      return { ok: true };
    },

    /* ── Eventos (acertijos/problemas de la ventana emergente) ──
       Al resolver uno se guarda { fecha, token, tema } y se genera un
       código que el alumno entrega al profesor para reclamar su insignia,
       igual que el resto del grimorio (insignias.json). ──────────────── */
    eventos: function () { return API.get().eventos || {}; },
    eventoResuelto: function (id) { return !!(API.get().eventos || {})[id]; },
    resolverEvento: function (id, meta) {
      meta = meta || {};
      var s = read();
      if (!s.eventos) s.eventos = {};
      var via = meta.via || 'auto';
      var previo = s.eventos[id];
      if (previo) {
        // ya resuelto: mismo token; solo sube de categoría (declarado → auto → profesor)
        if (RANGO[via] > RANGO[previo.via || 'auto']) {
          previo.via = via; previo['fecha_' + via] = new Date().toISOString().slice(0, 10);
          write(s);
          try { document.dispatchEvent(new CustomEvent('fisica:evento', { detail: { id: id, token: previo.token, via: via } })); } catch (e) {}
        }
        return previo;
      }
      var token = API._genToken();
      s.eventos[id] = { fecha: new Date().toISOString().slice(0, 10), token: token, tema: meta.tema || null, via: via };
      write(s);
      try { document.dispatchEvent(new CustomEvent('fisica:evento', { detail: { id: id, token: token, via: via } })); } catch (e) {}
      return s.eventos[id];
    },

    /* ── Códigos del profesor ──
       El profesor revisa la demostración y entrega un código derivado de la cuenta y la actividad
       (lo genera el Panel del Docente). Al canjearlo, el evento queda resuelto con via 'profesor'.
       La validación ocurre en el navegador: basta para la historia, no para una calificación. */
    codigoEvento: function (cuenta, id) {
      var t = String(cuenta) + '|' + String(id) + '|' + SAL_CODIGOS;
      var h = 5381, g = 52711;
      for (var i = 0; i < t.length; i++) { var c = t.charCodeAt(i); h = ((h << 5) + h + c) >>> 0; g = ((g << 5) + g + c * 31) >>> 0; }
      var b = (h.toString(36) + g.toString(36)).toUpperCase().replace(/[^0-9A-Z]/g, '');
      b = (b + '00000000').slice(0, 8).replace(/O/g, '0').replace(/I/g, '1');
      return b.slice(0, 4) + '-' + b.slice(4, 8);
    },
    canjearCodigo: function (id, codigo, meta) {
      var s = read(), cuenta = s.cuenta || '';
      if (!/^\d{9}$/.test(cuenta)) return { ok: false, motivo: 'sin-cuenta' };
      var limpio = String(codigo || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/I/g, '1');
      var esperado = API.codigoEvento(cuenta, id).replace('-', '');
      if (limpio !== esperado) return { ok: false, motivo: 'invalido' };
      var r = API.resolverEvento(id, { tema: (meta && meta.tema) || null, via: 'profesor' });
      return { ok: true, evento: r };
    },
    _genToken: function () {
      var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      function grp() { var s = ''; for (var i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s; }
      return grp() + '-' + grp();
    },

    /* ── Laboratorio de código (cuenta aparte del temario) ──────
       Cada ejercicio resuelto en <lab-codigo> queda en laboratorios[id]:
         { fecha, lenguaje, tema, clave?, intentos, pistas, solucionVista, codigo }
       No marca el tema como conquistado: es una bitácora propia.
       Contrato con narrativa.js (no lo rompas):
         · laboratorios solo contiene ejercicios RESUELTOS: narrativa cuenta sus llaves
           («labs», «labsUnidad», «progreso» alto/bajo). Lo que está a medias vive aparte,
           en labBorradores, y no cuenta para la historia.
         · «tema» siempre se guarda (si el ejercicio no lo trae se deduce del id, p. ej.
           "u1t1-kahan" → "u1t1"): de ahí salen el progreso de la unidad y «labsUnidad».
         · «clave» es el nombre del laboratorio que no depende de la ruta. Las condiciones
           «si: { lab: "u1t1-kahan" }» de interludios.json se cumplen con un ejercicio cuyo
           id o cuya clave sea "u1t1-kahan" (así "hs-u1t1-kahan" y "rkt-u1t1-kahan" valen igual).
         · al resolver se dispara 'fisica:lab', que <eleccion-narrativa> escucha.          */
    laboratorios: function () { return API.get().laboratorios || {}; },
    labResuelto: function (id) {
      var L = API.get().laboratorios || {};
      if (L[id]) return true;
      return Object.keys(L).some(function (k) { return L[k] && L[k].clave === id; });
    },
    /* temas con al menos un laboratorio resuelto: { u1t1: 3, u2t3: 1 } */
    labsPorTema: function () {
      var L = API.get().laboratorios || {}, t = {};
      Object.keys(L).forEach(function (id) {
        var tema = (L[id] && L[id].tema) || temaDeId(id);
        if (tema) t[tema] = (t[tema] || 0) + 1;
      });
      return t;
    },
    resolverLab: function (id, meta) {
      meta = meta || {};
      var s = read();
      if (!s.laboratorios) s.laboratorios = {};
      var tema = meta.tema || temaDeId(id) || temaDeId(meta.clave) || null;
      var previo = s.laboratorios[id];
      if (previo) {
        // ya resuelto: se conserva la primera fecha; solo se completa lo que faltaba
        // (guardados anteriores a esta versión no traían tema deducido ni clave)
        var cambio = false;
        if (!previo.tema && tema) { previo.tema = tema; cambio = true; }
        if (!previo.clave && meta.clave) { previo.clave = meta.clave; cambio = true; }
        if (!previo.lenguaje && meta.lenguaje) { previo.lenguaje = meta.lenguaje; cambio = true; }
        if (cambio) write(s);
        return previo;
      }
      var r = {
        fecha: new Date().toISOString().slice(0, 10),
        lenguaje: meta.lenguaje || null,
        tema: tema
      };
      if (meta.clave) r.clave = meta.clave;
      r.intentos = Math.max(1, meta.intentos | 0);
      r.pistas = meta.pistas | 0;
      r.solucionVista = !!meta.solucionVista;
      if (meta.codigo != null) r.codigo = String(meta.codigo).slice(0, MAX_CODIGO);
      // ejercicio de juicio: qué implementación eligió y por qué (lo lee el profesor)
      if (meta.tipo) r.tipo = meta.tipo;
      if (meta.eleccion != null) r.eleccion = meta.eleccion;
      if (meta.justificacion) r.justificacion = String(meta.justificacion).slice(0, 4000);
      if (meta.probadas != null) r.probadas = meta.probadas | 0;
      s.laboratorios[id] = r;
      if (s.labBorradores && s.labBorradores[id]) delete s.labBorradores[id];
      write(s);
      try {
        document.dispatchEvent(new CustomEvent('fisica:lab', { detail: { id: id, tema: tema, clave: meta.clave || null } }));
      } catch (e) {}
      return r;
    },

    /* Trabajo a medias de un laboratorio: { codigo, intentos, pistas, solucionVista, fecha }.
       Sirve para que el alumno encuentre su código al volver a la página y para que el
       profesor vea, en la exportación, dónde se atoró. No cuenta para la narrativa. */
    borradorLab: function (id) { return (API.get().labBorradores || {})[id] || null; },
    guardarBorradorLab: function (id, datos) {
      datos = datos || {};
      var s = read();
      if (s.laboratorios && s.laboratorios[id]) return null;   // resuelto: ya no hay borrador
      if (!s.labBorradores) s.labBorradores = {};
      var b = s.labBorradores[id] || {};
      if (datos.codigo != null) b.codigo = String(datos.codigo).slice(0, MAX_CODIGO);
      if (datos.intentos != null) b.intentos = datos.intentos | 0;
      if (datos.pistas != null) b.pistas = datos.pistas | 0;
      if (datos.solucionVista) b.solucionVista = true;
      if (datos.tema || temaDeId(id)) b.tema = datos.tema || temaDeId(id);
      if (datos.lenguaje) b.lenguaje = datos.lenguaje;
      b.fecha = new Date().toISOString().slice(0, 10);
      s.labBorradores[id] = b;
      write(s);
      return b;
    },

    /* ── Evidencia de la práctica (justificación de diseño + bitácora) ──
       Una por tema: praxis[tema] = { fecha, lenguaje, clase, justificacion_diseno,
       bitacora_error_correccion, sellado_en }. Viaja en la exportación para el profesor.
       Con las vías de <practica-cierre> lleva además: via, resultado ('demostrada'|'declarada'),
       laboratorios [{id, tipo, resuelto, intentos, pistas, solucionVista}], y si declaró
       «no pude»: atasco (su explicación) y atasco_en (id del laboratorio, o null).
       declarada_antes conserva esa declaración cuando después llena la estrella.
       No cuenta para la narrativa. Cada texto se recorta a MAX_PRAXIS caracteres.
       Devuelve el registro, o null si el navegador no pudo guardarlo. */
    MAX_PRAXIS: MAX_PRAXIS,
    praxis: function (tema) { var p = API.get().praxis || {}; return tema ? (p[tema] || null) : p; },
    registrarPraxis: function (tema, datos) {
      datos = datos || {};
      var s = read();
      if (!s.praxis) s.praxis = {};
      var corta = function (t) { return String(t == null ? '' : t).trim().slice(0, MAX_PRAXIS); };
      var r = {
        fecha: new Date().toISOString().slice(0, 10),
        lenguaje: datos.lenguaje || null,
        clase: datos.clase || s.clase || null,
        justificacion_diseno: corta(datos.justificacion_diseno),
        bitacora_error_correccion: corta(datos.bitacora_error_correccion),
        sellado_en: datos.sellado_en || new Date().toISOString()
      };
      if (datos.via) r.via = String(datos.via).slice(0, 20);
      if (datos.resultado) r.resultado = datos.resultado === 'declarada' ? 'declarada' : 'demostrada';
      if (Array.isArray(datos.laboratorios)) r.laboratorios = datos.laboratorios.slice(0, 40).map(function (l) {
        l = l || {};
        return { id: String(l.id || '').slice(0, 80), tipo: l.tipo || null, resuelto: !!l.resuelto,
                 intentos: l.intentos | 0, pistas: l.pistas | 0, solucionVista: !!l.solucionVista };
      });
      if (datos.atasco != null) { r.atasco = corta(datos.atasco); r.atasco_en = datos.atasco_en ? String(datos.atasco_en).slice(0, 80) : null; }
      var antes = datos.declarada_antes;
      if (antes && typeof antes === 'object') r.declarada_antes = {
        atasco: corta(antes.atasco), atasco_en: antes.atasco_en ? String(antes.atasco_en).slice(0, 80) : null, sellado_en: antes.sellado_en || null };
      s.praxis[tema] = r;
      if (!write(s)) return null;
      try { document.dispatchEvent(new CustomEvent('fisica:praxis', { detail: { tema: tema } })); } catch (e) {}
      return r;
    },

    /* ── Conexiones forjadas (alimentan el Atlas / informacionGrafo) ──
       Cada una: { from, to, observacion, fecha, cuenta, alumno }          */
    conexiones: function () { return API.get().conexiones || []; },

    /* extra (opcional): { compartir: bool, firma: 'anonimo'|'nombre', adoptadaDe: idVoz, propia: bool }
       Si ya existía el vínculo y ahora se decide compartirlo, se actualiza en lugar de duplicarse. */
    forjarConexion: function (from, to, observacion, extra) {
      var s = read();
      if (!s.conexiones) s.conexiones = [];
      extra = extra || {};
      var previa = s.conexiones.filter(function (c) {
        return (c.from === from && c.to === to) || (c.from === to && c.to === from);
      })[0];
      if (previa && extra.compartir && !previa.compartir) {
        previa.compartir = true; previa.firma = extra.firma || 'anonimo';
        if (observacion) previa.observacion = observacion;
        if (!previa.vid) previa.vid = nuevoId();
        write(s);
        return { ok: true, actualizada: true, vid: previa.vid };
      }
      var dup = s.conexiones.some(function (c) {
        return (c.from === from && c.to === to) || (c.from === to && c.to === from);
      });
      if (dup) return { ok: false, motivo: 'repetida' };
      s.conexiones.push({
        from: from, to: to, observacion: observacion || '',
        fecha: new Date().toISOString().slice(0, 10),
        cuenta: s.cuenta || '', alumno: s.alumno || '',
        vid: nuevoId(),
        compartir: !!extra.compartir, firma: extra.firma || 'anonimo',
        adoptadaDe: extra.adoptadaDe || null, propia: !!extra.propia
      });
      write(s);
      try { document.dispatchEvent(new CustomEvent('fisica:conexion', { detail: { from: from, to: to } })); } catch (e) {}
      return { ok: true, vid: s.conexiones[s.conexiones.length - 1].vid };
    },

    /* ── Respuestas a voces del grupo (foro por rondas) ──
       Viajan en la exportación; el Panel del Docente las publica en la ronda siguiente. */
    /* ── Historia vista: qué versión de cada interludio le tocó al alumno ── */
    historia: function () { return API.get().historia || {}; },
    registrarHistoria: function (ruta, u, datos) {
      var s = read();
      if (!s.historia) s.historia = {};
      s.historia[ruta + ':' + u] = Object.assign({ fecha: new Date().toISOString().slice(0, 10) }, datos || {});
      write(s);
    },

    /* ── Anomalías (eventos especiales, p. ej. Futhark) ── */
    anomalia: function () { return API.get().anomalia || {}; },
    investigarAnomalia: function (id) {
      var s = read();
      if (!s.anomalia) s.anomalia = {};
      if (!s.anomalia[id]) s.anomalia[id] = { fecha: new Date().toISOString().slice(0, 10), temas: (s.notasCompletadas || []).length };
      write(s);
      return true;
    },

    /* ── Declaración de uso de herramientas (la pide exportar-avance.qmd antes de descargar) ──
       { fecha, uso: bool, texto, temas? } · se acumulan: cada entrega lleva la suya. */
    declaraciones: function () { return API.get().declaraciones || []; },
    declararUso: function (uso, texto, meta) {
      var s = read();
      if (!s.declaraciones) s.declaraciones = [];
      var d = { fecha: new Date().toISOString().slice(0, 10), uso: !!uso, texto: String(texto || '').trim().slice(0, 2000) };
      if (meta && meta.temas) d.temas = meta.temas;
      d.temasCompletados = (s.notasCompletadas || []).length;
      s.declaraciones.push(d);
      write(s);
      return d;
    },

    /* ── Observaciones entre vías (laboratorio: «La misma idea en otras vías») ──
       { vid, tema, de, a, texto, fecha, compartir, firma }. Una por (tema, de, a): se actualiza. */
    observacionesVias: function () { return API.get().observacionesVias || []; },
    observarVia: function (tema, de, a, texto, extra) {
      extra = extra || {};
      texto = String(texto || '').trim();
      if (!texto) return { ok: false, motivo: 'vacía' };
      var s = read();
      if (!s.observacionesVias) s.observacionesVias = [];
      var o = s.observacionesVias.filter(function (x) { return x.tema === tema && x.de === de && x.a === a; })[0];
      if (!o) { o = { vid: nuevoId(), tema: tema, de: de, a: a }; s.observacionesVias.push(o); }
      o.texto = texto.slice(0, 2000);
      o.fecha = new Date().toISOString().slice(0, 10);
      o.compartir = !!extra.compartir;
      o.firma = extra.firma || 'anonimo';
      o.cuenta = s.cuenta || ''; o.alumno = s.alumno || '';
      write(s);
      try { document.dispatchEvent(new CustomEvent('fisica:via', { detail: { tema: tema, de: de, a: a } })); } catch (e) {}
      return { ok: true, vid: o.vid };
    },

    respuestas: function () { return API.get().respuestas || []; },
    responderVoz: function (vozId, texto, firma) {
      var s = read();
      if (!s.respuestas) s.respuestas = [];
      var r = { id: nuevoId(), a: vozId, texto: String(texto || '').trim(), firma: firma || 'anonimo',
                fecha: new Date().toISOString().slice(0, 10), alumno: s.alumno || '' };
      if (!r.texto) return { ok: false, motivo: 'vacía' };
      s.respuestas.push(r);
      write(s);
      try { document.dispatchEvent(new CustomEvent('fisica:respuesta', { detail: { a: vozId } })); } catch (e) {}
      return { ok: true, id: r.id };
    },

    /* Identidad del alumno (para etiquetar conexiones y export) */
    setIdentidad: function (cuenta, alumno) {
      var s = read();
      if (cuenta != null) s.cuenta = cuenta;
      if (alumno != null) s.alumno = alumno;
      write(s);
    },

    exportar: function () {
      var s = API.get();
      var tut = leerTutoriales();
      if (Object.keys(tut).length) s = Object.assign({}, s, { tutoriales: tut });
      s._exportado = new Date().toISOString().slice(0, 10);
      var blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'codice_' + (s.clase || 'estudiante') + '_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    /* Restaurar un guardado exportado (otro navegador, otra computadora, datos borrados).
       Acepta un File/Blob del <input type="file"> o el objeto ya leído. Fusiona: no borra nada.
       Si las cuentas no coinciden, no importa nada (salvo opts.forzar). */
    importar: function (fuente, opts) {
      opts = opts || {};
      var leer = (fuente && typeof fuente.text === 'function') ? fuente.text().then(JSON.parse)
               : Promise.resolve(typeof fuente === 'string' ? JSON.parse(fuente) : fuente);
      return leer.then(function (otro) {
        if (!otro || typeof otro !== 'object' || Array.isArray(otro)) throw new Error('El archivo no es un guardado del curso.');
        var conocidas = ['notasCompletadas', 'descubrimientos', 'eventos', 'laboratorios', 'conexiones', 'clase', 'cuenta', 'tutoriales'];
        if (!conocidas.some(function (k) { return k in otro; })) throw new Error('El archivo no es un guardado del curso.');
        var s = read();
        if (s.cuenta && otro.cuenta && s.cuenta !== otro.cuenta && !opts.forzar) {
          var e = new Error('El guardado es de la cuenta ' + otro.cuenta + ', y en este navegador está registrada la ' + s.cuenta + '.');
          e.codigo = 'otra-cuenta'; throw e;
        }
        var antes = {
          temas: (s.notasCompletadas || []).length, sellos: (s.descubrimientos || []).length,
          labs: Object.keys(s.laboratorios || {}).length, eventos: Object.keys(s.eventos || {}).length
        };
        var tut = otro.tutoriales || {};
        var limpio = {};
        Object.keys(otro).forEach(function (k) { if (k !== 'tutoriales' && k !== '_exportado') limpio[k] = otro[k]; });
        var n = fusionar(s, limpio);
        // fase práctica: gana la mejor vía (demostrada sobre «no pude»), con su evidencia
        Object.keys(limpio.fases || {}).forEach(function (t) {
          var loc = ((s.fases || {})[t] || {}).practica, imp = (limpio.fases[t] || {}).practica;
          if (loc && rangoPractica(imp) > rangoPractica(loc)) {
            n.fases[t].practica = imp;
            if (limpio.praxis && limpio.praxis[t]) { if (!n.praxis) n.praxis = {}; n.praxis[t] = limpio.praxis[t]; }
          }
        });
        write(n);
        var tutoriales = 0;
        Object.keys(tut).forEach(function (k) {
          if (!RE_TUTORIAL.test(k) || !tut[k] || typeof tut[k] !== 'object') return;
          var loc = {};
          try { loc = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) {}
          try { localStorage.setItem(k, JSON.stringify(fusionar(loc, tut[k]))); tutoriales++; } catch (e) {}
        });
        try { if (n.clase && !localStorage.getItem('selectedLang')) localStorage.setItem('selectedLang', n.clase); } catch (e) {}
        var r = {
          temas: (n.notasCompletadas || []).length - antes.temas,
          sellos: (n.descubrimientos || []).length - antes.sellos,
          labs: Object.keys(n.laboratorios || {}).length - antes.labs,
          eventos: Object.keys(n.eventos || {}).length - antes.eventos,
          tutoriales: tutoriales,
          total: { temas: (n.notasCompletadas || []).length, sellos: (n.descubrimientos || []).length, labs: Object.keys(n.laboratorios || {}).length },
          cuenta: n.cuenta || '', clase: n.clase || ''
        };
        try { document.dispatchEvent(new CustomEvent('fisica:importado', { detail: r })); } catch (e) {}
        return r;
      });
    },

    /* Aviso flotante (estilo grimorio) al romper un sello */
    _aviso: function (id) {
      var meta = null;
      if (window.DESCUBRIMIENTOS) {
        window.DESCUBRIMIENTOS.tomos.forEach(function (t) {
          t.entries.forEach(function (e) { if (e.id === id) meta = e; });
        });
      }
      var P = paleta(API.getClase());
      var box = document.createElement('div');
      box.setAttribute('role', 'status');
      box.style.cssText = [
        'position:fixed', 'right:22px', 'bottom:22px', 'z-index:99999',
        'max-width:320px', 'background:#FAF5EA', 'border:1px solid ' + P.color,
        'border-left:4px solid ' + P.color, 'border-radius:8px',
        'box-shadow:0 14px 34px -16px rgba(60,48,20,.55)',
        'padding:14px 16px 14px 14px', 'display:flex', 'gap:12px', 'align-items:flex-start',
        "font-family:'Newsreader',Georgia,serif", 'color:#2A2722',
        'opacity:0', 'transform:translateY(10px)', 'transition:opacity .35s ease,transform .35s ease'
      ].join(';');
      box.innerHTML =
        '<span style="flex:0 0 auto;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;'
        + 'justify-content:center;background:' + P.tint + ';border:2px solid ' + P.color + ';color:' + P.deep
        + ';font-size:19px;line-height:1;">' + (meta ? meta.sigil : P.glyph) + '</span>'
        + '<span style="flex:1;min-width:0;">'
        + '<span style="display:block;font-family:\'IBM Plex Mono\',monospace;font-size:9.5px;letter-spacing:.16em;'
        + 'text-transform:uppercase;color:' + P.deep + ';margin-bottom:3px;">Logro Desbloqueado</span>'
        + '<span style="display:block;font-size:16px;line-height:1.25;color:#2A2722;">'
        + (meta ? meta.title : 'Descubrimiento') + '</span>'
        + '<a href="../codice.html" style="display:inline-block;margin-top:6px;font-family:\'IBM Plex Mono\',monospace;'
        + 'font-size:10.5px;letter-spacing:.04em;color:' + P.color + ';text-decoration:none;border-bottom:1px solid '
        + P.color + ';">Ver en el C\u00f3dice \u2192</a>'
        + '</span>';
      document.body.appendChild(box);
      requestAnimationFrame(function () {
        box.style.opacity = '1'; box.style.transform = 'translateY(0)';
      });
      setTimeout(function () {
        box.style.opacity = '0'; box.style.transform = 'translateY(10px)';
        setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 400);
      }, 4200);
    }
  };

  window.FisicaSave = API;
})();
