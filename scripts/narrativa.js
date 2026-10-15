/*
 * narrativa.js — modo «con narrativa» del curso.
 *
 *   · Interludio de fin de unidad: al completarse todos los temas de una unidad aparece,
 *     una sola vez, una ventana que cubre la pantalla y continúa la historia de la ruta.
 *     Su texto depende de la elección escondida en la unidad y del avance en el laboratorio;
 *     el de la unidad 5 elige además un final según el rasgo dominante de todas las elecciones.
 *   · Prólogo: al entrar por primera vez a una portada (sin temas completados), una ventana
 *     igual presenta la historia. Se activa con <script src="narrativa.js" data-prologo="racket">
 *     o llamando FisicaNarrativa.prologo('racket'). Se muestra una vez por ruta.
 *   · Anomalía: FisicaNarrativa.anomalia(ruta) — la llama anomalia.js al investigar Futhark.
 *   · <eleccion-narrativa unidad="u1"></eleccion-narrativa>: la elección escondida en una nota.
 *     Invisible en el modo «sin narrativa». Dos modos, según eleccion.modo en interludios.json:
 *       - «clic» (por omisión): botones; se puede cambiar hasta que se vea el interludio.
 *       - «accion»: sin botones. Cada opción trae «si» (tema, sello, evento, lab…) y cuenta
 *         lo que el alumno hizo: una opción, las dos (eco = ecoAmbas) o ninguna (sinEleccion).
 *         La caja muestra eleccion.invitacion y enlaces (opcion.enlace) a las actividades.
 *   · Variantes: cada unidad puede traer «variantes» en interludios.json, con una condición «si»
 *     sobre el perfil del alumno (temas, sellos, laboratorio, voces, esquirlas, decisiones…).
 *     El final de la unidad 5 se elige por puntajes (ajustes.puntaje). Ver GUIA-INTEGRACION-QUARTO.md.
 *   · Diálogo: el prólogo y cada interludio pueden traer «dialogo» en interludios.json: preguntas
 *     escritas de antemano que el alumno pulsa y cuya respuesta aparece debajo, entre el texto y el
 *     eco. Admite siguientes, desactiva, cierra, repetible, max y condiciones «si». No se registra
 *     ni cuenta para el final; el botón principal sigue disponible para saltarlo.
 *   · Entrada de texto: «dialogo.entrada» añade, junto a las preguntas, un campo donde el alumno
 *     escribe. Si lo escrito coincide con un «codigo» aparece su respuesta oculta (que puede abrir
 *     preguntas nuevas con «siguientes»); cualquier otro texto recibe la respuesta «otra».
 *   · Imagen: el prólogo, la anomalía y cada interludio pueden traer «imagen» (opcional): el nombre
 *     de un archivo, o { src, alt, pie, lugar }. Se muestra una sola, al inicio de la ventana
 *     (lugar «arriba», por omisión) o entre el título y el texto (lugar «texto»). La ruta es
 *     relativa a la carpeta de este archivo.
 *   · FisicaNarrativa.mostrar(ruta, unidad, {decision, progreso, rasgos, perfil}) — para vistas previas;
 *     perfil acepta solo las claves que quieras simular. FisicaNarrativa.perfil(u) devuelve el real.
 *   · FisicaNarrativa.componer(ruta, unidad, {…}) — lo mismo sin abrir la ventana (simulador).
 *   · Hechos: una variante u opción con «hecho»: "carta" lo registra en la historia al mostrarse;
 *     después «si: { hecho: "carta" }» pregunta si el alumno lo VIO (no si hoy cumpliría la condición).
 *   · Hechos del diálogo: una pregunta o un código de entrada con «hecho» lo guarda en la historia del
 *     interludio (hechosDialogo) al dispararse; vale desde ese momento y en todo lo posterior.
 *   · Palabras del alumno: entrada.guardar guarda su texto libre en la historia; «si: { palabra: … }»
 *     y {palabra:nombre} en cualquier texto lo citan después.
 *   · Trayectoria: «si» acepta primero / ultimo ('rigor'|'audacia'|'ninguno'), alternancia y unidadesConRasgo.
 *   · Ranuras del desenlace (unidad con finales): ajustes.ranuras, por omisión ["llegada", "final", "coda"].
 *     Una variante con «lugar» igual a una ranura va como párrafo propio en ese orden alrededor del final
 *     por rasgo: gana la primera que se cumple y no cuenta contra maxVariantes. «lugar: "final"» sigue
 *     reemplazando el desenlace entero, y entonces no se arman ranuras.
 *   · Finales { alto, bajo }: un final puede traer dos versiones; «alto» si hizo ≥ ajustes.minEquilibrio
 *     optativas de cada rasgo (por omisión 3).
 *   · Voces del grupo: lee window.VOCES_GRUPO (voces-grupo.js, junto a este archivo o en data-voces).
 *     Cuentas en el perfil (grupoVoces, respuestasRecibidas…) y, con «vozGrupo» en la ruta, una cita.
 *
 * Requiere fisica-save.js. Lee interludios.json de la misma carpeta que este archivo.
 */
(function () {
  if (window.FisicaNarrativa && window.FisicaNarrativa.prologo) return;
  var BASE = (function () {
    try { return new URL('.', document.currentScript.src).href; } catch (e) { return '/'; }
  })();
  // voces-grupo.js (lo genera el Panel del Docente): junto a este archivo, o donde diga data-voces="…"
  var VOCES_SRC = (function () {
    try {
      var s = document.currentScript, a = s && s.getAttribute('data-voces');
      return new URL(a || 'voces-grupo.js', a ? location.href : BASE).href;
    } catch (e) { return BASE + 'voces-grupo.js'; }
  })();
  var datos = null, cargando = null;

  function cargar() {
    if (datos) return Promise.resolve(datos);
    if (cargando) return cargando;
    cargando = fetch(BASE + 'interludios.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return cargarVoces().then(function () { datos = j; return j; }); })
      .catch(function () { cargando = null; return null; });
    return cargando;
  }
  /* Voces del grupo: si la página no cargó voces-grupo.js, se intenta una vez.
     Si no existe, la narrativa sigue igual (todas las cuentas del grupo valen 0). */
  var vocesIntentadas = false;
  function cargarVoces() {
    if (window.VOCES_GRUPO || vocesIntentadas) return Promise.resolve(window.VOCES_GRUPO || null);
    vocesIntentadas = true;
    return new Promise(function (res) {
      try {
        var s = document.createElement('script');
        s.src = VOCES_SRC; s.async = true;
        s.onload = function () { res(window.VOCES_GRUPO || null); };
        s.onerror = function () { res(null); };
        (document.head || document.documentElement).appendChild(s);
      } catch (e) { res(null); }
    });
  }
  function FS() { return window.FisicaSave || null; }
  /* Temas que cierran la unidad u: la ruta que eligió el alumno en la portada de la unidad
     (rutas.js: completa, óptima o personalizada). Si no eligió, o rutas.js no está cargado,
     la lista de interludios.json → unidades, como antes. */
  function temasDe(j, u) {
    var t = null;
    try { t = window.FisicaRutas && window.FisicaRutas.elegida ? window.FisicaRutas.elegida(u) : null; } catch (e) {}
    return (t && t.length) ? t : ((j.unidades && j.unidades[u]) || []);
  }
  function rutaDe(u) {
    try { return (window.FisicaRutas && window.FisicaRutas.modo) ? window.FisicaRutas.modo(u) : 'completa'; } catch (e) { return 'completa'; }
  }
  function modo() { var f = FS(); return f && f.getModo ? f.getModo() : 'sin'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // «imagen»: 'archivo.png' o { src, alt, pie, lugar: 'arriba' | 'texto' }; ruta relativa a esta carpeta
  function imagenDe(x) {
    var o = typeof x === 'string' ? { src: x } : x;
    if (!o || !o.src) return null;
    var src = o.src;
    try { src = new URL(o.src, BASE).href; } catch (e) {}
    return { src: src, alt: o.alt || '', pie: o.pie || '', lugar: o.lugar === 'texto' ? 'texto' : 'arriba' };
  }

  (function fuentes() {
    if (document.querySelector('link[data-narrativa-fuentes]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.setAttribute('data-narrativa-fuentes', '');
    l.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=Orbitron:wght@500;600&family=IBM+Plex+Mono:wght@400;500&display=swap';
    (document.head || document.documentElement).appendChild(l);
  })();

  /* ── Lo que la narrativa lee del laboratorio (FisicaSave.laboratorios) ──
     Solo hay ejercicios resueltos, cada uno { fecha, lenguaje, tema, clave?, … }.
       temas: temas con al menos un laboratorio resuelto  → progreso y «labsUnidad»
       ids:   ids resueltos y sus «clave» (nombre sin ruta) → condición «si: { lab: … }» */
  function labsHechos() {
    var f = FS(), labs = {}, r = { n: 0, temas: {}, ids: {} };
    try { labs = (f && f.laboratorios && f.laboratorios()) || {}; } catch (e) {}
    Object.keys(labs).forEach(function (id) {
      var L = labs[id] || {};
      var t = L.tema || (id.match(/u\d+t\d+/) || [])[0];
      if (t) r.temas[t] = true;
      r.ids[id] = true;
      if (L.clave) r.ids[L.clave] = true;
      r.n++;
    });
    return r;
  }
  function progresoDe(j, u) {
    var temas = temasDe(j, u), hechos = labsHechos().temas;
    var n = temas.filter(function (t) { return hechos[t]; }).length;
    return n * 2 >= temas.length ? 'alto' : 'bajo';
  }
  /* ── Elecciones de cada unidad ──
     · modo «clic» (por omisión): el alumno pulsa una opción en <eleccion-narrativa>.
     · modo «accion»: cada opción trae una condición «si» (misma gramática que las variantes:
       tema, sello, evento, lab, números…). Cuenta lo que el alumno HIZO: una opción, las dos
       o ninguna (→ sinEleccion). Se reevalúa siempre con el perfil actual, así que una acción
       hecha tarde sigue contando para el final de la unidad 5. */
  function esAccion(I) { return !!(I && I.eleccion && I.eleccion.modo === 'accion'); }
  function opcionesHechas(I, P) {
    return I.eleccion.opciones.filter(function (o) { return o.si && cumple(o.si, P); });
  }
  // opciones elegidas en la unidad u ([] si ninguna). «forzada» = valor(es) para vistas previas.
  function elegidas(j, ruta, u, P, forzada) {
    var I = j && j.rutas[ruta] && j.rutas[ruta][u];
    if (!I || !I.eleccion) return [];
    var ops = I.eleccion.opciones, vs;
    if (forzada != null) vs = lista(forzada);
    else if (esAccion(I)) return opcionesHechas(I, P || perfil(j, u));
    else {
      var f = FS(), d = f && f.decision && f.decision(u);
      if (!d) return [];
      vs = lista(d.valor != null ? d.valor : d);
    }
    return ops.filter(function (o) { return vs.indexOf(o.valor) !== -1; });
  }
  function ecoDe(I, ops) {
    if (!ops.length) return I.sinEleccion;
    if (ops.length === 1) return ops[0].eco;
    return I.eleccion.ecoAmbas || ops.map(function (o) { return o.eco; }).join(' ');
  }
  // rasgos acumulados en todas las unidades de la ruta (una opción de cada rasgo suma 1)
  function rasgos(j, ruta) {
    var r = { rigor: 0, audacia: 0 };
    if (!j || !ruta || !j.rutas[ruta]) {
      var f = FS();
      try { var d = f.get().decisiones || {}; Object.keys(d).forEach(function (k) { lista(d[k].rasgo).forEach(function (x) { if (r[x] != null) r[x]++; }); }); } catch (e) {}
      return r;
    }
    Object.keys(j.unidades).forEach(function (u) {
      elegidas(j, ruta, u).forEach(function (o) { if (r[o.rasgo] != null) r[o.rasgo]++; });
    });
    return r;
  }

  function componerPrologo(j, ruta) {
    var R = j.rutas[ruta], P = R && R.prologo; if (!P) return null;
    return { titulo: P.titulo, texto: P.texto.slice(), eco: P.cierre, progreso: '', prologo: true, imagen: P.imagen || null,
             dialogo: P.dialogo || null, perfil: P.dialogo ? perfil(j, 'u1') : null };
  }

  /* ── Perfil del alumno: todo lo que una variante puede consultar ──
     Números: temas, temasUnidad, labs, labsUnidad, sellos, eventos, esquirlas,
              conexiones, voces (compartidas), respuestas, adoptadas, decisiones
     Conjuntos: tema{u2t3}, sello{noasoc}, evento{id}, lab{id}; decision{u1:'cotar'}; rasgo; anomalia
     Hechos:    hecho{carta} — lo que el alumno VIO en interludios anteriores (ver hechosDe)
     Grupo:     grupoVoces, grupoRespuestas, ronda, misVocesPublicadas, respuestasRecibidas (voces-grupo.js)
     Trayectoria (solo dentro de componer): primero, ultimo ('rigor'|'audacia'|'ninguno'), alternancia, unidadesConRasgo */
  function perfil(j, u) {
    var f = FS(), s = {}; try { s = f.get() || {}; } catch (e) {}
    var ruta = s.clase || null;
    var temasU = temasDe(j, u);
    var comp = s.notasCompletadas || [], set = function (a) { var o = {}; (a || []).forEach(function (x) { o[x] = true; }); return o; };
    var LH = labsHechos(), labTemas = LH.temas;
    var con = s.conexiones || [], dec = s.decisiones || {}, decMap = {};
    Object.keys(dec).forEach(function (k) { decMap[k] = dec[k] && (dec[k].valor || dec[k]); });
    var esq = 0; try { esq = f.esquirlas ? f.esquirlas() : 0; } catch (e) {}
    var G = grupoDe(con);
    return {
      temas: comp.length,
      temasUnidad: temasU.filter(function (t) { return comp.indexOf(t) !== -1; }).length,
      labs: LH.n,
      labsUnidad: temasU.filter(function (t) { return labTemas[t]; }).length,
      temasRuta: temasU.length,            // cuántos temas tiene la ruta de la unidad
      rutaUnidad: rutaDe(u),               // 'completa' | 'optima' | 'personalizada'
      sellos: (s.descubrimientos || []).length,
      eventos: Object.keys(s.eventos || {}).length,
      esquirlas: esq,
      conexiones: con.length,
      voces: con.filter(function (c) { return c && c.compartir; }).length,
      adoptadas: con.filter(function (c) { return c && c.adoptadaDe; }).length,
      respuestas: (s.respuestas || []).length,
      decisiones: Object.keys(decMap).length,
      tema: set(comp), sello: set(s.descubrimientos), evento: set(Object.keys(s.eventos || {})), lab: LH.ids,
      decision: decMap,
      anomalia: !!(s.anomalia && s.anomalia.futhark),
      hecho: hechosDe(j, ruta, s.historia || {}),
      palabras: palabrasDe(ruta, s.historia || {}),
      grupoVoces: G.voces, grupoRespuestas: G.respuestas, ronda: G.ronda,
      misVocesPublicadas: G.mias, respuestasRecibidas: G.recibidas,
      vidsPropios: G.vids
    };
  }

  /* ── Hechos: lo que el alumno vio, no lo que tiene ahora ──
     Una variante (o una opción de la elección) puede declarar «hecho»: "carta" (o una lista).
     Al mostrarse el interludio, revisar() guarda esos hechos en la historia (FisicaSave.historia,
     clave "ruta:u"). Las condiciones posteriores preguntan «si: { hecho: "carta" }».
     Así un texto no puede mencionar algo que el lector nunca encontró, aunque hoy tenga
     los sellos o temas que entonces le faltaban.
     Registros anteriores a este cambio (sin «hechos»): se deducen de los índices de variantes
     y de las opciones elegidas que guardó la historia. Si se reordenan las variantes del JSON,
     esa deducción puede fallar para esos registros viejos; los nuevos guardan el nombre. */
  function hechosDe(j, ruta, H) {
    var out = {};
    if (!ruta || !j.rutas[ruta]) return out;
    Object.keys(H || {}).forEach(function (k) {
      var i = k.indexOf(':'); if (i < 0 || k.slice(0, i) !== ruta) return;
      var reg = H[k] || {}, I = j.rutas[ruta][k.slice(i + 1)] || {};
      // los del diálogo (códigos o preguntas con «hecho») van en su propio campo y siempre cuentan
      (reg.hechosDialogo || []).forEach(function (h) { out[h] = true; });
      if (Array.isArray(reg.hechos)) { reg.hechos.forEach(function (h) { out[h] = true; }); return; }
      (reg.variantes || []).forEach(function (n) {
        var v = I.variantes && I.variantes[n];
        if (v && v.hecho) lista(v.hecho).forEach(function (h) { out[h] = true; });
      });
      var dec = lista(reg.decision || []);
      ((I.eleccion && I.eleccion.opciones) || []).forEach(function (o) {
        if (o.hecho && dec.indexOf(o.valor) !== -1) lista(o.hecho).forEach(function (h) { out[h] = true; });
      });
    });
    return out;
  }
  /* ── Palabras del alumno ──
     Un diálogo con «entrada.guardar»: "nombre" guarda el primer texto libre que el alumno escribe
     (lo que no es un código) en la historia del interludio: palabras: { nombre: "texto" }.
     Después, «si: { palabra: "nombre" }» pregunta si lo escribió, y {palabra:nombre} dentro de
     cualquier texto (interludio, eco, final, ranuras, preguntas y respuestas) se reemplaza por lo que
     escribió. Se queda en su navegador y viaja en la exportación al profesor: «entrada.aviso» lo dice. */
  function palabrasDe(ruta, H) {
    var out = {};
    Object.keys(H || {}).sort().forEach(function (k) {
      if (!ruta || k.indexOf(ruta + ':') !== 0) return;
      var w = (H[k] || {}).palabras || {};
      Object.keys(w).forEach(function (n) { if (w[n]) out[n] = String(w[n]); });
    });
    return out;
  }
  function limpiaPalabra(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, 200); }
  // {palabra:nombre} → lo que escribió; sin texto guardado queda «…» (el simulador avisa de esos casos)
  function rellenar(t, P) {
    if (typeof t !== 'string' || t.indexOf('{palabra:') === -1) return t;
    var W = (P && P.palabras) || {};
    return t.replace(/\{palabra:([\w-]+)\}/g, function (m, n, off) {
      var v = W[n] || '…';
      // «…dice.». → «…dice».: si la plantilla cierra la cita con «». », el punto del alumno sobra
      if (t.substr(off + m.length, 2) === '».') v = v.replace(/([^.])\.+$/, '$1');
      return v;
    });
  }

  // los hechos que establece el interludio que se está mostrando (para guardarlos en la historia)
  function hechosNuevos(I, p) {
    var out = [];
    (p.variantes || []).forEach(function (n) { var v = I.variantes && I.variantes[n]; if (v && v.hecho) out = out.concat(lista(v.hecho)); });
    ((I.eleccion && I.eleccion.opciones) || []).forEach(function (o) {
      if (o.hecho && (p.elegidas || []).indexOf(o.valor) !== -1) out = out.concat(lista(o.hecho));
    });
    return out;
  }

  /* ── Voces del grupo (window.VOCES_GRUPO, de voces-grupo.js) ──
     Cuentas de la ronda publicada y, de ellas, las voces propias: una voz publicada es del
     alumno si su id coincide con el «vid» de una de sus conexiones (el Panel debe publicar
     con id = vid; si no, misVocesPublicadas y respuestasRecibidas quedan en 0). */
  function grupoDe(con) {
    var G = window.VOCES_GRUPO, r = { voces: 0, respuestas: 0, ronda: 0, mias: 0, recibidas: 0, vids: {} };
    (con || []).forEach(function (c) { if (c && c.vid) r.vids[c.vid] = true; });
    if (!G || !Array.isArray(G.voces)) return r;
    r.ronda = +G.ronda || 0;
    G.voces.forEach(function (v) {
      var n = (v && v.respuestas || []).length;
      r.voces++; r.respuestas += n;
      if (v && v.id && r.vids[v.id]) { r.mias++; r.recibidas += n; }
    });
    return r;
  }
  /* Cita de una voz del grupo dentro del interludio. Se activa con «vozGrupo» en la ruta
     (o en la unidad; «vozGrupo: false» la apaga en esa unidad):
       "vozGrupo": { "plantilla": "…«{texto}»…", "lugar": "eco" | "texto", "si": {condición} }
     Elige una voz ajena cuyo vínculo toque un tema de la unidad: la más respondida y, entre
     empatadas, una fija para cada alumno. Nunca muestra la firma: sólo el texto, que el
     docente ya revisó al publicar la ronda. */
  function hash(t) { var h = 5381; t = String(t); for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return h; }
  function recorta(t, n) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    var c = t.slice(0, n), k = c.lastIndexOf(' ');
    return (k > n * 0.6 ? c.slice(0, k) : c).replace(/[\s,;:.]+$/, '') + '…';
  }
  function vozPara(j, u, P, VG, semilla) {
    var G = window.VOCES_GRUPO;
    if (!VG || !VG.plantilla || !G || !Array.isArray(G.voces)) return null;
    if (VG.si && !cumple(VG.si, P)) return null;
    var temas = (j.unidades && j.unidades[u]) || [], mias = P.vidsPropios || {};
    var cand = G.voces.filter(function (v) {
      return v && v.texto && !mias[v.id] && (temas.indexOf(v.from) !== -1 || temas.indexOf(v.to) !== -1);
    });
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      var d = (b.respuestas || []).length - (a.respuestas || []).length;
      return d || (hash(semilla + '|' + a.id) - hash(semilla + '|' + b.id));
    });
    return { id: cand[0].id, texto: recorta(cand[0].texto, VG.max || 220) };
  }

  /* ── Trayectoria: el orden de las elecciones, no sólo su suma ──
     Por unidad: 'rigor' | 'audacia' | 'ambas' | 'ninguna'. De ahí:
       primero / ultimo — primer y último rasgo elegido (las unidades con «ambas» o «ninguna» no cuentan)
       alternancia      — cuántas veces cambió de rasgo entre unidades sucesivas con un solo rasgo
       unidadesConRasgo — cuántas unidades tuvieron exactamente un rasgo (lo que mide la trayectoria)
     «primero» es la primera optativa que tomó, no la unidad 1: un texto de llegada no debe decir
     «al principio» sino «lo primero que hice fuera del camino». */
  function resumenTrayectoria(seq) {
    var h = seq.filter(function (x) { return x === 'rigor' || x === 'audacia'; }), alt = 0;
    for (var i = 1; i < h.length; i++) if (h[i] !== h[i - 1]) alt++;
    return { seq: seq, primero: h[0] || 'ninguno', ultimo: h[h.length - 1] || 'ninguno', alternancia: alt, unidadesConRasgo: h.length };
  }
  function trayectoria(j, ruta) {
    return resumenTrayectoria(Object.keys(j.unidades).map(function (u) {
      var rs = elegidas(j, ruta, u).map(function (o) { return o.rasgo; });
      return rs.length >= 2 ? 'ambas' : (rs[0] || 'ninguna');
    }));
  }

  // «>=3», «<10», «5» (igualdad) o un número
  function compara(v, regla) {
    var m = String(regla).match(/^\s*(>=|<=|>|<|=)?\s*(-?[\d.]+)\s*$/); if (!m) return false;
    var x = +m[2];
    switch (m[1]) { case '>=': return v >= x; case '<=': return v <= x; case '>': return v > x; case '<': return v < x; default: return v === x; }
  }
  function lista(x) { return Array.isArray(x) ? x : [x]; }
  function cumple(si, P) {
    if (!si) return true;
    return Object.keys(si).every(function (k) {
      var r = si[k];
      if (k === 'no') return !cumple(r, P);
      if (k === 'alguno') return lista(r).some(function (c) { return cumple(c, P); });
      if (k === 'tema' || k === 'sello' || k === 'evento' || k === 'lab' || k === 'hecho') return lista(r).every(function (id) { return !!(P[k] || {})[id]; });
      if (k === 'palabra') return lista(r).every(function (id) { return !!(P.palabras || {})[id]; });
      if (k === 'decision') return Object.keys(r).every(function (uu) { var hecho = lista(P.decision[uu]); return lista(r[uu]).some(function (v) { return hecho.indexOf(v) !== -1; }); });
      if (k === 'rasgo') return P.rasgo === r;
      if (k === 'anomalia') return P.anomalia === !!r;
      if (typeof P[k] === 'number') return compara(P[k], r);
      // texto (primero, ultimo…): igual a uno de los valores dados
      if (typeof P[k] === 'string') return lista(r).indexOf(P[k]) !== -1;
      return false;
    });
  }

  // puntaje de cada rasgo = decisiones con ese rasgo + señales de actividad, con los pesos de ajustes.puntaje
  function puntajes(j, P, rasg) {
    var cfg = (j.ajustes && j.ajustes.puntaje) || { rigor: { decision: 1 }, audacia: { decision: 1 } }, out = {};
    Object.keys(cfg).forEach(function (r) {
      var w = cfg[r], t = 0;
      Object.keys(w).forEach(function (k) { t += (k === 'decision' ? (rasg[r] || 0) : (P[k] || 0)) * w[k]; });
      out[r] = Math.round(t * 100) / 100;
    });
    return out;
  }
  /* Final según los puntajes.
     El equilibrio se decide SÓLO entre rigor y audacia (son los dos rasgos de la elección).
     Un rasgo social (comunidad, o cualquier otro con final propio) gana únicamente si supera
     a los dos por el margen; antes competía en la misma tabla, y un empate rigor ≈ comunidad
     caía en «equilibrio», cuyo texto habla de rigor y audacia. */
  function dominante(pts, finales, margen) {
    margen = margen == null ? 0.5 : margen;
    var r = pts.rigor || 0, a = pts.audacia || 0, tope = Math.max(r, a);
    var social = Object.keys(pts).filter(function (k) {
      return finales[k] && k !== 'rigor' && k !== 'audacia' && pts[k] - tope >= margen;
    }).sort(function (x, y) { return pts[y] - pts[x]; })[0];
    if (social) return social;
    if (Math.abs(r - a) < margen) return 'equilibrio';
    var k = r > a ? 'rigor' : 'audacia';
    return finales[k] ? k : 'equilibrio';
  }

  function componer(j, ruta, u, o) {
    var R = j.rutas[ruta], I = R && R[u]; if (!I) return null;
    var P = o.perfil || perfil(j, u);
    var ops = elegidas(j, ruta, u, P, o.decision);
    var p = { titulo: I.titulo, texto: I.texto.slice(), eco: ecoDe(I, ops), progreso: I.progreso[o.progreso] || '',
              elegidas: ops.map(function (x) { return x.valor; }) };
    var rasg = o.rasgos || { rigor: 0, audacia: 0 };
    P.rasgo = rasg.rigor > rasg.audacia ? 'rigor' : rasg.audacia > rasg.rigor ? 'audacia' : 'equilibrio';
    var T = o.trayectoria || (o.perfil && o.perfil._simulado ? resumenTrayectoria([]) : trayectoria(j, ruta));
    P.primero = T.primero; P.ultimo = T.ultimo; P.alternancia = T.alternancia; P.unidadesConRasgo = T.unidadesConRasgo || 0;
    var A = j.ajustes || {}, max = A.maxVariantes == null ? 2 : A.maxVariantes, usadas = [];
    /* Ranuras del desenlace: ajustes.ranuras, por omisión ["llegada", "final", "coda"].
       Cada nombre distinto de "final" es un «lugar» de variante: gana la primera que se cumple,
       no cuenta contra maxVariantes y sólo se arma alrededor de un final por rasgo. Una variante
       con «lugar: "final"» sigue reemplazando el desenlace entero (temas incompletos). */
    var RAN = Array.isArray(A.ranuras) && A.ranuras.length ? A.ranuras.slice() : ['llegada', 'final', 'coda'];
    if (RAN.indexOf('final') === -1) RAN.push('final');
    var finalVar = null, piezas = {};
    (I.variantes || []).forEach(function (v, i) {
      if (!cumple(v.si, P)) return;
      if (v.lugar === 'final') { if (!finalVar) { finalVar = v.texto; usadas.push(i); } return; }
      if (v.lugar && RAN.indexOf(v.lugar) !== -1) { if (!piezas[v.lugar]) piezas[v.lugar] = { texto: v.texto, i: i }; return; }
      if (usadas.length >= max) return;
      usadas.push(i);
      if (v.lugar === 'eco') p.eco = p.eco + ' ' + v.texto; else p.texto.push(v.texto);
    });
    // una voz del grupo, si la ruta (o la unidad) lo pide
    var VG = I.vozGrupo === false ? null : (I.vozGrupo || R.vozGrupo);
    var cita = vozPara(j, u, P, VG, (o.semilla != null ? o.semilla : (FS() && FS().get && FS().get().cuenta) || '') + '|' + ruta + '|' + u);
    if (cita) {
      var tv = VG.plantilla.split('{texto}').join(cita.texto);
      if (VG.lugar === 'texto') p.texto.push(tv); else p.eco = (p.eco ? p.eco + ' ' : '') + tv;
      p.voz = cita.id;
    }
    if (I.finales) {
      var pts = puntajes(j, P, rasg);
      p.rasgoFinal = dominante(pts, I.finales, A.margenEmpate);
      var fx = I.finales[p.rasgoFinal] || I.finales.equilibrio;
      /* Un final puede tener dos versiones: { alto, bajo }. Se usa «alto» cuando el alumno hizo
         al menos ajustes.minEquilibrio actividades de CADA rasgo (por omisión 3: más de la mitad
         de las optativas). Pensado para «equilibrio»: no es lo mismo (0,0) que (5,5). */
      if (fx && typeof fx === 'object') {
        var minE = A.minEquilibrio == null ? 3 : A.minEquilibrio;
        p.nivel = Math.min(rasg.rigor || 0, rasg.audacia || 0) >= minE ? 'alto' : 'bajo';
        fx = fx[p.nivel] || fx.alto || fx.bajo;
      }
      p.final = finalVar || fx;
      p.puntajes = pts;
      // el desenlace en orden de ranuras; un final que reemplaza va solo
      p.piezasFinal = [];
      if (finalVar) p.piezasFinal.push({ lugar: 'final', texto: finalVar });
      else RAN.forEach(function (nombre) {
        if (nombre === 'final') { if (p.final) p.piezasFinal.push({ lugar: 'final', texto: p.final }); return; }
        var x = piezas[nombre]; if (!x) return;
        p.piezasFinal.push({ lugar: nombre, texto: x.texto }); usadas.push(x.i);
        p[nombre] = x.texto;                // p.llegada, p.coda…: para el simulador y la historia
      });
    }
    p.texto = p.texto.map(function (t) { return rellenar(t, P); });
    p.eco = rellenar(p.eco, P); p.progreso = rellenar(p.progreso, P);
    if (p.final) p.final = rellenar(p.final, P);
    if (p.piezasFinal) p.piezasFinal.forEach(function (x) { x.texto = rellenar(x.texto, P); if (p[x.lugar] != null && x.lugar !== 'final') p[x.lugar] = x.texto; });
    p.trayectoria = T;
    p.variantes = usadas;
    p.perfil = P;
    p.dialogo = I.dialogo || null;
    p.imagen = I.imagen || null;
    return p;
  }

  /* Añade hechos del diálogo al registro «ruta:clave» de la historia, sin tocar lo demás
     (registrarHistoria reemplaza el registro, así que se reescribe completo, con su fecha). */
  function guardarDelDialogo(ruta, clave, cambios) {
    var f = FS(); if (!f || !f.historia || !f.registrarHistoria) return;
    var reg = (f.historia() || {})[ruta + ':' + clave] || {}, nuevo = Object.assign({}, reg), cambio = false;
    if (cambios.hechos) {
      var ahora = (reg.hechosDialogo || []).slice();
      cambios.hechos.forEach(function (h) { if (ahora.indexOf(h) === -1) { ahora.push(h); cambio = true; } });
      nuevo.hechosDialogo = ahora;
    }
    if (cambios.palabras) {
      nuevo.palabras = Object.assign({}, reg.palabras || {}, cambios.palabras); cambio = true;
    }
    if (!cambio) return;
    try { f.registrarHistoria(ruta, clave, nuevo); } catch (e) {}
  }

  function abrir(ruta, u, p, alCerrar) {
    var j = datos, R = j.rutas[ruta], E = R.estilo, n = u.slice(1);
    var prev = document.getElementById('narrativa-interludio'); if (prev) prev.remove();
    var host = document.createElement('div');
    host.id = 'narrativa-interludio';
    host.setAttribute('role', 'dialog'); host.setAttribute('aria-modal', 'true'); host.setAttribute('aria-label', p.titulo);
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;';
    var sh = host.attachShadow({ mode: 'open' });
    var fin = n === '5', pro = !!p.prologo;
    var img = imagenDe(p.imagen);
    var fig = img ? '<figure class="img"><img src="' + esc(img.src) + '" alt="' + esc(img.alt) + '">'
      + (img.pie ? '<figcaption>' + esc(img.pie) + '</figcaption>' : '') + '</figure>' : '';
    var arriba = img && img.lugar === 'arriba';
    sh.innerHTML = '<style>'
      + ':host{all:initial;}'
      + '.v{position:fixed;inset:0;background:' + E.fondo + ';overflow-y:auto;opacity:0;transition:opacity .9s ease;display:flex;justify-content:center;align-items:flex-start;}'
      + '.v.on{opacity:1;}'
      + '.c{width:100%;max-width:620px;padding:12vh 28px 10vh;box-sizing:border-box;transform:translateY(14px);transition:transform 1.1s ease;}'
      + '.v.on .c{transform:none;}'
      + '.k{font-family:"' + E.kicker + '",monospace;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:' + E.acento + ';margin:0 0 22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}'
      + 'h1{font-family:"' + E.titulo + '",serif;font-weight:500;font-size:clamp(30px,5vw,46px);line-height:1.1;color:' + E.tinta + ';margin:0 0 30px;text-wrap:balance;}'
      + 'p{font-family:"' + E.cuerpo + '",serif;font-size:20px;line-height:1.62;color:' + E.tinta + ';margin:0 0 18px;text-wrap:pretty;}'
      + '.orn{font-family:"' + E.titulo + '",serif;color:' + E.acento + ';text-align:center;font-size:15px;letter-spacing:.5em;margin:30px 0;}'
      + '.eco{font-style:italic;}'
      + '.pr{font-family:"IBM Plex Mono",monospace;font-size:12.5px;line-height:1.6;color:' + E.tenue + ';margin:26px 0 0;}'
      + '.fin{font-size:22px;color:' + E.acento + ';font-style:italic;}'
      + '.cont{margin-top:44px;font-family:"IBM Plex Mono",monospace;font-size:13px;letter-spacing:.08em;cursor:pointer;background:' + E.acento + ';color:' + E.fondo + ';border:none;padding:13px 28px;}'
      + '.cont:hover{filter:brightness(1.1);}'
      + 'button:focus-visible{outline:2px solid ' + E.tinta + ';outline-offset:3px;}'
      + '.dlg{margin:34px 0 8px;}'
      + '.yo{font-family:"IBM Plex Mono",monospace;font-size:13px;letter-spacing:.04em;color:' + E.acento + ';margin:26px 0 10px;}'
      + '.nuevo{animation:ap .7s ease both;}'
      + '@keyframes ap{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}'
      + '.qs{display:flex;flex-direction:column;align-items:flex-start;gap:9px;margin-top:22px;}'
      + '.q{font-family:"' + E.cuerpo + '",serif;font-size:17px;font-style:italic;text-align:left;cursor:pointer;background:transparent;color:' + E.tinta + ';border:1px solid ' + E.tenue + ';padding:9px 16px;border-radius:2px;}'
      + '.q:hover{border-color:' + E.acento + ';color:' + E.acento + ';}'
      + '.q::before{content:"— ";color:' + E.acento + ';}'
      + '.desp{font-style:italic;color:' + E.tenue + ';}'
      + '.ent{display:flex;gap:9px;align-items:stretch;margin-top:14px;max-width:420px;}'
      + '.tx{flex:1;min-width:0;font-family:"' + E.cuerpo + '",serif;font-size:17px;background:transparent;color:' + E.tinta + ';border:1px solid ' + E.tenue + ';padding:9px 14px;border-radius:2px;}'
      + '.tx::placeholder{color:' + E.tenue + ';font-style:italic;opacity:1;}'
      + '.tx:focus{outline:none;border-color:' + E.acento + ';}'
      + '.tx:focus-visible{outline:2px solid ' + E.tinta + ';outline-offset:3px;}'
      + '.env{font-family:"IBM Plex Mono",monospace;font-size:12.5px;letter-spacing:.06em;cursor:pointer;background:transparent;color:' + E.acento + ';border:1px solid ' + E.acento + ';padding:9px 16px;border-radius:2px;}'
      + '.env:hover{background:' + E.acento + ';color:' + E.fondo + ';}'
      + '.avi{font-family:"IBM Plex Mono",monospace;font-size:11.5px;line-height:1.5;color:' + E.tenue + ';margin:8px 0 0;max-width:420px;}'
      + '.c.ci{padding-top:6vh;}'
      + '.img{margin:0 0 30px;}'
      + '.img img{display:block;width:100%;height:auto;border-radius:2px;}'
      + '.img figcaption{font-family:"IBM Plex Mono",monospace;font-size:11.5px;line-height:1.5;color:' + E.tenue + ';margin-top:8px;}'
      + '@media (prefers-reduced-motion:reduce){.v,.c{transition:none;}.nuevo{animation:none;}}'
      + '</style>'
      + '<div class="v"><div class="c' + (arriba ? ' ci' : '') + '">'
      + (arriba ? fig : '')
      + '<div class="k"><span>' + esc(R.nombre) + '</span><span>' + (p.kicker ? esc(p.kicker) : pro ? 'Prólogo' : fin ? 'Epílogo' : 'Fin de la unidad ' + esc(n)) + '</span></div>'
      + '<h1>' + esc(p.titulo) + '</h1>'
      + (img && !arriba ? fig : '')
      + p.texto.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('')
      + (p.dialogo ? '<div class="dlg"><div class="log" role="log" aria-live="polite"></div><div class="qs" role="group" aria-label="Preguntas"></div></div>' : '')
      + '<div class="orn">· · ·</div>'
      + '<p class="eco">' + esc(p.eco) + '</p>'
      + (p.final ? '<div class="orn">· · ·</div>' + (p.piezasFinal || [{ texto: p.final }]).map(function (x) { return '<p class="fin">' + esc(x.texto) + '</p>'; }).join('') : '')
      + (p.progreso ? '<p class="pr">' + esc(p.progreso) + '</p>' : '')
      + '<button type="button" class="cont">' + (p.boton ? esc(p.boton) : pro ? 'Comenzar' : fin ? 'Cerrar el libro' : 'Continuar') + '</button>'
      + '</div></div>';
    document.documentElement.appendChild(host);
    var v = sh.querySelector('.v'), b = sh.querySelector('.cont');
    // una imagen que no carga (archivo ausente) se retira sin dejar hueco
    var im = sh.querySelector('.img img');
    if (im) im.addEventListener('error', function () { var g = sh.querySelector('.img'); if (g) g.remove(); var c = sh.querySelector('.c'); if (c) c.classList.remove('ci'); });
    if (p.dialogo) dialogo(sh, p.dialogo, p.perfil, b, p.claveHistoria ? function (c) { guardarDelDialogo(ruta, p.claveHistoria, c); } : null);
    var overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { v.classList.add('on'); }); });
    setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (e) {} }, 400);
    function cerrar() {
      document.removeEventListener('keydown', tecla, true);
      v.classList.remove('on');
      setTimeout(function () { host.remove(); document.documentElement.style.overflow = overflow; }, 600);
      if (alCerrar) alCerrar();
    }
    function tecla(e) {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        var bs = Array.prototype.slice.call(sh.querySelectorAll('button, input'));
        var i = bs.indexOf(sh.activeElement), k = bs.length;
        (bs[i === -1 ? 0 : (i + (e.shiftKey ? k - 1 : 1)) % k] || b).focus();
      }
    }
    b.addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla, true);
  }

  /* ── Diálogo escrito de antemano (prólogo o interludio) ──
     dialogo: { inicio: [ids], max: n, despedida: '…', nodos: { id: { pregunta, respuesta: […],
                siguientes: [ids], desactiva: [ids], cierra: bool, repetible: bool, si: {condición} } } }
     Cada pregunta se hace una vez (salvo «repetible»); «desactiva» retira otras; «cierra» termina el diálogo.
     No se registra en el historial ni cuenta para el final: es para comprender, no para puntuar.
     Excepción: una pregunta o un código con «hecho»: "nombre" (o una lista) deja ese hecho en la historia
     del interludio (hechosDialogo) en cuanto el alumno lo dispara. Desde entonces «si: { hecho: … }» lo ve
     en cualquier interludio posterior, y en el mismo diálogo: una pregunta de «inicio» con esa condición
     aparece en cuanto se cumple. En vistas previas (mostrar) no se guarda nada.
     Palabras: entrada.guardar: "nombre" guarda el primer texto libre (no un código) del alumno;
     entrada.guardada: […] es la respuesta (puede citarlo con {palabra:nombre}); el campo se retira al
     guardar (trasGuardar: "sigue" lo deja). entrada.aviso: nota bajo el campo (p. ej., que viaja en la
     exportación al profesor).

     Entrada de texto (opcional): un campo junto a las preguntas.
     dialogo.entrada: { etiqueta: 'texto de ayuda del campo', boton: 'Decir', max: n, si: {condición},
                        codigos: [ { codigo: 'YQ2D-GP7I' (o lista), respuesta: […],
                                     siguientes: [ids], desactiva: [ids], cierra: bool, repetible: bool } ],
                        otra: […] }
     Lo escrito se compara sin distinguir mayúsculas ni espacios. Si coincide con un «codigo» aparece su
     respuesta (y, con «siguientes», preguntas que estaban ocultas); si no, la respuesta «otra». Un código
     vale una vez (salvo «repetible»): repetido, recibe «otra». «max» limita los intentos (por omisión, sin
     límite) y no se mezcla con el «max» de las preguntas. El campo se retira cuando el diálogo termina
     («cierra» o preguntas agotadas); con «persiste: true» sigue disponible después.
     «tras: 'id'» (o lista) lo mantiene oculto hasta que el alumno haga esa pregunta; en ese caso el campo
     ya no depende de que queden preguntas: dura hasta «cierra» o hasta agotar sus intentos. Los códigos viajan a la vista en interludios.json:
     sirven para la historia, no para proteger nada. */
  function normal(t) { return String(t == null ? '' : t).toUpperCase().replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, ''); }
  function dialogo(sh, D, P, cont, alGuardar) {
    var N = D.nodos || {}, log = sh.querySelector('.log'), qs = sh.querySelector('.qs');
    // un hecho disparado aquí vale en el acto (para este diálogo) y se guarda en la historia (para después)
    function anotar(x) {
      var hs = (x && x.hecho != null ? lista(x.hecho) : []).filter(Boolean);
      if (!hs.length) return;
      if (P) { if (!P.hecho) P.hecho = {}; hs.forEach(function (h) { P.hecho[h] = true; }); }
      if (alGuardar) { try { alGuardar({ hechos: hs }); } catch (e) {} }
    }
    var orden = (D.inicio || []).slice(), usadas = {}, fuera = {}, hechas = 0, terminado = false, despedido = false;
    var max = D.max == null ? Infinity : D.max;
    function visible(id) {
      var n = N[id];
      return !!n && !fuera[id] && (n.repetible || !usadas[id]) && (!n.si || cumple(n.si, P || {}));
    }
    function pintar() {
      var ids = (terminado || hechas >= max) ? [] : orden.filter(visible);
      qs.innerHTML = ids.map(function (id) {
        return '<button type="button" class="q" data-id="' + esc(id) + '">' + esc(rellenar(N[id].pregunta, P)) + '</button>';
      }).join('');
      // el campo de texto dura lo que el diálogo: se retira al cerrarse o al agotarse las preguntas
      // (con entrada.persiste sigue ahí hasta «cierra» o hasta agotar sus intentos)
      if (terminado || (!ids.length && hechas && !(T && (T.persiste || T.tras)))) quitarEntrada();
      if (!ids.length && (hechas || dichas) && D.despedida && !despedido && !ent) {
        despedido = true;
        log.insertAdjacentHTML('beforeend', '<p class="desp nuevo">' + esc(D.despedida) + '</p>');
      }
      return ids;
    }
    function preguntar(id) {
      var n = N[id]; if (!n || !visible(id) || terminado || hechas >= max) return;
      hechas++; usadas[id] = true;
      anotar(n);
      log.insertAdjacentHTML('beforeend', '<div class="nuevo"><p class="yo">— ' + esc(rellenar(n.pregunta, P)) + '</p>'
        + lista(n.respuesta || []).map(function (r) { return '<p>' + esc(rellenar(r, P)) + '</p>'; }).join('') + '</div>');
      lista(n.desactiva || []).forEach(function (x) { fuera[x] = true; });
      lista(n.siguientes || []).forEach(function (x) { if (orden.indexOf(x) === -1) orden.push(x); });
      if (n.cierra) terminado = true;
      var abre = !terminado && T && T.tras && lista(T.tras).indexOf(id) !== -1 && ponerEntrada();
      var ids = pintar();
      var sig = (abre && tx) || (ids.length ? qs.querySelector('.q') : cont);
      try { sig.focus({ preventScroll: true }); } catch (e) {}
    }
    qs.addEventListener('click', function (e) {
      var q = e.target && e.target.closest ? e.target.closest('.q') : null;
      if (q) preguntar(q.getAttribute('data-id'));
    });

    /* ── entrada de texto ── */
    var T = D.entrada, ent = null, tx = null, dichas = 0, usados = {}, puesta = false, guardada = false;
    var maxT = T && T.max != null ? T.max : Infinity;
    function quitarEntrada() { if (ent) { var av = ent.nextElementSibling; if (av && av.classList && av.classList.contains('avi')) av.remove(); ent.remove(); ent = null; tx = null; } }
    function decir(texto) {
      var clave = normal(texto); if (!clave || terminado || !ent) return;
      dichas++;
      var hit = null;
      lista(T.codigos || []).some(function (c, i) {
        if (!c || (usados[i] && !c.repetible)) return false;
        if (lista(c.codigo).map(normal).indexOf(clave) === -1) return false;
        usados[i] = true; hit = c; return true;
      });
      var resp = hit ? hit.respuesta : T.otra, guardarAhora = false;
      // texto libre que la entrada guarda (una vez): queda en la historia y vale desde ya en este diálogo
      if (!hit && T.guardar && !guardada && limpiaPalabra(texto)) {
        guardada = true; guardarAhora = true;
        if (P) { if (!P.palabras) P.palabras = {}; P.palabras[T.guardar] = limpiaPalabra(texto); }
        if (alGuardar) { var w = {}; w[T.guardar] = limpiaPalabra(texto); try { alGuardar({ palabras: w }); } catch (e) {} }
        resp = T.guardada || T.otra;
      }
      log.insertAdjacentHTML('beforeend', '<div class="nuevo"><p class="yo">— ' + esc(String(texto).trim()) + '</p>'
        + lista(resp || []).map(function (r) { return '<p>' + esc(rellenar(r, P)) + '</p>'; }).join('') + '</div>');
      if (hit) {
        anotar(hit);
        lista(hit.desactiva || []).forEach(function (x) { fuera[x] = true; });
        lista(hit.siguientes || []).forEach(function (x) { if (orden.indexOf(x) === -1) orden.push(x); });
        if (hit.cierra) terminado = true;
      }
      if (dichas >= maxT || (guardarAhora && T.trasGuardar !== 'sigue')) quitarEntrada();
      var ids = pintar();
      var sig = tx || (ids.length ? qs.querySelector('.q') : cont);
      try { sig.focus({ preventScroll: true }); } catch (e) {}
    }
    function ponerEntrada() {
      if (puesta || !T || (T.si && !cumple(T.si, P || {}))) return false;
      puesta = true;
      qs.insertAdjacentHTML('afterend', '<form class="ent" novalidate>'
        + '<input class="tx" type="text" maxlength="200" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"'
        + ' placeholder="' + esc(T.etiqueta || 'Decir otra cosa…') + '" aria-label="' + esc(T.etiqueta || 'Decir otra cosa') + '">'
        + '<button type="submit" class="env">' + esc(T.boton || 'Decir') + '</button></form>'
        + (T.aviso ? '<p class="avi">' + esc(T.aviso) + '</p>' : ''));
      ent = sh.querySelector('.ent'); tx = ent.querySelector('.tx');
      ent.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = tx.value; tx.value = '';
        decir(t);
      });
      // lo que se teclea aquí no debe activar atajos de teclado de la página
      tx.addEventListener('keydown', function (e) { if (e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation(); });
      return true;
    }
    if (T && !T.tras) ponerEntrada();
    pintar();
  }

  function unidadesCompletas(j) {
    var f = FS(); if (!f) return [];
    var hechas = f.completadas ? f.completadas() : [];
    return Object.keys(j.unidades).filter(function (u) {
      var t = temasDe(j, u);
      return t.length > 0 && t.every(function (x) { return hechas.indexOf(x) !== -1; });
    });
  }

  var abierto = false;
  function revisar() {
    if (abierto || modo() !== 'narrativa') return;
    var f = FS(); if (!f) return;
    var ruta = f.getClase && f.getClase(); if (!ruta) return;
    cargar().then(function (j) {
      if (!j || !j.rutas[ruta] || abierto) return;
      var u = unidadesCompletas(j).filter(function (x) { return !f.interludioVisto(x); })[0];
      if (!u) return;
      var I = j.rutas[ruta][u], P0 = perfil(j, u);
      var ops = elegidas(j, ruta, u, P0);
      // en modo «accion» se guarda una instantánea de lo hecho (para la exportación al profesor)
      if (esAccion(I) && f.decidir) {
        f.decidir(u, ops.map(function (o) { return o.valor; }), ops.map(function (o) { return o.rasgo; }));
        P0 = perfil(j, u); // el perfil debe incluir la decisión recién guardada (variantes con «decision»)
      }
      var p = componer(j, ruta, u, { perfil: P0, decision: ops.map(function (o) { return o.valor; }), progreso: progresoDe(j, u), rasgos: rasgos(j, ruta) });
      if (!p) return;
      p.claveHistoria = u;
      try {
        if (f.registrarHistoria) f.registrarHistoria(ruta, u, {
          temas: p.perfil.temas, labs: p.perfil.labs, sellos: p.perfil.sellos, voces: p.perfil.voces,
          esquirlas: p.perfil.esquirlas, decision: p.elegidas, variantes: p.variantes, final: p.rasgoFinal || null,
          nivel: p.nivel || null, hechos: hechosNuevos(I, p), voz: p.voz || null,
          trayectoria: p.trayectoria ? p.trayectoria.seq : null
        });
      } catch (e) {}
      abierto = true;
      f.marcarInterludio(u);
      abrir(ruta, u, p, function () { abierto = false; setTimeout(revisar, 700); });
    });
  }

  function prologo(ruta, forzar) {
    if (!forzar && modo() !== 'narrativa') return Promise.resolve(false);
    var f = FS();
    if (!forzar && f) {
      if (f.interludioVisto('prologo-' + ruta)) return Promise.resolve(false);
      var hechas = f.completadas ? f.completadas() : [];
      if (hechas.length) return Promise.resolve(false);
    }
    return cargar().then(function (j) {
      if (!j || (abierto && !forzar)) return false;
      var p = componerPrologo(j, ruta); if (!p) return false;
      if (!forzar) p.claveHistoria = 'prologo';
      if (!forzar && f) f.marcarInterludio('prologo-' + ruta);
      abierto = true;
      abrir(ruta, 'u0', p, function () { abierto = false; });
      return true;
    });
  }

  // interludio de la anomalía (Futhark): una vez por ruta, al investigarla
  /* anomalia(ruta, id, def)  — como la llama anomalia.js (v3)
     anomalia(ruta, true)      — forzar, para vistas previas
     anomalia(ruta)            — la de siempre: futhark
     Antes la firma era (ruta, forzar) y anomalia.js pasaba el id en el lugar de «forzar»:
     el interludio salía también en el modo «sin narrativa» y nunca quedaba marcado como visto.
     Textos: rutas[ruta].anomalias[id], o rutas[ruta].anomalia para futhark (como hasta ahora).
     Marca de visto: «anomalia-ruta» para futhark (compatible con los guardados), «anomalia-ruta-id» para las demás. */
  function anomalia(ruta, a, b) {
    var id = typeof a === 'string' && a ? a : 'futhark';
    var forzar = a === true || b === true;
    var marca = 'anomalia-' + ruta + (id === 'futhark' ? '' : '-' + id);
    if (!forzar && modo() !== 'narrativa') return Promise.resolve(false);
    var f = FS();
    if (!forzar && f && f.interludioVisto(marca)) return Promise.resolve(false);
    return cargar().then(function (j) {
      var R = j && j.rutas[ruta];
      var A = R && ((R.anomalias && R.anomalias[id]) || (id === 'futhark' ? R.anomalia : null));
      if (!A || (abierto && !forzar)) return false;
      if (!forzar && f) f.marcarInterludio(marca);
      abierto = true;
      return new Promise(function (res) {
        abrir(ruta, 'u0', { titulo: A.titulo, texto: A.texto.slice(), eco: A.cierre, progreso: '', prologo: true, kicker: 'Anomalía', boton: 'Investigar', imagen: A.imagen || null,
                            dialogo: A.dialogo || null, perfil: A.dialogo ? perfil(j, 'u1') : null,
                            claveHistoria: forzar ? null : (id === 'futhark' ? 'anomalia' : 'anomalia-' + id) },
          function () { abierto = false; res(true); });
      });
    });
  }

  window.FisicaNarrativa = {
    cargar: cargar,
    revisar: revisar,
    prologo: prologo,
    anomalia: anomalia,
    mostrar: function (ruta, u, o) {
      return cargar().then(function (j) {
        if (!j) return false;
        o = Object.assign({}, o || {});
        // perfil simulado: se mezcla sobre el real (o sobre uno vacío si no hay guardado)
        if (o.perfil) {
          var base = perfil(j, u), sim = o.perfil;
          Object.keys(sim).forEach(function (k) {
            if (Array.isArray(sim[k]) && (k === 'tema' || k === 'sello' || k === 'evento' || k === 'lab' || k === 'hecho')) { var s = {}; sim[k].forEach(function (x) { s[x] = true; }); base[k] = s; }
            else base[k] = sim[k];
          });
          o.perfil = base;
        }
        var p = componer(j, ruta, u, o);
        if (p) abrir(ruta, u, p);
        return p ? { variantes: p.variantes, final: p.rasgoFinal || null, puntajes: p.puntajes || null } : false;
      });
    },
    perfil: function (u) { return cargar().then(function (j) { return j ? perfil(j, u || 'u1') : null; }); },
    /* Componer sin abrir la ventana: para el simulador y para pruebas.
       Con o.perfil completo (ver perfilVacio) no lee nada del guardado. */
    componer: function (ruta, u, o) {
      return cargar().then(function (j) { return j ? componer(j, ruta, u, Object.assign({}, o || {})) : null; });
    },
    _prueba: {
      cumple: cumple, dominante: dominante, puntajes: puntajes, hechosDe: hechosDe, palabrasDe: palabrasDe, rellenar: rellenar,
      resumenTrayectoria: resumenTrayectoria, grupoDe: grupoDe,
      // perfil sin guardado: todo en cero y conjuntos vacíos; se completa con lo que se quiera simular
      perfilVacio: function (extra) {
        var P = { temas: 0, temasUnidad: 0, labs: 0, labsUnidad: 0, sellos: 0, eventos: 0, esquirlas: 0, conexiones: 0,
                  voces: 0, adoptadas: 0, respuestas: 0, decisiones: 0, temasRuta: 0, rutaUnidad: 'completa', tema: {}, sello: {}, evento: {}, lab: {},
                  decision: {}, anomalia: false, hecho: {}, palabras: {}, grupoVoces: 0, grupoRespuestas: 0, ronda: 0,
                  misVocesPublicadas: 0, respuestasRecibidas: 0, vidsPropios: {}, _simulado: true };
        Object.keys(extra || {}).forEach(function (k) { P[k] = extra[k]; });
        return P;
      }
    }
  };

  var rutaPrologo = (function () { try { var s = document.currentScript || document.querySelector('script[data-prologo]'); return s && s.getAttribute('data-prologo'); } catch (e) { return null; } })();
  if (rutaPrologo) {
    var lanzar = function () { setTimeout(function () { prologo(rutaPrologo); }, 700); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lanzar); else lanzar();
  }

  ['fisica:nota', 'fisica:fase', 'fisica:ruta'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(revisar, 900); }); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(revisar, 600); });
  else setTimeout(revisar, 600);

  /* ── <eleccion-narrativa unidad="u1" [ruta="lean"] [demo]> ── */
  if (!customElements.get('eleccion-narrativa')) {
    customElements.define('eleccion-narrativa', class extends HTMLElement {
      static get observedAttributes() { return ['unidad', 'ruta', 'demo']; }
      connectedCallback() {
        var self = this;
        // en modo «accion» la caja refleja lo que el alumno va completando
        if (!this._oyente) {
          this._oyente = function () { setTimeout(function () { self._pintar(); }, 50); };
          ['fisica:evento', 'fisica:lab', 'fisica:descubrimiento', 'fisica:nota'].forEach(function (ev) { document.addEventListener(ev, self._oyente); });
        }
        this._pintar();
      }
      disconnectedCallback() {
        var self = this;
        if (this._oyente) ['fisica:evento', 'fisica:lab', 'fisica:descubrimiento', 'fisica:nota'].forEach(function (ev) { document.removeEventListener(ev, self._oyente); });
        this._oyente = null;
      }
      attributeChangedCallback() { if (this.isConnected) this._pintar(); }
      /* Modo «accion»: sin botones. Una invitación en la voz de la ruta y enlaces a las
         actividades opcionales de la nota; no revela qué rasgo corresponde a cada una. */
      _pintarAccion(j, R, I, u, demo) {
        var f = FS(), E = R.estilo, el = I.eleccion;
        var hechas = demo ? [] : opcionesHechas(I, perfil(j, u)).map(function (o) { return o.valor; });
        var cerrada = !demo && f && f.interludioVisto(u);
        var pie = cerrada ? 'La unidad terminó: lo que hiciste ya forma parte de la historia.'
          : hechas.length ? 'Lo que hiciste se leerá al final de la unidad.'
          : (el.pie || 'Son actividades opcionales. Puedes hacer una, las dos o ninguna.');
        this.shadowRoot.innerHTML = '<style>'
          + ':host{display:block;margin:2.2rem 0;}'
          + '.b{background:' + E.fondo + ';color:' + E.tinta + ';padding:22px 24px 20px;border-radius:3px;}'
          + '.k{font-family:"' + E.kicker + '",monospace;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:' + E.acento + ';margin-bottom:12px;}'
          + '.q{font-family:"' + E.cuerpo + '",serif;font-size:18px;line-height:1.5;margin:0 0 14px;font-style:italic;text-wrap:pretty;}'
          + 'ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}'
          + 'li{font-family:"' + E.cuerpo + '",serif;font-size:16.5px;line-height:1.35;border:1px solid ' + E.tenue + ';padding:10px 14px;border-radius:2px;display:flex;justify-content:space-between;gap:12px;align-items:baseline;}'
          + 'li.h{border-color:' + E.acento + ';}'
          + 'a{color:' + E.tinta + ';text-decoration:underline;text-decoration-color:' + E.tenue + ';text-underline-offset:3px;}'
          + 'a:hover{text-decoration-color:' + E.acento + ';}'
          + 'a:focus-visible{outline:2px solid ' + E.acento + ';outline-offset:3px;}'
          + '.ok{font-family:"IBM Plex Mono",monospace;font-size:11px;color:' + E.acento + ';white-space:nowrap;}'
          + '.pie{font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:' + E.tenue + ';margin-top:10px;opacity:.8;}'
          + '</style><div class="b">'
          + '<div class="k">' + esc(R.nombre) + ' · una elección</div>'
          + '<p class="q">' + esc(el.invitacion || el.pregunta || '') + '</p>'
          + '<ul>' + el.opciones.map(function (o) {
              var h = hechas.indexOf(o.valor) !== -1;
              var txt = o.enlace ? '<a href="' + esc(o.enlace) + '">' + esc(o.etiqueta) + '</a>' : '<span>' + esc(o.etiqueta) + '</span>';
              return '<li' + (h ? ' class="h"' : '') + '>' + txt + (h ? '<span class="ok">hecho</span>' : '') + '</li>';
            }).join('') + '</ul>'
          + '<div class="pie">' + esc(pie) + '</div>'
          + '</div>';
      }
      _pintar() {
        var self = this, f = FS();
        var demo = this.hasAttribute('demo');
        var u = this.getAttribute('unidad') || 'u1';
        var ruta = this.getAttribute('ruta') || (f && f.getClase && f.getClase());
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        if ((!demo && modo() !== 'narrativa') || !ruta) { this.shadowRoot.innerHTML = ''; this.style.display = 'none'; return; }
        cargar().then(function (j) {
          var R = j && j.rutas[ruta], I = R && R[u];
          if (!I) { self.shadowRoot.innerHTML = ''; self.style.display = 'none'; return; }
          self.style.display = 'block';
          var E = R.estilo;
          if (esAccion(I)) { self._pintarAccion(j, R, I, u, demo); return; }
          var d = demo ? (self._demo || null) : (f && f.decision(u));
          var sel = d && (d.valor || d);
          var op = sel && I.eleccion.opciones.filter(function (x) { return x.valor === sel; })[0];
          var cerrada = !demo && f && f.interludioVisto(u);
          self.shadowRoot.innerHTML = '<style>'
            + ':host{display:block;margin:2.2rem 0;}'
            + '.b{background:' + E.fondo + ';color:' + E.tinta + ';padding:22px 24px 20px;border-radius:3px;}'
            + '.k{font-family:"' + E.kicker + '",monospace;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:' + E.acento + ';margin-bottom:12px;}'
            + '.q{font-family:"' + E.cuerpo + '",serif;font-size:18px;line-height:1.5;margin:0 0 14px;font-style:italic;text-wrap:pretty;}'
            + '.ops{display:flex;flex-direction:column;gap:8px;}'
            + 'button{font-family:"' + E.cuerpo + '",serif;font-size:16.5px;line-height:1.35;text-align:left;cursor:pointer;background:transparent;color:' + E.tinta + ';border:1px solid ' + E.tenue + ';padding:10px 14px;border-radius:2px;}'
            + 'button:hover{border-color:' + E.acento + ';}'
            + 'button[aria-pressed="true"]{border-color:' + E.acento + ';background:' + E.acento + ';color:' + E.fondo + ';}'
            + 'button:disabled{cursor:default;}'
            + '.eco{font-family:"' + E.cuerpo + '",serif;font-size:16px;line-height:1.55;color:' + E.tenue + ';margin:14px 0 0;}'
            + '.pie{font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:' + E.tenue + ';margin-top:10px;opacity:.8;}'
            + '</style><div class="b">'
            + '<div class="k">' + esc(R.nombre) + ' · una elección</div>'
            + '<p class="q">' + esc(I.eleccion.pregunta) + '</p>'
            + '<div class="ops">' + I.eleccion.opciones.map(function (o) {
                return '<button type="button" data-v="' + esc(o.valor) + '" aria-pressed="' + (o.valor === sel) + '"' + (cerrada ? ' disabled' : '') + '>' + esc(o.etiqueta) + '</button>';
              }).join('') + '</div>'
            + (op ? '<p class="eco">Lo que elijas se leerá al final de la unidad.</p>' : '')
            + '<div class="pie">' + (cerrada ? 'La unidad terminó: esta elección ya forma parte de la historia.' : 'Puedes cambiarla hasta terminar la unidad.') + '</div>'
            + '</div>';
          self.shadowRoot.querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () {
              var v = b.getAttribute('data-v'), o = I.eleccion.opciones.filter(function (x) { return x.valor === v; })[0];
              if (demo) self._demo = v; else if (f) f.decidir(u, v, o.rasgo);
              self._pintar();
            });
          });
        });
      }
    });
  }
})();
