/* anomalia.js — eventos especiales («anomalías»): material extra que se desbloquea
 *
 * Las anomalías se definen en anomalias.json (junto a este script). Cada una:
 *
 *   {
 *     "id": "futhark",                      obligatorio, único
 *     "label": "Futhark",                   nombre corto
 *     "title": "Futhark · arreglos…",       nombre largo
 *     "url": "bienvenido-futhark.html",     a dónde lleva (relativa a la página, como hasta ahora)
 *
 *     "umbral": 15,                         se activa al completar N temas …
 *     "temas": ["u4t1", "u4t2"],            … o al leer/completar CUALQUIERA de estos temas.
 *                                           (sin umbral ni temas: activa desde el principio)
 *
 *     "mapa": "nodo" | "lista",             en el Mapa: nodo extra, o solo en la lista de tareas
 *     "nodo": { "x": 800, "y": 212 },       solo si mapa = "nodo" (sin "nodo" se trata como "lista")
 *     "aristas": ["u4t1", "u5t3"],          temas a los que se une el nodo
 *
 *     "interludio": true,                   dispara FisicaNarrativa.anomalia(ruta, id, def) al investigar
 *
 *     "textos": {                           "*" = todas las rutas; "haskell", "idris"… lo sobrescriben
 *       "*": { "icono", "etiqueta", "subtitulo", "kicker", "kickerInvestigada",
 *              "detectada", "investigada", "investigar", "entrar" }
 *     }
 *   }
 *
 *   <script src="scripts/anomalia.js"></script>     (después de fisica-save.js)
 *
 *   Opciones en el <script> (todas opcionales):
 *     data-json="otra/ruta.json"     de dónde leer las anomalías
 *     data-umbral="3"                PRUEBAS: umbral para todas las que tengan umbral
 *     data-forzar="futhark,otra"     PRUEBAS: activa estas sin mirar condiciones ("*" = todas)
 *   Si existe window.ANOMALIAS (arreglo) antes de cargar el script, se usa en vez del JSON
 *   (sirve para abrir las páginas con file://, donde fetch no puede leer el .json).
 *
 *   La carga del JSON es asíncrona:
 *     FisicaAnomalia.listo                 -> Promise que se resuelve cuando ya están cargadas
 *     Evento 'fisica:anomalias' en document al terminar de cargar.
 *
 *   FisicaAnomalia.todas()                 -> definiciones (activas o no)
 *   FisicaAnomalia.activas(ruta, n)        -> [{ id, label, title, url, mapa, nodo, aristas,
 *                                               motivo, investigada, textos }]  solo las activas,
 *                                             con los textos ya resueltos para esa ruta
 *                                             (n = temas completados; por defecto, los del guardado)
 *   FisicaAnomalia.enMapa(ruta, n)         -> las activas con mapa = "nodo"
 *   FisicaAnomalia.enLista(ruta, n)        -> las activas con mapa = "lista"
 *   FisicaAnomalia.activa(id, n)           -> bool
 *   FisicaAnomalia.motivo(id, n)           -> 'umbral' | 'tema:u4tX' | 'siempre' | 'forzada' | null
 *   FisicaAnomalia.faltan(id, n)           -> temas que faltan para el umbral (0 si ya está activa)
 *   FisicaAnomalia.investigada(id)         -> bool
 *   FisicaAnomalia.investigar(id, ruta)    -> Promise (interludio, si aplica)
 *   Evento: 'fisica:anomalia' en document al investigar una ({ detail: { id } }).
 *
 *   COMPATIBILIDAD con la versión de una sola anomalía: activa(n), motivo(n), faltan(n),
 *   investigada(), investigar(ruta), .nodo, .aristas, .url, .umbral, .temas siguen funcionando
 *   y se refieren a «futhark» (o a la primera del JSON).
 */
(function () {
  if (window.FisicaAnomalia && window.FisicaAnomalia.v >= 3) return;
  var s = document.currentScript || document.querySelector('script[src*="anomalia.js"]');
  function attr(n) { return (s && s.getAttribute(n)) || ''; }
  function csv(t) { return t.split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

  var JSON_URL = attr('data-json') || (s && s.src ? new URL('anomalias.json', s.src).href : 'anomalias.json');
  var UMBRAL_PRUEBA = +attr('data-umbral') || 0;
  var FORZAR = csv(attr('data-forzar'));
  var LOCAL_KEY = 'fisicaAnomalias';   // respaldo si fisica-save.js no registra la anomalía

  var DEFS = [], POR_ID = {};

  var TEXTOS_BASE = {
    icono: '◉',
    kicker: 'ANOMALÍA DETECTADA',
    kickerInvestigada: 'ANOMALÍA · INVESTIGADA',
    detectada: '',
    investigada: '',
    investigar: 'INVESTIGAR LA ANOMALÍA',
    entrar: 'ENTRAR →'
  };

  // ---------- guardado ----------
  function guardado() { try { return (window.FisicaSave && window.FisicaSave.get()) || {}; } catch (e) { return {}; } }
  function lista(x) { return Array.isArray(x) ? x : []; }
  function hechas() { return lista(guardado().notasCompletadas).length; }
  function cuenta(n) { return typeof n === 'number' ? n : hechas(); }
  // notas completadas + (si existen) notas abiertas
  function vistas() {
    var g = guardado();
    return lista(g.notasCompletadas).concat(lista(g.notasLeidas), lista(g.leidas));
  }
  function local() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch (e) { return {}; } }
  function estaInvestigada(id) {
    var a = guardado().anomalia;
    return !!((a && a[id]) || local()[id]);
  }

  // ---------- definiciones ----------
  function normalizar(d) {
    if (!d || !d.id) return null;
    var nodo = d.nodo && typeof d.nodo.x === 'number' && typeof d.nodo.y === 'number' ? d.nodo : null;
    return {
      id: String(d.id),
      label: d.label || String(d.id),
      title: d.title || d.label || String(d.id),
      url: d.url || '#',
      umbral: +d.umbral > 0 ? +d.umbral : null,
      temas: lista(d.temas),
      mapa: d.mapa === 'nodo' && nodo ? 'nodo' : 'lista',
      nodo: nodo,
      aristas: lista(d.aristas),
      interludio: !!d.interludio,
      textos: d.textos || {}
    };
  }
  function cargar(datos) {
    var arr = Array.isArray(datos) ? datos : lista(datos && datos.anomalias);
    DEFS = []; POR_ID = {};
    arr.forEach(function (d) {
      var n = normalizar(d);
      if (!n) { console.warn('[anomalia] entrada sin "id", se ignora:', d); return; }
      if (POR_ID[n.id]) { console.warn('[anomalia] id repetido, se ignora:', n.id); return; }
      DEFS.push(n); POR_ID[n.id] = n;
    });
  }
  function legado() { return POR_ID.futhark || DEFS[0] || null; }
  // (id, n) nuevo  |  (n) antiguo
  function conId(a, b) {
    return typeof a === 'string' ? [POR_ID[a] || null, b] : [legado(), a];
  }

  function motivoDe(d, n) {
    if (!d) return null;
    if (FORZAR.indexOf('*') !== -1 || FORZAR.indexOf(d.id) !== -1) return 'forzada';
    if (!d.umbral && !d.temas.length) return 'siempre';
    var u = d.umbral && UMBRAL_PRUEBA ? UMBRAL_PRUEBA : d.umbral;
    if (u && cuenta(n) >= u) return 'umbral';
    var v = vistas();
    for (var i = 0; i < d.temas.length; i++) if (v.indexOf(d.temas[i]) !== -1) return 'tema:' + d.temas[i];
    return null;
  }

  function textosDe(d, ruta) {
    var t = Object.assign({ etiqueta: d.label.toUpperCase(), subtitulo: d.title }, TEXTOS_BASE,
                          d.textos['*'] || {}, (ruta && d.textos[ruta]) || {});
    return t;
  }

  function vista(d, ruta, n) {
    return {
      id: d.id, label: d.label, title: d.title, url: d.url,
      mapa: d.mapa, nodo: d.nodo, aristas: d.aristas.slice(),
      motivo: motivoDe(d, n), investigada: estaInvestigada(d.id),
      textos: textosDe(d, ruta)
    };
  }

  var API = {
    v: 3,
    listo: null,
    todas: function () { return DEFS.slice(); },
    activas: function (ruta, n) {
      ruta = ruta || guardado().clase;
      return DEFS.filter(function (d) { return motivoDe(d, n) !== null; })
                 .map(function (d) { return vista(d, ruta, n); });
    },
    enMapa: function (ruta, n) { return API.activas(ruta, n).filter(function (a) { return a.mapa === 'nodo'; }); },
    enLista: function (ruta, n) { return API.activas(ruta, n).filter(function (a) { return a.mapa === 'lista'; }); },

    motivo: function (a, b) { var p = conId(a, b); return motivoDe(p[0], p[1]); },
    activa: function (a, b) { return API.motivo(a, b) !== null; },
    faltan: function (a, b) {
      var p = conId(a, b), d = p[0];
      if (!d || !d.umbral || motivoDe(d, p[1]) !== null) return 0;
      return Math.max(0, (UMBRAL_PRUEBA || d.umbral) - cuenta(p[1]));
    },
    investigada: function (id) {
      var d = id ? POR_ID[id] : legado();
      return !!d && estaInvestigada(d.id);
    },
    // investigar(id, ruta)  |  investigar(ruta) antiguo
    investigar: function (a, b) {
      var d = POR_ID[a], ruta = b;
      if (!d) { d = legado(); ruta = a; }
      if (!d) return Promise.resolve(false);
      try { if (window.FisicaSave && window.FisicaSave.investigarAnomalia) window.FisicaSave.investigarAnomalia(d.id); } catch (e) {}
      // si el guardado no la registró (p. ej. solo conoce «futhark»), se anota aparte
      if (!(guardado().anomalia || {})[d.id]) {
        try { var l = local(); l[d.id] = true; localStorage.setItem(LOCAL_KEY, JSON.stringify(l)); } catch (e) {}
      }
      try { document.dispatchEvent(new CustomEvent('fisica:anomalia', { detail: { id: d.id } })); } catch (e) {}
      ruta = ruta || guardado().clase;
      if (d.interludio && window.FisicaNarrativa && window.FisicaNarrativa.anomalia) {
        try { return Promise.resolve(window.FisicaNarrativa.anomalia(ruta, d.id, d)); } catch (e) {}
      }
      return Promise.resolve(false);
    }
  };

  // ---------- compatibilidad: propiedades de la anomalía única ----------
  function prop(nombre, f) {
    Object.defineProperty(API, nombre, { enumerable: true, get: function () { var d = legado(); return d ? f(d) : undefined; } });
  }
  prop('id', function (d) { return d.id; });
  prop('url', function (d) { return d.url; });
  prop('umbral', function (d) { return d.umbral; });
  prop('temas', function (d) { return d.temas; });
  prop('nodo', function (d) { return d.nodo && { id: d.id, label: d.label, title: d.title, x: d.nodo.x, y: d.nodo.y }; });
  prop('aristas', function (d) { return d.aristas.map(function (t) { return [d.id, t]; }); });

  // ---------- carga ----------
  function avisar() {
    try { document.dispatchEvent(new CustomEvent('fisica:anomalias', { detail: { total: DEFS.length } })); } catch (e) {}
    return DEFS.slice();
  }
  if (Array.isArray(window.ANOMALIAS)) {
    cargar(window.ANOMALIAS);
    API.listo = Promise.resolve(DEFS.slice());
    setTimeout(avisar, 0);
  } else {
    API.listo = fetch(JSON_URL, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + JSON_URL); return r.json(); })
      .then(cargar)
      .catch(function (e) { console.warn('[anomalia] no se pudo leer ' + JSON_URL + ':', e); })
      .then(avisar);
  }

  window.FisicaAnomalia = API;
})();
