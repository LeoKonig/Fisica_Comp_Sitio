/*
 * mini-idris.js
 * Física Computacional — ejecución del subconjunto de Idris 2 del curso.
 *
 * No hay intérprete propio: el subconjunto que usa el curso (funciones con
 * cláusulas, patrones, recursión, listas, Maybe, if/then/else, case, where,
 * let…in) coincide con el de Haskell salvo en la superficie. Este archivo
 * traduce esa superficie y delega en mini-haskell.js:
 *
 *   ·  firma con un solo dos puntos   f : Nat -> Nat      → se ignora
 *   ·  flechas y lambdas de Idris     \x => …             → \x -> …
 *   ·  Nat, Integer, Double, Bits…    → números de JS
 *   ·  agujeros ?nombre               → error legible, no un fallo de parseo
 *   ·  data / record / interface      → se ignoran (no hay tipos dependientes)
 *
 * Los tipos NO se comprueban: un ejercicio que dependa de eso debe validarse
 * con pasos de texto y confirmarse en el compilador real.
 *
 * API idéntica a los demás motores:
 *   window.MiniIdris.ejecutar(src) / .evaluarEn(src, expr)
 */
(function () {
  'use strict';

  function traducir(src) {
    var lineas = String(src).replace(/\r/g, '').split('\n');
    var fuera = [];
    var enBloqueIgnorado = false;

    lineas.forEach(function (linea) {
      var sangria = linea.length - linea.replace(/^\s*/, '').length;
      var limpia = linea.replace(/--.*$/, '');
      var cuerpo = limpia.trim();

      if (!cuerpo) { enBloqueIgnorado = false; fuera.push(''); return; }

      // bloques sin equivalente: se saltan junto con sus líneas indentadas
      if (/^(data|record|interface|implementation|namespace|mutual|parameters)\b/.test(cuerpo)) {
        enBloqueIgnorado = true;
        fuera.push('');
        return;
      }
      if (enBloqueIgnorado) {
        if (sangria > 0) { fuera.push(''); return; }
        enBloqueIgnorado = false;
      }
      if (/^(module|import|%\w+)/.test(cuerpo)) { fuera.push(''); return; }

      // firma de tipo de Idris:  nombre : Tipo   (un solo dos puntos)
      if (/^[a-z_]\w*'?\s*:(?!:)/.test(cuerpo) && cuerpo.indexOf('=') === -1) {
        fuera.push('');
        return;
      }

      var t = limpia;
      t = t.replace(/→/g, '->').replace(/←/g, '<-').replace(/⇒/g, '=>');
      // lambdas: \x => …  y  \(x, y) => …   pasan a ->
      // lambdas: \x => …, \x, y => … (varios argumentos separados por coma) y \(x, y) => …
      t = t.replace(/\\([^=\n]*?)=>/g, function (_, args) {
        if (args.indexOf('(') === -1) args = args.replace(/,/g, ' ');
        return '\\' + args + '-> ';
      });
      // en Idris el cons de listas es ::  (en Haskell, :)
      t = t.replace(/::/g, ':');
      // el resto de los => (restricciones de interfaz) desaparece
      t = t.replace(/=>/g, ' ');
      fuera.push(t);
    });

    // cast (Nat → Double, etc.) es la identidad cuando todo número es un número de JS
    return fuera.join('\n');
  }

  // cast (Nat → Double, etc.) es la identidad cuando todo número es un número de JS
  var PRELUDIO = 'cast x = x\n';

  function agujeros(src) {
    var m = String(src).match(/(^|[\s(=])\?[a-zA-Z_]\w*/);
    return m ? m[0].trim() : null;
  }

  function motor() {
    if (!window.MiniHaskell) throw new Error('mini-idris.js necesita mini-haskell.js cargado antes');
    return window.MiniHaskell;
  }

  function ejecutar(src, opciones) {
    var hueco = agujeros(src);
    if (hueco) return { ok: false, salida: '', valores: [], error: 'queda un agujero sin llenar: ' + hueco };
    try {
      return motor().ejecutar(PRELUDIO + traducir(src), opciones);
    } catch (e) {
      return { ok: false, salida: '', valores: [], error: e.message };
    }
  }

  function evaluarEn(src, expr, opciones) {
    var hueco = agujeros(src);
    if (hueco) return { ok: false, texto: '', salida: '', error: 'queda un agujero sin llenar: ' + hueco };
    try {
      return motor().evaluarEn(PRELUDIO + traducir(src), traducir(expr).trim(), opciones);
    } catch (e) {
      return { ok: false, texto: '', salida: '', error: e.message };
    }
  }

  window.MiniIdris = {
    ejecutar: ejecutar,
    evaluarEn: evaluarEn,
    traducir: traducir,
    mostrar: function (v) { return window.MiniHaskell.mostrar(v); },
    nombre: 'Idris 2 (subconjunto del curso, sin tipos dependientes)'
  };
})();
