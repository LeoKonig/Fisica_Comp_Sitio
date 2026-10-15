/*
 * ventanas-emergentes.js
 * Física Computacional — disparador y contenedor de las ventanas emergentes
 * (La Hoguera / El Comerciante / Evento).
 *
 * POLÍTICA: pausas elegidas, no impuestas. Por defecto ninguna ventana
 * interrumpe la navegación: cuando toca un descanso, un acertijo o el
 * comerciante se deja un aviso discreto (píldora abajo a la derecha) que el
 * alumno abre cuando quiere o descarta con «×». El aviso vive en
 * sessionStorage, así que sobrevive al cambio de página.
 *
 * PREFERENCIAS DEL ALUMNO (botón ⚙ en los avisos y en cada ventana, o
 * window.VentanasEmergentes.preferencias() desde un enlace del menú): cada
 * alumno elige, por separado para La Hoguera, el acertijo y El Comerciante,
 * si aparece como aviso o como ventana sobre la pantalla; cada cuánto se le
 * ofrece el descanso (por minutos o por notas) y la frecuencia del sorteo.
 * Se guardan en localStorage ('ve_prefs'). Los valores de «Configuración
 * editable» son solo los valores por defecto.
 *
 * La probabilidad vive AQUÍ, en el disparador — no en hoguera.qmd ni en
 * comerciante.qmd, que siguen existiendo tal cual (accesibles desde el menú).
 *
 * El router de _quarto.yml llama a window.VentanasEmergentes.intentar(href)
 * antes de navegar. Devuelve false (el router navega) salvo cuando el alumno
 * eligió «ventana» para lo que toca en ese clic: entonces abre la ventana y
 * devuelve true, como en la versión original. El router no necesita cambios.
 *
 * El estilo (glow, botones, insignias) usa la paleta de la ruta elegida por
 * el alumno (window.DESCUBRIMIENTOS.rutas · fisica-save.js getClase()), así
 * que cada lenguaje ve las ventanas emergentes en su propio color. Cuando
 * temas-descanso.js define un reskin completo para la ruta activa (copy +
 * mercancía, ver Haskell/Idris/Agda/ATS/Mercury), La Hoguera y El Comerciante
 * también lo usan aquí; si no hay reskin (Racket), cae al copy original de
 * abajo.
 *
 * Ajusta la configuración de abajo a mano.
 */
(function () {

  /* ── Configuración editable ──────────────────────────────────────────── */

  // La Hoguera NO es aleatoria: se ofrece (con un aviso) programada, por bienestar.
  var HOGUERA_MODO   = 'tiempo'; // 'tiempo' | 'notas'
  var HOGUERA_MIN    = 1;        // (modo 'tiempo') se ofrece si pasaron >= N minutos reales desde el último descanso,
                                  //                 el último aviso atendido o el inicio de la sesión (lo más reciente)
  var HOGUERA_CADA_N = 4;         // (modo 'notas')  se ofrece cada N notas visitadas en la sesión de la pestaña

  // El Comerciante y el Evento sí son un sorteo por clic (el premio es un aviso, no una ventana).
  var COMERCIANTE_PROB = 8;   // % de probabilidad por clic
  var EVENTO_PROB      = 15;  // % de probabilidad por clic
  var COOLDOWN_SESSION = true; // máx. 1 Comerciante/Evento por sesión de pestaña

  // Preferencias del alumno (panel ⚙). Todo lo de arriba son los valores por defecto.
  var PREFERENCIAS_ALUMNO = true; // false = el alumno no puede cambiar nada
  var MODO_DEFECTO = { hoguera: 'aviso', evento: 'aviso', comerciante: 'aviso' }; // 'aviso' | 'ventana'
  var OPCIONES_MIN   = [15, 25, 40, 60]; // minutos que puede elegir (modo 'tiempo')
  var OPCIONES_NOTAS = [2, 4, 6, 8];     // notas que puede elegir (modo 'notas')
  var FRECUENCIAS = { poca: 0.5, normal: 1, mucha: 2 }; // multiplica COMERCIANTE_PROB y EVENTO_PROB

  /* ── Mercancía de El Comerciante (copia de comerciante.qmd) ──────────── */
  var WARES = [
    { id: 'colemak', cat: 'Arma · Legendaria', glyph: '\u2328', costo: 60, name: 'La Disposición Colemak-DH', real: 'Cambiar de QWERTY a Colemak-DH' },
    { id: 'split', cat: 'Armadura · Pesada', glyph: '\u2453', costo: 55, name: 'El Teclado Partido', real: 'Teclado split / columnar' },
    { id: 'modal', cat: 'Arma · Ágil', glyph: '\u2756', costo: 45, name: 'La Edición Modal', real: 'Vim / movimiento por teclado' },
    { id: 'tiling', cat: 'Reliquia · Arcana', glyph: '\u25f0', costo: 40, name: 'El Gestor de Mosaicos', real: 'Tiling WM / atajos de ventanas' },
    { id: 'reposa', cat: 'Armadura · Ligera', glyph: '\u2334', costo: 25, name: 'El Reposamuñecas', real: 'Soporte de muñeca neutro' },
    { id: 'pie', cat: 'Armadura · Encantada', glyph: '\u2191', costo: 50, name: 'El Escritorio Erguido', real: 'Escritorio de pie / alternar postura' },
    { id: 'flux', cat: 'Talismán · Nocturno', glyph: '\u263E', costo: 20, name: 'El Talismán Ámbar', real: 'Filtro de luz cálida (f.lux / Night Shift)' },
    { id: 'pomodoro', cat: 'Talismán · Temporal', glyph: '\u25d4', costo: 15, name: 'El Reloj de Arena', real: 'Técnica Pomodoro (25 + 5)' }
  ];

  var BREATH = [
    { name: 'Inhala', dur: 4 }, { name: 'Sostén', dur: 4 },
    { name: 'Exhala', dur: 4 }, { name: 'Sostén', dur: 4 }
  ];

  /* ── Utilidades ───────────────────────────────────────────────────────── */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }

  function claseActual() {
    return (window.FisicaSave && window.FisicaSave.getClase()) || 'mercury';
  }
  function claseActual() {
    return (window.FisicaSave && window.FisicaSave.getClase()) || 'mercury';
  }
  /* Rutas que este archivo sabe pintar aunque los demás aún no las definan.
   * Solo se usan si window.DESCUBRIMIENTOS.rutas / window.TEMAS_DESCANSO no
   * traen la ruta: en cuanto existan allá, mandan aquellos.
   * Lean — ficción histórica: La Hoguera es «La Celda», El Comerciante es
   * «La Biblioteca». Colores de [data-lang="lean"]:
   *   color = --lang-accent, tint = --lang-primary-light, deep = --lang-primary */
  var RUTAS_LOCALES = {
    lean: { color: '#B08A1E', tint: '#D4B44E', deep: '#1F1B14' }
  };
  var TEMAS_LOCALES = {
    lean: {
      hoguera: {
        title: 'La Celda',
        heroSubtitle: 'Deja la pluma. Levántate del pupitre un momento — llevas un rato entre demostraciones.',
        breath: { sectionTitle: 'Respira', startLabel: 'Comenzar a respirar' }
      },
      comerciante: {
        kicker: 'Entre los anaqueles',
        title: 'La Biblioteca',
        currencyLabel: 'esquirlas',
        // Mismos id y costo que WARES (el inventario es compartido); solo cambia el nombre.
        wares: [
          { id: 'colemak', glyph: '⌨', costo: 60, name: 'Tratado de la Disposición Colemak-DH', real: 'Cambiar de QWERTY a Colemak-DH' },
          { id: 'split', glyph: '⑓', costo: 55, name: 'Códice del Teclado Partido', real: 'Teclado split / columnar' },
          { id: 'modal', glyph: '❖', costo: 45, name: 'Arte de la Edición Modal', real: 'Vim / movimiento por teclado' },
          { id: 'tiling', glyph: '◰', costo: 40, name: 'Atlas de los Mosaicos', real: 'Tiling WM / atajos de ventanas' },
          { id: 'reposa', glyph: '⌴', costo: 25, name: 'El Reposamuñecas del Copista', real: 'Soporte de muñeca neutro' },
          { id: 'pie', glyph: '↑', costo: 50, name: 'El Pupitre Erguido', real: 'Escritorio de pie / alternar postura' },
          { id: 'flux', glyph: '☾', costo: 20, name: 'La Vela Ámbar', real: 'Filtro de luz cálida (f.lux / Night Shift)' },
          { id: 'pomodoro', glyph: '◔', costo: 15, name: 'El Reloj de Arena', real: 'Técnica Pomodoro (25 + 5)' }
        ]
      }
    }
  };
  function rutaPalette() {
    var rt = (window.DESCUBRIMIENTOS && window.DESCUBRIMIENTOS.rutas) || {};
    var clase = claseActual();
    return rt[clase] || RUTAS_LOCALES[clase] || rt.mercury || { name: 'El Mensajero', glyph: '\u263F', color: '#A8780C', tint: '#F6ECD4', deep: '#6F4E08' };
  }
  function temaDescanso(clase) {
    var temas = window.TEMAS_DESCANSO || {};
    return temas[clase] || TEMAS_LOCALES[clase] || null;
  }
  // Cada ruta (incluida Racket) tiene ahora identidad visual propia — ver
  // TEMAS_VISUALES más abajo — así que La Hoguera/El Comerciante siempre usan
  // el color real de la ruta del alumno, tenga o no reskin de copy en
  // temas-descanso.js.
  function paletteForDescanso(tipo, clase) {
    return rutaPalette();
  }

  /* ── Identidad visual por lenguaje ────────────────────────────────────
   * Cada ruta tiene su propio mundo (ver narrativa del curso): torre de
   * fantasía oscura (Racket), nave de space opera (Haskell), androide
   * cyberpunk (Idris), observatorio de horror cósmico (Agda), refugio
   * postapocalíptico (ATS), despacho detectivesco/steampunk (Mercury) y
   * celda y biblioteca de ficción histórica, a la luz de una vela (Lean).
   * Esto NO toca el copy (temas-descanso.js) — solo el fondo, el ícono
   * central de La Hoguera y el tratamiento de las tarjetas de El
   * Comerciante/Evento, para que cada mundo se sienta distinto.
   */
  var WORLD_TONE = {
    racket:   { mid: '#241A3C', dark: '#150F24' },
    haskell:  { mid: '#122B29', dark: '#0A1917' },
    idris:    { mid: '#2B1812', dark: '#180B08' },
    agda:     { mid: '#0F1D2E', dark: '#080D16' },
    ats:      { mid: '#221F1B', dark: '#141311' },
    mercury:  { mid: '#251C10', dark: '#160F08' },
    lean:     { mid: '#1A1610', dark: '#0F0D09' },
    default:  { mid: '#26221D', dark: '#1C1916' }
  };
  var WORLD_TEXTURE = {
    haskell: 'radial-gradient(1px 1px at 18% 28%, rgba(255,255,255,.45), transparent 60%),' +
      'radial-gradient(1px 1px at 72% 62%, rgba(255,255,255,.35), transparent 60%),' +
      'radial-gradient(1px 1px at 42% 82%, rgba(255,255,255,.25), transparent 60%),' +
      'radial-gradient(1px 1px at 86% 22%, rgba(255,255,255,.3), transparent 60%),' +
      'radial-gradient(1px 1px at 30% 55%, rgba(255,255,255,.2), transparent 60%),',
    idris: 'repeating-linear-gradient(135deg, rgba(240,153,123,.05) 0px, rgba(240,153,123,.05) 2px, transparent 2px, transparent 11px),',
    agda: 'repeating-linear-gradient(0deg, rgba(133,183,235,.05) 0px, rgba(133,183,235,.05) 1px, transparent 1px, transparent 4px),',
    ats: 'repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0px, rgba(255,255,255,.025) 2px, transparent 2px, transparent 13px),',
    // luz de vela desde arriba + pautado de manuscrito
    lean: 'radial-gradient(60% 46% at 50% 0%, rgba(212,180,78,.13), transparent 72%),' +
      'repeating-linear-gradient(0deg, rgba(176,138,30,.05) 0px, rgba(176,138,30,.05) 1px, transparent 1px, transparent 28px),',
    mercury: 'repeating-linear-gradient(0deg, rgba(224,184,92,.03) 0px, transparent 1px, transparent 30px),' +
      'repeating-linear-gradient(90deg, rgba(224,184,92,.03) 0px, transparent 1px, transparent 30px),'
  };
  function worldBg(clase, focal) {
    var t = WORLD_TONE[clase] || WORLD_TONE.default;
    var tex = WORLD_TEXTURE[clase] || '';
    return function (R) {
      return 'background:' + tex + 'radial-gradient(130% 100% at 50% ' + focal + ',' + R.deep + ' 0%,' + t.mid + ' 46%,' + t.dark + ' 100%);';
    };
  }

  /* Ícono central de La Hoguera — un mundo distinto por lenguaje. */
  function motifHoguera(clase, R) {
    switch (clase) {
      case 'haskell':
        return '<div style="position:relative;width:150px;height:150px;margin:0 auto 20px;">' +
          '<div style="position:absolute;top:14px;right:14px;bottom:14px;left:14px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:radial-gradient(circle at 50% 40%,' + R.tint + ' 0%,' + R.color + ' 45%,' + R.deep + ' 80%,transparent 100%);box-shadow:0 0 60px 6px ' + R.color + '55;animation:ve-flicker 3.4s ease-in-out infinite;"></div>' +
          '<div style="position:absolute;left:50%;top:50%;width:112px;height:44px;margin:-22px 0 0 -56px;border:1px solid ' + R.color + '88;border-radius:50%;transform:rotate(20deg);animation:ve-rotate 13s linear infinite;"></div>' +
          '<div style="position:absolute;left:50%;top:50%;width:82px;height:82px;margin:-41px 0 0 -41px;border:1px dashed ' + R.color + '55;border-radius:50%;animation:ve-rotate-rev 21s linear infinite;"></div>' +
          '</div>';
      case 'idris':
        return '<div style="position:relative;width:140px;height:140px;margin:0 auto 20px;">' +
          '<div style="position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:conic-gradient(from 0deg,' + R.color + ' 0deg 16deg,transparent 16deg 40deg,' + R.color + ' 40deg 56deg,transparent 56deg 80deg,' + R.color + ' 80deg 96deg,transparent 96deg 120deg,' + R.color + ' 120deg 136deg,transparent 136deg 160deg,' + R.color + ' 160deg 176deg,transparent 176deg 200deg,' + R.color + ' 200deg 216deg,transparent 216deg 240deg,' + R.color + ' 240deg 256deg,transparent 256deg 280deg,' + R.color + ' 280deg 296deg,transparent 296deg 320deg,' + R.color + ' 320deg 336deg,transparent 336deg 360deg);opacity:.6;animation:ve-rotate 6.5s linear infinite;"></div>' +
          '<div style="position:absolute;top:24px;right:24px;bottom:24px;left:24px;border-radius:50%;background:radial-gradient(circle,' + R.tint + ' 0%,' + R.color + ' 45%,' + R.deep + ' 80%,transparent 100%);box-shadow:0 0 70px 12px ' + R.color + '66;animation:ve-flicker 2.4s ease-in-out infinite;"></div>' +
          '</div>';
      case 'agda': {
        var hs = [22, 40, 30, 55, 38, 64, 28, 46, 34];
        var bars = '';
        for (var i = 0; i < hs.length; i++) {
          bars += '<div style="width:7px;height:' + hs[i] + 'px;background:' + R.color + ';opacity:.85;border-radius:2px 2px 0 0;transform-origin:bottom;animation:ve-bar ' + (1.6 + (i % 3) * 0.3) + 's ease-in-out infinite;animation-delay:' + (i * 0.12) + 's;"></div>';
        }
        return '<div style="position:relative;width:160px;height:110px;margin:0 auto 20px;border-radius:8px;background:#05070C;border:2px solid ' + R.color + '99;box-shadow:0 0 40px 4px ' + R.color + '44, inset 0 0 20px rgba(0,0,0,.6);overflow:hidden;">' +
          '<div style="position:absolute;top:0;right:0;bottom:0;left:0;background:repeating-linear-gradient(0deg,' + R.color + '22 0px,' + R.color + '22 1px,transparent 1px,transparent 4px);"></div>' +
          '<div style="position:absolute;left:14px;right:14px;bottom:14px;top:14px;display:flex;align-items:flex-end;gap:5px;justify-content:center;">' + bars + '</div>' +
          '</div>';
      }
      case 'ats':
        return '<div style="position:relative;width:140px;height:140px;margin:0 auto 20px;">' +
          '<div style="position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:repeating-conic-gradient(' + R.color + '99 0deg 2deg, transparent 2deg 12deg);"></div>' +
          '<div style="position:absolute;top:14px;right:14px;bottom:14px;left:14px;border-radius:50%;background:radial-gradient(circle,#3A3A38 0%,#201F1D 70%,#141311 100%);border:2px solid ' + R.deep + ';box-shadow:inset 0 0 20px rgba(0,0,0,.6);"></div>' +
          '<div style="position:absolute;left:50%;top:50%;width:4px;height:44px;margin:-44px 0 0 -2px;background:' + R.color + ';transform-origin:bottom center;transform:rotate(35deg);border-radius:2px;box-shadow:0 0 10px ' + R.color + 'aa;"></div>' +
          '<div style="position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:' + R.deep + ';border:2px solid ' + R.color + ';"></div>' +
          '</div>';
      case 'mercury':
        return '<div style="position:relative;width:140px;height:140px;margin:0 auto 20px;">' +
          '<div style="position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:radial-gradient(circle,' + R.tint + ' 0%,' + R.color + ' 45%,' + R.deep + ' 78%,transparent 84%);box-shadow:0 0 70px 10px ' + R.color + '55;animation:ve-flicker 3.6s ease-in-out infinite;"></div>' +
          '<div style="position:absolute;top:10px;right:10px;bottom:10px;left:10px;border-radius:50%;background:repeating-conic-gradient(' + R.deep + ' 0deg 1.5deg, transparent 1.5deg 30deg);opacity:.7;"></div>' +
          '<div style="position:absolute;left:50%;top:50%;width:3px;height:50px;margin:-50px 0 0 -1.5px;background:linear-gradient(180deg,' + R.deep + ',transparent);transform-origin:bottom center;transform:rotate(-25deg);animation:ve-rotate 34s linear infinite;"></div>' +
          '</div>';
      case 'lean': // la vela de la celda
        return '<div style="position:relative;width:140px;height:140px;margin:0 auto 20px;">' +
          '<div style="position:absolute;left:50%;top:-6px;width:112px;height:112px;margin-left:-56px;border-radius:50%;background:radial-gradient(circle,' + R.color + '66 0%,' + R.color + '22 40%,transparent 70%);animation:ve-flicker 3.1s ease-in-out infinite;"></div>' +
          '<div style="position:absolute;left:50%;top:20px;width:26px;height:46px;margin-left:-13px;border-radius:50% 50% 50% 50% / 64% 64% 36% 36%;background:linear-gradient(180deg,' + R.color + ' 0%,' + R.tint + ' 50%,#FFF4D6 100%);box-shadow:0 0 26px 6px ' + R.color + '88;transform-origin:50% 100%;animation:ve-flicker 2.2s ease-in-out infinite;"></div>' +
          '<div style="position:absolute;left:50%;top:64px;width:2px;height:8px;margin-left:-1px;background:#2A2318;"></div>' +
          '<div style="position:absolute;left:50%;top:70px;width:30px;height:52px;margin-left:-15px;border-radius:3px 3px 2px 2px;background:linear-gradient(90deg,#B9AC8C 0%,#F2E8CF 45%,#CFC3A4 100%);"></div>' +
          '<div style="position:absolute;left:50%;top:121px;width:78px;height:8px;margin-left:-39px;border-radius:4px;background:linear-gradient(180deg,' + R.color + ',#6B5412);"></div>' +
          '</div>';
      default: // racket / sin ruta reconocida — cristal de grimorio
        return '<div style="position:relative;width:140px;height:140px;margin:0 auto 20px;">' +
          '<div style="position:absolute;top:8px;right:8px;bottom:8px;left:8px;border:1px dashed ' + R.color + '55;border-radius:50%;animation:ve-rotate 18s linear infinite;"></div>' +
          '<div style="position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:radial-gradient(circle,' + R.tint + ' 0%,' + R.color + ' 40%,' + R.deep + ' 70%,transparent 78%);box-shadow:0 0 80px 10px ' + R.color + '55;animation:ve-flicker 3.2s ease-in-out infinite;"></div>' +
          '<div style="position:absolute;left:50%;top:50%;width:26px;height:26px;transform:translate(-50%,-50%) rotate(45deg);background:' + R.tint + ';box-shadow:0 0 22px 6px ' + R.color + 'aa;"></div>' +
          '</div>';
    }
  }

  /* Tratamiento de tarjeta de El Comerciante — un material por mundo. */
  function wareDecor(clase, R, owned) {
    var baseBg = owned ? 'rgba(140,165,110,.10)' : 'rgba(237,230,214,.035)';
    var baseBorder = owned ? 'rgba(160,190,120,.45)' : 'rgba(237,230,214,.13)';
    if (owned) return { background: baseBg, border: '1px solid ' + baseBorder, corners: '' };
    switch (clase) {
      case 'haskell':
        return {
          background: 'linear-gradient(135deg, rgba(15,110,86,.09), rgba(15,110,86,.02))',
          border: '1px solid ' + R.color + '55',
          corners: '<div style="position:absolute;left:6px;top:6px;width:9px;height:9px;border-top:2px solid ' + R.color + ';border-left:2px solid ' + R.color + ';"></div>' +
            '<div style="position:absolute;right:6px;bottom:6px;width:9px;height:9px;border-bottom:2px solid ' + R.color + ';border-right:2px solid ' + R.color + ';"></div>'
        };
      case 'idris':
        return {
          background: 'linear-gradient(90deg, rgba(153,60,29,.14), rgba(153,60,29,.02) 65%)',
          border: '1px solid rgba(237,230,214,.13)',
          corners: '<div style="position:absolute;left:0;top:8px;bottom:8px;width:3px;background:' + R.color + ';box-shadow:0 0 8px ' + R.color + 'aa;"></div>'
        };
      case 'agda':
        return {
          background: '#0B0E15',
          border: '1px dashed ' + R.color + '77',
          corners: ''
        };
      case 'ats':
        return {
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 6px, rgba(0,0,0,.08) 6px 12px)',
          border: '1px solid ' + R.deep,
          corners: ['6px 6px', '6px auto', 'auto 6px', 'auto auto'].map(function (pos, i) {
            var side = i === 0 ? 'left:6px;top:6px;' : i === 1 ? 'right:6px;top:6px;' : i === 2 ? 'left:6px;bottom:6px;' : 'right:6px;bottom:6px;';
            return '<div style="position:absolute;' + side + 'width:6px;height:6px;border-radius:50%;background:' + R.deep + ';border:1px solid ' + R.color + '88;"></div>';
          }).join('')
        };
      case 'mercury':
        return {
          background: 'linear-gradient(135deg, rgba(168,120,12,.09), rgba(168,120,12,.015))',
          border: '1px solid ' + R.color + '55',
          corners: '<div style="position:absolute;left:6px;top:6px;width:9px;height:9px;border-top:2px solid ' + R.color + ';border-left:2px solid ' + R.color + ';"></div>' +
            '<div style="position:absolute;right:6px;top:6px;width:9px;height:9px;border-top:2px solid ' + R.color + ';border-right:2px solid ' + R.color + ';"></div>'
        };
      case 'lean': // lomo de libro: --lang-bg-subtle y --lang-border
        return {
          background: 'rgba(176,138,30,.08)',
          border: '1px solid rgba(176,138,30,.28)',
          corners: '<div style="position:absolute;left:5px;top:0;bottom:0;width:1px;background:' + R.color + '99;"></div>' +
            '<div style="position:absolute;left:8px;top:0;bottom:0;width:1px;background:' + R.color + '55;"></div>'
        };
      default:
        return { background: baseBg, border: '1px solid ' + baseBorder, corners: '' };
    }
  }

  /* Ícono de la ventana de Evento — mismo tratamiento circular de antes,
   * pero con el glifo y anillo tintados al mundo del alumno. */
  function evtIcon(clase, R) {
    var glyph = ({ haskell: '\u2B21', idris: '\u2756', agda: '\u2248', ats: '\u2699', mercury: '\ud83d\udd0d', lean: '\u2767' })[clase] || '\u2756';
    return '<div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:' + R.deep + ';border:1.5px solid ' + R.color + ';display:flex;align-items:center;justify-content:center;font-size:28px;color:' + R.tint + ';box-shadow:0 0 40px 4px ' + R.color + '33;">' + glyph + '</div>';
  }

  function ensureStyles() {
    if (document.getElementById('ve-styles')) return;
    var st = document.createElement('style');
    st.id = 've-styles';
    st.textContent =
      '@keyframes ve-flicker{0%,100%{opacity:.92;transform:scale(1);}50%{opacity:.85;transform:scale(.98);}}' +
      '@keyframes ve-fadein{from{opacity:0;}to{opacity:1;}}' +
      '@keyframes ve-popin{from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);}}' +
      '@keyframes ve-rotate{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}' +
      '@keyframes ve-rotate-rev{from{transform:rotate(360deg);}to{transform:rotate(0deg);}}' +
      '@keyframes ve-bar{0%,100%{transform:scaleY(.45);}50%{transform:scaleY(1);}}';
    document.head.appendChild(st);
  }

  function currentTema() {
    return window.QUEST_TEMA || null;
  }
  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ── Preferencias del alumno ─────────────────────────────────────────── */
  var PREFS_KEY = 've_prefs';
  var TIPOS = ['hoguera', 'evento', 'comerciante'];
  function prefsDefecto() {
    return {
      modo: { hoguera: MODO_DEFECTO.hoguera, evento: MODO_DEFECTO.evento, comerciante: MODO_DEFECTO.comerciante },
      hogueraModo: HOGUERA_MODO, hogueraMin: HOGUERA_MIN, hogueraNotas: HOGUERA_CADA_N,
      frecuencia: 'normal'
    };
  }
  function leerPrefs() {
    var d = prefsDefecto();
    if (!PREFERENCIAS_ALUMNO) return d;
    var g = null;
    try { g = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); } catch (e) { g = null; }
    if (!g || typeof g !== 'object') return d;
    TIPOS.forEach(function (t) {
      if (g.modo && (g.modo[t] === 'aviso' || g.modo[t] === 'ventana')) d.modo[t] = g.modo[t];
    });
    if (g.hogueraModo === 'tiempo' || g.hogueraModo === 'notas') d.hogueraModo = g.hogueraModo;
    if (typeof g.hogueraMin === 'number' && g.hogueraMin >= 1 && g.hogueraMin <= 240) d.hogueraMin = g.hogueraMin;
    if (typeof g.hogueraNotas === 'number' && g.hogueraNotas >= 1 && g.hogueraNotas <= 50) d.hogueraNotas = Math.round(g.hogueraNotas);
    if (FRECUENCIAS[g.frecuencia]) d.frecuencia = g.frecuencia;
    return d;
  }
  function guardarPrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* modo privado: no se guarda */ }
  }
  function cambiarPref(grupo, valor) {
    var P = leerPrefs();
    var ritmo = false;
    if (grupo.indexOf('modo-') === 0) P.modo[grupo.slice(5)] = valor;
    else if (grupo === 'hmodo') { P.hogueraModo = valor; ritmo = true; }
    else if (grupo === 'hmin') { P.hogueraMin = parseInt(valor, 10); ritmo = true; }
    else if (grupo === 'hnotas') { P.hogueraNotas = parseInt(valor, 10); ritmo = true; }
    else if (grupo === 'frec') P.frecuencia = valor;
    guardarPrefs(P);
    if (ritmo) { // el nuevo ritmo empieza a contar desde ahora
      markHogueraOfrecida();
      sessionStorage.setItem('ve_notas', '0');
    }
    renderInner();
    var inner = document.getElementById('ve-inner');
    var b = inner && inner.querySelector('.ve-seg[data-g="' + grupo + '"][data-v="' + valor + '"]');
    if (b) b.focus();
  }
  function abrirPrefs() {
    if (!PREFERENCIAS_ALUMNO) return;
    // Si había un acertijo abierto sin resolver, se queda como aviso para no perderlo.
    if (S.tipo === 'evento' && S.ev && !S.evtSolved) ponerPendiente('evento', S.ev.id);
    cerrar();
    abrir('prefs');
  }

  /* ── Disparo de La Hoguera (programado) ──────────────────────────────── */
  // Inicio de la sesión de la pestaña: sirve de piso para el reloj, así el
  // aviso no aparece en el primer clic solo porque el último descanso fue ayer.
  function sesionInicio() {
    var t = parseInt(sessionStorage.getItem('ve_sesion_inicio') || '0', 10);
    if (!t) { t = Date.now(); sessionStorage.setItem('ve_sesion_inicio', String(t)); }
    return t;
  }
  // esClic = true cuando viene de intentar() (un clic de navegación); false
  // cuando viene del reloj o de la carga de página. El modo 'notas' solo
  // cuenta clics.
  function shouldOfferHoguera(esClic) {
    if (!window.FisicaSave) return false;
    var P = leerPrefs();
    if (P.hogueraModo === 'notas') {
      if (!esClic) return false;
      var n = parseInt(sessionStorage.getItem('ve_notas') || '0', 10) + 1;
      if (n >= P.hogueraNotas) { sessionStorage.setItem('ve_notas', '0'); return true; }
      sessionStorage.setItem('ve_notas', String(n));
      return false;
    }
    var ultima = window.FisicaSave.ultimaHoguera() || 0;
    var snooze = parseInt(sessionStorage.getItem('ve_hoguera_snooze') || '0', 10);
    var ultimoContacto = Math.max(ultima, snooze, sesionInicio());
    return (Date.now() - ultimoContacto) / 60000 >= P.hogueraMin;
  }
  // Reinicia el reloj: se llama cuando el alumno abre o descarta el aviso.
  function markHogueraOfrecida() {
    sessionStorage.setItem('ve_hoguera_snooze', String(Date.now()));
  }
  // Devuelve true solo si abrió la ventana (el alumno eligió «ventana»).
  function ofrecerHogueraSiToca(esClic) {
    var ventana = leerPrefs().modo.hoguera === 'ventana';
    if (ventana && !esClic) {
      // Se abre sola cuando se cumple el plazo, pero espera si la pestaña no
      // está a la vista, si ya hay otra ventana abierta o si el alumno está
      // escribiendo (no se le cruza a media línea de código).
      var a = document.activeElement;
      var escribiendo = !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName || '') || a.isContentEditable);
      if (document.hidden || document.getElementById('ve-overlay') || escribiendo) return false;
    }
    if (!shouldOfferHoguera(esClic)) return false; // en modo 'notas' esto además cuenta el clic
    if (ventana) {
      markHogueraOfrecida();
      quitarPendiente('hoguera');
      abrir('hoguera');
      return true;
    }
    if (!leerPendientes().hoguera) ponerPendiente('hoguera', 1);
    return false;
  }

  /* ── Sorteo de Comerciante / Evento ───────────────────────────────────── */
  function rollComercianteEvento() {
    if (COOLDOWN_SESSION && sessionStorage.getItem('ve_usada') === '1') return null;
    var r = Math.random() * 100;
    var m = FRECUENCIAS[leerPrefs().frecuencia] || 1;
    if (r < COMERCIANTE_PROB * m) return 'comerciante';
    if (r < (COMERCIANTE_PROB + EVENTO_PROB) * m) return 'evento';
    return null;
  }
  function marcarUsadaSesion() {
    if (COOLDOWN_SESSION) sessionStorage.setItem('ve_usada', '1');
  }

  function pickEvento(tema) {
    var pool = (window.EVENTOS && window.EVENTOS.pool) || [];
    if (!pool.length) return null;
    var noResuelto = function (e) { return !window.FisicaSave || !window.FisicaSave.eventoResuelto(e.id); };
    var contextual = tema ? pool.filter(function (e) { return e.tema === tema; }) : [];
    var candidatos = contextual.filter(noResuelto);
    if (!candidatos.length) candidatos = contextual;
    if (!candidatos.length) candidatos = pool.filter(noResuelto);
    if (!candidatos.length) candidatos = pool;
    return candidatos[Math.floor(Math.random() * candidatos.length)];
  }
  function buscarEvento(id) {
    var pool = (window.EVENTOS && window.EVENTOS.pool) || [];
    return pool.filter(function (e) { return e.id === id; })[0] || null;
  }

  /* ── Avisos discretos (lo pendiente) ──────────────────────────────────
   * Lo pendiente se guarda en sessionStorage como
   *   { hoguera: 1, evento: <id del evento>, comerciante: 1 }
   * y se pinta como píldoras abajo a la derecha. Cada píldora tiene dos
   * botones: abrir (el texto) y descartar («×»). Nada se abre solo.
   */
  var PEND_KEY = 've_pendientes';
  function leerPendientes() {
    try { return JSON.parse(sessionStorage.getItem(PEND_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function guardarPendientes(p) { sessionStorage.setItem(PEND_KEY, JSON.stringify(p)); }
  function ponerPendiente(tipo, valor) {
    var p = leerPendientes();
    p[tipo] = valor;
    guardarPendientes(p);
    renderAvisos();
  }
  function quitarPendiente(tipo) {
    var p = leerPendientes();
    if (!(tipo in p)) return;
    delete p[tipo];
    guardarPendientes(p);
    renderAvisos();
  }

  function textoAviso(tipo, clase) {
    var tema = temaDescanso(clase);
    if (tipo === 'hoguera') {
      var H = tema && tema.hoguera;
      return { glyph: '\u27E1', texto: (H ? H.title : 'La Hoguera') + ' · descansa cuando quieras' };
    }
    if (tipo === 'comerciante') {
      var C = tema && tema.comerciante;
      return { glyph: '\u25C8', texto: (C ? C.title : 'El Comerciante') + ' · pasa cuando quieras' };
    }
    return { glyph: '\u2756', texto: 'Hay un acertijo esperando' };
  }

  function renderAvisos() {
    if (!document.body) return;
    var p = leerPendientes();
    var tipos = ['hoguera', 'evento', 'comerciante'].filter(function (t) { return p[t]; });
    var cont = document.getElementById('ve-avisos');
    if (!tipos.length) {
      if (cont) cont.parentNode.removeChild(cont);
      return;
    }
    ensureStyles();
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 've-avisos';
      cont.setAttribute('role', 'status');
      cont.setAttribute('aria-live', 'polite');
      cont.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999990;display:flex;flex-direction:column;gap:8px;align-items:flex-end;max-width:calc(100vw - 32px);';
      document.body.appendChild(cont);
    }
    var clase = claseActual();
    var R = rutaPalette();
    var html = '';
    tipos.forEach(function (tipo) {
      var a = textoAviso(tipo, clase);
      html += '' +
        '<div style="display:flex;align-items:center;max-width:100%;background:#1C1916;border:1px solid ' + R.color + '66;border-radius:999px;box-shadow:0 6px 20px -8px rgba(0,0,0,.5);animation:ve-fadein .3s ease;">' +
        '<button class="ve-aviso-abrir" data-tipo="' + tipo + '" style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;letter-spacing:.02em;color:#EFE3CE;background:transparent;border:none;border-radius:999px 0 0 999px;padding:9px 6px 9px 14px;cursor:pointer;text-align:left;">' +
        '<span aria-hidden="true" style="color:' + R.color + ';margin-right:8px;">' + a.glyph + '</span>' + esc(a.texto) +
        '</button>' +
        '<button class="ve-aviso-cerrar" data-tipo="' + tipo + '" aria-label="Descartar aviso" title="Ahora no" style="font-size:16px;line-height:1;color:#9C8F76;background:transparent;border:none;border-radius:0 999px 999px 0;padding:8px 12px 8px 6px;cursor:pointer;">×</button>' +
        '</div>';
    });
    if (PREFERENCIAS_ALUMNO) {
      html += '<button id="ve-aviso-prefs" aria-label="Preferencias de pausas y avisos" style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#9C8F76;background:#1C1916;border:1px solid rgba(239,227,206,.18);border-radius:999px;padding:5px 11px;cursor:pointer;">⚙ ajustar</button>';
    }
    cont.innerHTML = html;
    var ajustes = cont.querySelector('#ve-aviso-prefs');
    if (ajustes) ajustes.onclick = abrirPrefs;
    cont.querySelectorAll('.ve-aviso-abrir').forEach(function (b) {
      b.onclick = function () { abrirPendiente(b.getAttribute('data-tipo')); };
    });
    cont.querySelectorAll('.ve-aviso-cerrar').forEach(function (b) {
      b.onclick = function () { descartarAviso(b.getAttribute('data-tipo')); };
    });
  }

  function descartarAviso(tipo) {
    if (tipo === 'hoguera') markHogueraOfrecida(); // «ahora no»: vuelve a ofrecerse en HOGUERA_MIN
    quitarPendiente(tipo);
  }

  function abrirPendiente(tipo) {
    if (tipo === 'evento') {
      var id = leerPendientes().evento;
      var ev = buscarEvento(id);
      if (!ev) {
        // El acertijo guardado no está disponible en esta página: se elige otro.
        ev = pickEvento(currentTema());
        if (!ev) { quitarPendiente('evento'); return; }
        ponerPendiente('evento', ev.id);
      }
      // El aviso se queda hasta que el acertijo se resuelva o se descarte:
      // cerrar la ventana sin responder no lo pierde.
      abrir('evento', ev);
      return;
    }
    if (tipo === 'hoguera') markHogueraOfrecida();
    quitarPendiente(tipo);
    abrir(tipo);
  }

  /* ── Estado del overlay activo ────────────────────────────────────────── */
  var S = { tipo: null, ev: null, breathRun: false, breathPhase: 0, breathSecs: 4, breathCycle: 0, evtAnswer: '', evtWrong: false, evtShowHint: false, evtSolved: null };
  var breathTimer = null;

  function cerrar() {
    clearInterval(breathTimer);
    var ov = document.getElementById('ve-overlay');
    if (ov) ov.parentNode.removeChild(ov);
    S = { tipo: null, ev: null, breathRun: false, breathPhase: 0, breathSecs: 4, breathCycle: 0, evtAnswer: '', evtWrong: false, evtShowHint: false, evtSolved: null };
    document.removeEventListener('keydown', onKeydown);
  }
  function onKeydown(e) { if (e.key === 'Escape') cerrar(); }

  /* Respiración. El reloj sale de Date.now() (no de contar ticks), así que no
   * se desfasa si el navegador frena los temporizadores; y solo se tocan el
   * texto y el transform del ícono — la ventana NO se vuelve a pintar cada
   * segundo (eso reiniciaba las animaciones y se comía clics en «Detener»). */
  function breathState() {
    var total = 0, i;
    for (i = 0; i < BREATH.length; i++) total += BREATH[i].dur;
    var t = Math.max(0, (Date.now() - S.breathT0) / 1000);
    var cycle = Math.floor(t / total);
    var r = t - cycle * total;
    for (i = 0; i < BREATH.length; i++) {
      if (r < BREATH[i].dur) return { phase: i, secs: Math.max(1, Math.ceil(BREATH[i].dur - r)), cycle: cycle };
      r -= BREATH[i].dur;
    }
    return { phase: 0, secs: BREATH[0].dur, cycle: cycle };
  }
  // Inhala → el ícono crece; exhala → se encoge; en los «sostén» se queda donde está.
  var ORB_SCALE = [1.16, 1.16, 0.9, 0.9];
  function moverOrb(phase) {
    var orb = document.getElementById('ve-orb');
    if (!orb || reduceMotion()) return;
    var dur = (phase === 0 || phase === 2) ? BREATH[phase].dur : 0.6;
    var esc_ = phase < 0 ? 1 : ORB_SCALE[phase];
    if (phase < 0) dur = 1;
    orb.style.webkitTransition = '-webkit-transform ' + dur + 's ease-in-out';
    orb.style.transition = 'transform ' + dur + 's ease-in-out';
    orb.style.webkitTransform = 'scale(' + esc_ + ')';
    orb.style.transform = 'scale(' + esc_ + ')';
  }
  function updateBreathUI() {
    var label = document.getElementById('ve-breath-label');
    var btn = document.getElementById('ve-breath');
    var cyc = document.getElementById('ve-breath-cycle');
    if (!label || !btn) return;
    if (!S.breathRun) {
      label.textContent = 'Pulsa para empezar';
      btn.textContent = S.breathStartLabel || 'Comenzar a respirar';
      moverOrb(-1);
      return;
    }
    var st = breathState();
    label.textContent = BREATH[st.phase].name + ' · ' + st.secs;
    if (cyc) cyc.textContent = String(st.cycle);
    btn.textContent = 'Detener';
    if (st.phase !== S.breathPhase) { S.breathPhase = st.phase; moverOrb(st.phase); }
  }
  function toggleBreath() {
    clearInterval(breathTimer);
    if (S.breathRun) { S.breathRun = false; updateBreathUI(); return; }
    S.breathRun = true; S.breathT0 = Date.now(); S.breathPhase = -1;
    updateBreathUI();
    breathTimer = setInterval(updateBreathUI, 250);
  }

  function buy(w) {
    if (!window.FisicaSave) return;
    var r = window.FisicaSave.comprar(w.id, w.costo);
    renderInner(); // se refresque haya funcionado o no (saldo/inventario)
  }

  function submitEvento() {
    var ev = S.ev;
    if (!ev) return;
    var ok = false;
    if (ev.tipo === 'opcion') {
      ok = S.evtChoice === ev.correcta;
    } else {
      var a = norm(S.evtAnswer);
      ok = a.length > 0 && ev.aceptadas.some(function (acc) { return a.indexOf(acc) !== -1 || acc.indexOf(a) !== -1; });
    }
    if (ok) {
      var res = window.FisicaSave ? window.FisicaSave.resolverEvento(ev.id, { tema: ev.tema }) : { token: '----' };
      S.evtSolved = res;
      if (leerPendientes().evento === ev.id) quitarPendiente('evento');
    } else {
      S.evtWrong = true;
    }
    renderInner();
  }
  function chooseOpcion(i) { S.evtChoice = i; submitEvento(); }

  /* ── Construcción de contenido por tipo ──────────────────────────────── */
  function topBar(color, sinPrefs) {
    var b = 'background:transparent;border:none;color:' + color + ';cursor:pointer;line-height:1;';
    return '<div style="display:flex;justify-content:flex-end;align-items:center;gap:14px;">' +
      (PREFERENCIAS_ALUMNO && !sinPrefs ? '<button id="ve-prefs" aria-label="Preferencias de pausas y avisos" title="Preferencias" style="' + b + 'font-size:19px;">⚙</button>' : '') +
      '<button id="ve-close" aria-label="Cerrar" style="' + b + 'font-size:26px;">×</button></div>';
  }

  function buildHoguera(R, clase) {
    var tema = temaDescanso(clase);
    var T = tema && tema.hoguera;

    var title = T ? T.title : 'La Hoguera';
    var heroSubtitle = T ? T.heroSubtitle : 'Deja el cálculo. Levántate un momento — llevas un rato en el camino.';
    var breathSectionTitle = T ? T.breath.sectionTitle : 'Respira';
    var breathStartLabel = T ? T.breath.startLabel : 'Comenzar a respirar';
    S.breathStartLabel = breathStartLabel;

    return '' +
      '<div style="color:#EFE3CE;">' +
      topBar('#C9BCA0') +
      '<div style="text-align:center;">' +
      '<div id="ve-orb" style="-webkit-transform:scale(1);transform:scale(1);">' + motifHoguera(clase, R) + '</div>' +
      '<h2 style="font-family:\'Newsreader\',serif;font-weight:500;font-size:38px;margin:0 0 10px;color:#F6ECD9;">' + esc(title) + '</h2>' +
      '<p style="font-family:\'Newsreader\',serif;font-style:italic;font-size:16px;line-height:1.55;color:#C9BCA0;margin:0 0 34px;max-width:440px;margin-left:auto;margin-right:auto;">' + esc(heroSubtitle) + '</p>' +
      '</div>' +
      '<div style="border-top:1px solid rgba(239,227,206,.14);padding-top:26px;text-align:center;">' +
      '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9C8F76;margin-bottom:8px;">' + esc(breathSectionTitle) + ' · caja 4·4·4·4 · ciclo <span id="ve-breath-cycle">0</span></div>' +
      '<div id="ve-breath-label" style="font-family:\'Newsreader\',serif;font-size:36px;color:' + R.color + ';margin-bottom:14px;">Pulsa para empezar</div>' +
      '<button id="ve-breath" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:' + R.deep + ';background:linear-gradient(180deg,' + R.tint + ',' + R.color + ');border:none;border-radius:8px;padding:12px 24px;cursor:pointer;">' + esc(breathStartLabel) + '</button>' +
      '</div>' +
      '<div style="margin-top:30px;border-top:1px solid rgba(239,227,206,.14);padding-top:26px;text-align:center;">' +
      '<a class="m-export" href="/exportar-avance.html" style="text-decoration:none;display:inline-block;font-family:\'IBM Plex Mono\',monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#241B14;background:#EFE3CE;border-radius:8px;padding:13px 26px;">Exportar avance ↓</a>' +
      '<p style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:#9C8F76;margin:14px 0 0;">Guarda una copia de tu avance antes de levantarte.</p>' +
      '<p style="font-family:\'Newsreader\',serif;font-style:italic;font-size:12.5px;color:#8A7C63;margin:16px 0 0;">¿Tienes más tiempo? <a href="/hoguera.html" style="color:' + R.color + ';">Ve la rutina completa en «' + esc(title) + '» →</a></p>' +
      '</div>' +
      '</div>';
  }

  /* ── Panel de preferencias del alumno ─────────────────────────────────── */
  function nombreTipo(tipo, clase) {
    var tema = temaDescanso(clase);
    if (tipo === 'hoguera') return (tema && tema.hoguera && tema.hoguera.title) || 'La Hoguera';
    if (tipo === 'comerciante') return (tema && tema.comerciante && tema.comerciante.title) || 'El Comerciante';
    return 'El acertijo';
  }
  function segBtn(R, grupo, valor, texto, activo) {
    return '<button class="ve-seg" data-g="' + grupo + '" data-v="' + valor + '" aria-pressed="' + (activo ? 'true' : 'false') + '" style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;letter-spacing:.04em;text-transform:uppercase;border-radius:7px;padding:9px 13px;cursor:pointer;' +
      (activo ? 'color:' + R.deep + ';background:linear-gradient(180deg,' + R.tint + ',' + R.color + ');border:1px solid transparent;'
              : 'color:#C9BCA0;background:transparent;border:1px solid rgba(239,227,206,.22);') + '">' + esc(texto) + '</button>';
  }
  function opcionesCon(lista, actual) {
    var o = lista.slice();
    if (o.indexOf(actual) === -1) o.push(actual);
    return o.sort(function (a, b) { return a - b; });
  }
  function filaPref(etiqueta, botones) {
    return '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-top:1px solid rgba(239,227,206,.09);">' +
      '<span style="font-family:\'Newsreader\',serif;font-size:16px;color:#F6ECD9;">' + esc(etiqueta) + '</span>' +
      '<span style="display:flex;flex-wrap:wrap;gap:7px;">' + botones + '</span></div>';
  }
  function buildPrefs(R, clase) {
    var P = leerPrefs();
    var hSec = 'font-family:\'IBM Plex Mono\',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:' + R.color + ';margin:30px 0 8px;';
    var nota = 'font-family:\'Newsreader\',serif;font-style:italic;font-size:13.5px;line-height:1.5;color:#9C8F76;margin:10px 0 0;';

    var html = '<div style="color:#EFE3CE;">' + topBar('#C9BCA0', true) +
      '<div style="text-align:center;">' +
      '<p style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#9C8F76;margin:0 0 10px;">Preferencias</p>' +
      '<h2 style="font-family:\'Newsreader\',serif;font-weight:500;font-size:34px;margin:0 0 10px;color:#F6ECD9;">Tus pausas, a tu ritmo</h2>' +
      '<p style="font-family:\'Newsreader\',serif;font-style:italic;font-size:16px;line-height:1.55;color:#C9BCA0;margin:0 auto;max-width:440px;">Tú decides cómo y cada cuánto se te ofrecen. Nada de esto cambia tu avance.</p>' +
      '</div>';

    html += '<p style="' + hSec + '">Cómo aparecen</p>';
    TIPOS.forEach(function (t) {
      html += filaPref(nombreTipo(t, clase),
        segBtn(R, 'modo-' + t, 'aviso', 'Aviso', P.modo[t] === 'aviso') +
        segBtn(R, 'modo-' + t, 'ventana', 'Ventana', P.modo[t] === 'ventana'));
    });
    html += '<p style="' + nota + '">Aviso: una píldora discreta abajo a la derecha, que abres cuando quieras. Ventana: se abre sobre la pantalla al cambiar de nota (al cerrarla, vuelve a hacer clic para continuar) o, si el descanso se cuenta por tiempo, en cuanto se cumple el plazo.</p>';

    html += '<p style="' + hSec + '">Cada cuánto se ofrece el descanso</p>';
    html += filaPref('Contar por',
      segBtn(R, 'hmodo', 'tiempo', 'Tiempo', P.hogueraModo === 'tiempo') +
      segBtn(R, 'hmodo', 'notas', 'Notas', P.hogueraModo === 'notas'));
    var ops = '';
    if (P.hogueraModo === 'tiempo') {
      opcionesCon(OPCIONES_MIN, P.hogueraMin).forEach(function (m) { ops += segBtn(R, 'hmin', m, m + ' min', m === P.hogueraMin); });
    } else {
      opcionesCon(OPCIONES_NOTAS, P.hogueraNotas).forEach(function (m) { ops += segBtn(R, 'hnotas', m, m + ' notas', m === P.hogueraNotas); });
    }
    html += filaPref('Ofrecerlo cada', ops);

    html += '<p style="' + hSec + '">Acertijos y comerciante</p>';
    html += filaPref('Frecuencia',
      segBtn(R, 'frec', 'poca', 'Menos', P.frecuencia === 'poca') +
      segBtn(R, 'frec', 'normal', 'Normal', P.frecuencia === 'normal') +
      segBtn(R, 'frec', 'mucha', 'Más', P.frecuencia === 'mucha'));
    if (COOLDOWN_SESSION) html += '<p style="' + nota + '">Como mucho aparece uno por sesión; esto cambia qué tan pronto.</p>';

    html += '<p style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:#8A7C63;margin:30px 0 0;text-align:center;">Se guarda solo en este navegador.</p></div>';
    return html;
  }

  function buildComerciante(R, clase) {
    var tema = temaDescanso(clase);
    var T = tema && tema.comerciante;
    var kicker = T ? T.kicker : 'El Bazar del Camino';
    var title = T ? T.title : 'El Comerciante';
    var currencyLabel = T ? T.currencyLabel : 'esquirlas';
    var wares = T ? T.wares : WARES;
    S.activeWares = wares;

    var saldo = window.FisicaSave ? window.FisicaSave.esquirlas() : 0;
    var inv = window.FisicaSave ? window.FisicaSave.inventario() : {};
    var html = '' +
      '<div style="color:#EDE6D6;">' +
      topBar('#BCB199') +
      '<div style="text-align:center;margin-bottom:28px;">' +
      '<p style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#9A8F77;margin:0 0 10px;">' + esc(kicker) + '</p>' +
      '<h2 style="font-family:\'Newsreader\',serif;font-weight:500;font-size:36px;margin:0 0 10px;color:#F4ECDA;">' + esc(title) + '</h2>' +
      '<span style="font-family:\'Newsreader\',serif;font-size:19px;color:#F4ECDA;"><span style="color:' + R.color + ';font-weight:500;">' + saldo + '</span> ' + esc(currencyLabel) + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">';
    wares.forEach(function (w) {
      var owned = !!inv[w.id];
      var afford = saldo >= w.costo;
      var btnText = owned ? '✓ Tuyo' : (afford ? 'Adquirir' : 'Sin fondos');
      var btnBg = owned ? 'transparent' : (afford ? ('linear-gradient(180deg,' + R.tint + ',' + R.color + ')') : 'transparent');
      var btnColor = owned ? '#AFC98A' : (afford ? R.deep : '#8A8068');
      var btnBorder = owned ? '1px solid rgba(160,190,120,.5)' : (afford ? 'none' : '1px solid rgba(237,230,214,.2)');
      var btnCursor = owned ? 'default' : (afford ? 'pointer' : 'not-allowed');
      var decor = wareDecor(clase, R, owned);
      html += '' +
        '<div style="position:relative;display:flex;align-items:center;gap:12px;background:' + decor.background + ';border:' + decor.border + ';border-radius:10px;padding:14px 16px;">' +
        decor.corners +
        '<span style="flex:0 0 auto;width:42px;height:42px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:19px;background:rgba(237,230,214,.06);color:' + (owned ? '#AFC98A' : R.color) + ';">' + w.glyph + '</span>' +
        '<span style="flex:1;min-width:0;">' +
        '<span style="display:block;font-family:\'Newsreader\',serif;font-size:15.5px;color:#F4ECDA;">' + esc(w.name) + '</span>' +
        '<span style="display:block;font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#9A8F77;">◈ ' + w.costo + '</span>' +
        '</span>' +
        (owned ? '' : '<button class="ve-buy" data-id="' + w.id + '" ' + (afford ? '' : 'disabled') + ' style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:' + btnColor + ';background:' + btnBg + ';border:' + btnBorder + ';border-radius:6px;padding:9px 13px;cursor:' + btnCursor + ';">' + btnText + '</button>') +
        (owned ? '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#AFC98A;">' + btnText + '</span>' : '') +
        '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function buildEvento(R, ev, clase) {
    var head = '' +
      '<div style="color:#EDE1F5;">' +
      topBar('#C9B9E0') +
      '<div style="text-align:center;margin-bottom:10px;">' +
      evtIcon(clase, R) +
      '<p style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:' + R.color + ';margin:0 0 10px;">Evento aleatorio · Física Computacional</p>' +
      '<h2 style="font-family:\'Newsreader\',serif;font-weight:500;font-size:32px;margin:0 0 24px;color:#F0E6FA;">Acertijo del Camino</h2>' +
      '</div>';

    if (S.evtSolved) {
      return head +
        '<div style="background:rgba(150,190,120,.14);border:1px solid rgba(160,190,120,.4);border-radius:12px;padding:24px 26px;text-align:center;max-width:460px;margin:0 auto;">' +
        '<div style="font-size:26px;color:#AFC98A;margin-bottom:10px;">✓</div>' +
        '<p style="font-family:\'Newsreader\',serif;font-size:16px;line-height:1.55;color:#EAE4D8;margin:0 0 14px;">¡Correcto! Guarda este código y muéstraselo a tu profesor para reclamar tu insignia.</p>' +
        '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:19px;letter-spacing:.1em;color:#F0E6FA;background:rgba(0,0,0,.2);border-radius:8px;padding:11px;">' + esc(S.evtSolved.token) + '</div>' +
        '</div></div>';
    }

    var body = '<div style="max-width:460px;margin:0 auto;">' +
      '<p style="font-family:\'Newsreader\',serif;font-style:italic;font-size:16px;line-height:1.6;color:#D6C9E8;margin:0 0 18px;">"' + esc(ev.pregunta) + '"</p>';

    if (ev.tipo === 'opcion') {
      body += '<div style="display:flex;flex-direction:column;gap:9px;">';
      ev.opciones.forEach(function (op, i) {
        body += '<button class="ve-opt" data-i="' + i + '" style="text-align:left;font-family:\'Newsreader\',serif;font-size:15px;color:#F0E6FA;background:rgba(255,255,255,.06);border:1px solid rgba(201,185,224,.35);border-radius:9px;padding:12px 15px;cursor:pointer;">' + esc(op) + '</button>';
      });
      body += '</div>';
    } else {
      body += '<input type="text" id="ve-evt-input" placeholder="tu respuesta…" value="' + esc(S.evtAnswer) + '" style="width:100%;box-sizing:border-box;font-family:\'Newsreader\',serif;font-size:16px;color:#F0E6FA;background:rgba(255,255,255,.06);border:1px solid rgba(201,185,224,.35);border-radius:9px;padding:12px 15px;margin-bottom:12px;">';
    }
    if (S.evtWrong) {
      body += '<p style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;color:#E0A8A0;margin:10px 0 0;">Todavía no — inténtalo de nuevo.</p>';
    }
    if (ev.tipo === 'texto') {
      body += '<div style="display:flex;gap:10px;align-items:center;margin-top:10px;">' +
        '<button id="ve-evt-submit" style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:' + R.deep + ';background:linear-gradient(180deg,' + R.tint + ',' + R.color + ');border:none;border-radius:8px;padding:11px 20px;cursor:pointer;">Entregar respuesta</button>' +
        '<button id="ve-evt-hint" style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#C9B9E0;background:transparent;border:1px solid rgba(201,185,224,.35);border-radius:6px;padding:10px 14px;cursor:pointer;">' + (S.evtShowHint ? 'Ocultar pista' : 'Ver pista') + '</button>' +
        '</div>';
    } else {
      body += '<div style="margin-top:6px;"><button id="ve-evt-hint" style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#C9B9E0;background:transparent;border:1px solid rgba(201,185,224,.35);border-radius:6px;padding:9px 13px;cursor:pointer;">' + (S.evtShowHint ? 'Ocultar pista' : 'Ver pista') + '</button></div>';
    }
    if (S.evtShowHint && ev.pista) {
      body += '<p style="font-family:\'Newsreader\',serif;font-style:italic;font-size:13px;color:#A88FC4;margin:14px 0 0;">Pista: ' + esc(ev.pista) + '</p>';
    }
    body += '</div>';
    return head + body + '</div>';
  }

  var BG = {
    hoguera: function (R, clase) { return worldBg(clase, '118%')(R); },
    comerciante: function (R, clase) { return worldBg(clase, '-10%')(R); },
    evento: function (R, clase) { return worldBg(clase, '-10%')(R); },
    prefs: function (R, clase) { return worldBg(clase, '-10%')(R); }
  };

  function renderInner() {
    var inner = document.getElementById('ve-inner');
    var card = document.getElementById('ve-card');
    if (!inner || !card) return;
    var clase = claseActual();
    var R = (S.tipo === 'hoguera' || S.tipo === 'comerciante') ? paletteForDescanso(S.tipo, clase) : rutaPalette();
    card.setAttribute('style', card.getAttribute('style').replace(/background:[^;]+;/, '') + BG[S.tipo](R, clase));

    var html;
    if (S.tipo === 'prefs') html = buildPrefs(R, clase);
    else if (S.tipo === 'hoguera') html = buildHoguera(R, clase);
    else if (S.tipo === 'comerciante') html = buildComerciante(R, clase);
    else html = buildEvento(R, S.ev, clase);
    inner.innerHTML = html;

    var closeBtn = document.getElementById('ve-close'); if (closeBtn) closeBtn.onclick = cerrar;
    var breathBtn = document.getElementById('ve-breath'); if (breathBtn) breathBtn.onclick = toggleBreath;
    var prefsBtn = document.getElementById('ve-prefs'); if (prefsBtn) prefsBtn.onclick = abrirPrefs;
    inner.querySelectorAll('.ve-buy').forEach(function (b) {
      b.onclick = function () {
        var wares = S.activeWares || WARES;
        var w = wares.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        if (w) buy(w);
      };
    });
    var evtInput = document.getElementById('ve-evt-input');
    if (evtInput) evtInput.oninput = function (e) { S.evtAnswer = e.target.value; S.evtWrong = false; };
    var evtSubmit = document.getElementById('ve-evt-submit'); if (evtSubmit) evtSubmit.onclick = submitEvento;
    var evtHint = document.getElementById('ve-evt-hint'); if (evtHint) evtHint.onclick = function () { S.evtShowHint = !S.evtShowHint; renderInner(); };
    inner.querySelectorAll('.ve-opt').forEach(function (b) {
      b.onclick = function () { chooseOpcion(parseInt(b.getAttribute('data-i'), 10)); };
    });
    inner.querySelectorAll('.ve-seg').forEach(function (b) {
      b.onclick = function () { cambiarPref(b.getAttribute('data-g'), b.getAttribute('data-v')); };
    });
    if (S.tipo === 'hoguera' && S.breathRun) { S.breathPhase = -1; updateBreathUI(); }
  }

  function abrir(tipo, ev) {
    ensureStyles();
    if (document.getElementById('ve-overlay')) cerrar();
    S = { tipo: tipo, ev: ev || null, breathRun: false, breathPhase: 0, breathSecs: 4, breathCycle: 0, evtAnswer: '', evtWrong: false, evtShowHint: false, evtSolved: null, evtChoice: null };

    var overlay = document.createElement('div');
    overlay.id = 've-overlay';
    overlay.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(15,12,8,.6);z-index:999999;animation:ve-fadein .2s ease;';

    var card = document.createElement('div');
    card.id = 've-card';
    card.style.cssText = 'position:fixed;top:3vh;left:5vw;right:5vw;bottom:3vh;border-radius:22px;overflow-y:auto;box-shadow:0 40px 90px -30px rgba(0,0,0,.55);animation:ve-popin .25s cubic-bezier(.2,.8,.2,1);';

    var inner = document.createElement('div');
    inner.id = 've-inner';
    inner.style.cssText = 'max-width:680px;margin:0 auto;padding:48px 40px 56px;box-sizing:border-box;min-height:100%;font-family:\'Newsreader\',Georgia,serif;';

    card.appendChild(inner);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKeydown);
    renderInner();
  }

  /* ── API pública: llamada por el router antes de navegar ───────────────
   * Por defecto no cancela la navegación (devuelve false) y solo registra un
   * aviso pendiente. Devuelve true —y abre la ventana— únicamente cuando el
   * alumno eligió «ventana» para lo que toca en este clic.
   */
  function intentar(hrefDestino) {
    if (!window.FisicaSave) return false;
    var P = leerPrefs();

    if (ofrecerHogueraSiToca(true)) return true;

    var p = leerPendientes();
    if (!p.evento && !p.comerciante) { // no apilar un segundo aviso del sorteo
      var tipo = rollComercianteEvento();
      if (tipo === 'evento') {
        var ev = pickEvento(currentTema());
        if (ev) {
          marcarUsadaSesion();
          if (P.modo.evento === 'ventana') { abrir('evento', ev); return true; }
          ponerPendiente('evento', ev.id);
        }
      } else if (tipo === 'comerciante') {
        marcarUsadaSesion();
        if (P.modo.comerciante === 'ventana') { abrir('comerciante'); return true; }
        ponerPendiente('comerciante', 1);
      }
    }

    return false;
  }

  /* ── Arranque: repinta lo pendiente y vigila el reloj de La Hoguera ───── */
  function iniciar() {
    sesionInicio();
    renderAvisos();
    ofrecerHogueraSiToca(false);
    // Reloj independiente de los clics: una comprobación por minuto (leer un
    // par de valores guardados). Compara contra la hora real, así que no
    // importa que el navegador frene el temporizador en pestañas de fondo.
    setInterval(function () { ofrecerHogueraSiToca(false); }, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) ofrecerHogueraSiToca(false);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.VentanasEmergentes = { intentar: intentar, abrir: abrir, cerrar: cerrar, preferencias: abrirPrefs };
})();
