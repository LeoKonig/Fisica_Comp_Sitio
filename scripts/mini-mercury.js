/*
 * mini-mercury.js
 * Física Computacional — intérprete del SUBCONJUNTO FUNCIONAL de Mercury.
 *
 * No es el compilador de Mercury. Cubre lo que el curso escribe en la ruta
 * Mercury: funciones (`:- func`) definidas por cláusulas con patrones,
 * if-then-else, aritmética de int y float con la distinción de tipos que
 * Mercury exige, listas [H | T], y unas cuantas funciones de library.
 *
 * Reconoce y omite las declaraciones (`:- module`, `:- func`, `:- pred`,
 * `:- mode`, `:- interface`, `:- import_module`, …): sirven para leer el
 * programa como Mercury real, pero aquí no se comprueban tipos ni modos.
 *
 * API:  window.MiniMercury.ejecutar(src)         -> { ok, salida, valores, error }
 *       window.MiniMercury.evaluarEn(src, expr)  -> { ok, texto, valor, error }
 *
 * Limitaciones: solo funciones deterministas. Predicados con argumentos de
 * salida (`p(X::in, Y::out)`), no-determinismo, estado de E/S, typeclasses y
 * modos quedan fuera: para eso, el botón del compilador real.
 */
(function () {
  'use strict';

  /* ── Valores ─────────────────────────────────────────────────
     int → number · float → {flt:number} · string → string
     átomo → {atom:'nombre'} · lista → array                     */
  function Flt(n) { return { flt: n }; }
  function esFlt(v) { return !!v && typeof v === 'object' && typeof v.flt === 'number'; }
  function esAtomo(v) { return !!v && typeof v === 'object' && typeof v.atom === 'string'; }
  function Atomo(n) { return { atom: n }; }
  function crudo(v) { return esFlt(v) ? v.flt : v; }
  function err(m) { return new Error(m); }

  function mostrar(v) {
    if (v === true) return 'yes';
    if (v === false) return 'no';
    if (esFlt(v)) {
      var s = String(v.flt);
      if (s.indexOf('.') === -1 && s.indexOf('e') === -1 && s.indexOf('Inf') === -1) s += '.0';
      return s;
    }
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return '"' + v + '"';
    if (esAtomo(v)) return v.atom;
    if (Array.isArray(v)) return '[' + v.map(mostrar).join(', ') + ']';
    return String(v);
  }

  function iguales(a, b) {
    if (esFlt(a) || esFlt(b)) return crudo(a) === crudo(b);
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    if (esAtomo(a) && esAtomo(b)) return a.atom === b.atom;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every(function (x, i) { return iguales(x, b[i]); });
    return false;
  }

  /* ── Léxico ─────────────────────────────────────────────────── */
  var SIMBOLOS = ['=<', '>=', '\\=', ':-', '-->', '//', '=', '<', '>', '+', '-', '*', '/', '^', '\\'];

  function tokenizar(src) {
    var t = [], i = 0, n = src.length;
    while (i < n) {
      var c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '%') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if (/[0-9]/.test(c)) {
        var num = '';
        while (i < n && /[0-9]/.test(src[i])) num += src[i++];
        if (src[i] === '.' && /[0-9]/.test(src[i + 1] || '')) {
          num += src[i++];
          while (i < n && /[0-9]/.test(src[i])) num += src[i++];
          if (/[eE]/.test(src[i] || '') && /[0-9+-]/.test(src[i + 1] || '')) {
            num += src[i++];
            if (/[+-]/.test(src[i])) num += src[i++];
            while (i < n && /[0-9]/.test(src[i])) num += src[i++];
          }
          t.push({ t: 'float', v: parseFloat(num) });
        } else {
          t.push({ t: 'int', v: parseInt(num, 10) });
        }
        continue;
      }
      if (/[A-Z_]/.test(c)) {
        var vv = '';
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) vv += src[i++];
        t.push({ t: 'var', v: vv });
        continue;
      }
      if (/[a-z]/.test(c)) {
        var nom = '';
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) nom += src[i++];
        // nombre calificado: math.sqrt, list.length (punto pegado a una letra)
        while (src[i] === '.' && /[a-z]/.test(src[i + 1] || '')) {
          nom += src[i++];
          while (i < n && /[A-Za-z0-9_]/.test(src[i])) nom += src[i++];
        }
        t.push({ t: 'nombre', v: nom });
        continue;
      }
      if (c === '"') {
        var s = ''; i++;
        while (i < n && src[i] !== '"') {
          if (src[i] === '\\') { s += JSON.parse('"\\' + src[i + 1] + '"'); i += 2; }
          else s += src[i++];
        }
        i++; t.push({ t: 'str', v: s });
        continue;
      }
      if (c === '.') { t.push({ t: 'fin', v: '.' }); i++; continue; }
      if ('()[],|'.indexOf(c) !== -1) { t.push({ t: c, v: c }); i++; continue; }
      var op = null;
      for (var k = 0; k < SIMBOLOS.length; k++) {
        if (src.substr(i, SIMBOLOS[k].length) === SIMBOLOS[k]) { op = SIMBOLOS[k]; break; }
      }
      if (op) { t.push({ t: 'op', v: op }); i += op.length; continue; }
      throw err('carácter inesperado: ' + c);
    }
    return t;
  }

  /* ── Parser ─────────────────────────────────────────────────── */
  var PREC = {
    ',': [1000, 'r'], ';': [1100, 'r'],
    '=': [700, 'n'], '\\=': [700, 'n'], '<': [700, 'n'], '>': [700, 'n'], '=<': [700, 'n'], '>=': [700, 'n'],
    '+': [500, 'l'], '-': [500, 'l'],
    '*': [400, 'l'], '/': [400, 'l'], '//': [400, 'l'],
    '^': [200, 'r']
  };
  var INFIJOS_NOMBRE = { mod: [400, 'l'], rem: [400, 'l'], div: [400, 'l'] };

  function P(ts) { this.ts = ts; this.i = 0; }
  P.prototype.ojo = function (k) { return this.ts[this.i + (k || 0)]; };
  P.prototype.es = function (t, v) { var x = this.ojo(); return !!x && x.t === t && (v === undefined || x.v === v); };
  P.prototype.come = function (t, v) {
    if (!this.es(t, v)) throw err('se esperaba ' + (v || t) + (this.ojo() ? ', llegó "' + this.ojo().v + '"' : ' al final de la cláusula'));
    return this.ts[this.i++];
  };

  P.prototype.expr = function (max) {
    max = max === undefined ? 999 : max;
    var izq = this.primario();
    for (;;) {
      var tk = this.ojo(), nombre = null, info = null;
      if (tk && tk.t === 'op' && PREC[tk.v]) { nombre = tk.v; info = PREC[tk.v]; }
      else if (tk && tk.t === ',' && max >= 1000) { nombre = ','; info = PREC[',']; }
      else if (tk && tk.t === 'nombre' && INFIJOS_NOMBRE[tk.v]) { nombre = tk.v; info = INFIJOS_NOMBRE[tk.v]; }
      if (!nombre || info[0] > max) return izq;
      this.i++;
      var der = this.expr(info[1] === 'r' ? info[0] : info[0] - 1);
      izq = { k: 'op', op: nombre, a: izq, b: der };
      if (info[1] === 'n') return izq;
    }
  };

  P.prototype.primario = function () {
    var tk = this.ojo();
    if (!tk) throw err('expresión incompleta');
    if (tk.t === 'int') { this.i++; return { k: 'lit', v: tk.v }; }
    if (tk.t === 'float') { this.i++; return { k: 'lit', v: Flt(tk.v) }; }
    if (tk.t === 'str') { this.i++; return { k: 'lit', v: tk.v }; }
    if (tk.t === 'var') { this.i++; return { k: 'var', v: tk.v }; }
    if (tk.t === 'op' && tk.v === '-') { this.i++; return { k: 'neg', a: this.primario() }; }
    if (tk.t === 'op' && tk.v === '\\') { this.i++; return { k: 'no', a: this.primario() }; }
    if (tk.t === 'nombre') {
      if (tk.v === 'if') {
        this.i++;
        var c = this.expr(1000);
        this.come('nombre', 'then');
        var a = this.expr(1000);
        this.come('nombre', 'else');
        return { k: 'si', c: c, a: a, b: this.expr(1000) };
      }
      if (tk.v === 'not') { this.i++; return { k: 'no', a: this.primario() }; }
      this.i++;
      if (this.es('(')) {
        this.i++;
        var args = [];
        if (!this.es(')')) {
          args.push(this.expr(999));
          while (this.es(',')) { this.i++; args.push(this.expr(999)); }
        }
        this.come(')');
        return { k: 'llamada', nombre: tk.v, args: args };
      }
      return { k: 'atomo', v: tk.v };
    }
    if (tk.t === '(') {
      this.i++;
      var e = this.expr(1100);
      this.come(')');
      return e;
    }
    if (tk.t === '[') {
      this.i++;
      if (this.es(']')) { this.i++; return { k: 'lit', v: [] }; }
      var items = [this.expr(999)];
      while (this.es(',')) { this.i++; items.push(this.expr(999)); }
      var cola = null;
      if (this.es('|')) { this.i++; cola = this.expr(999); }
      this.come(']');
      return { k: 'lista', items: items, cola: cola };
    }
    throw err('no entiendo "' + tk.v + '" aquí');
  };

  /* ── Patrones (lado izquierdo de una cláusula) ── */
  P.prototype.patron = function () {
    var tk = this.ojo();
    if (!tk) throw err('patrón incompleto');
    if (tk.t === 'var') { this.i++; return tk.v === '_' ? { p: 'comodin' } : { p: 'var', v: tk.v }; }
    if (tk.t === 'int') { this.i++; return { p: 'lit', v: tk.v }; }
    if (tk.t === 'float') { this.i++; return { p: 'lit', v: Flt(tk.v) }; }
    if (tk.t === 'str') { this.i++; return { p: 'lit', v: tk.v }; }
    if (tk.t === 'op' && tk.v === '-') {
      this.i++;
      var nn = this.come(this.es('float') ? 'float' : 'int');
      return { p: 'lit', v: nn.t === 'float' ? Flt(-nn.v) : -nn.v };
    }
    if (tk.t === 'nombre') { this.i++; return { p: 'atomo', v: tk.v }; }
    if (tk.t === '[') {
      this.i++;
      if (this.es(']')) { this.i++; return { p: 'vacia' }; }
      var items = [this.patron()];
      while (this.es(',')) { this.i++; items.push(this.patron()); }
      var cola = null;
      if (this.es('|')) { this.i++; cola = this.patron(); }
      this.come(']');
      return { p: 'lista', items: items, cola: cola };
    }
    if (tk.t === '(') {
      this.i++;
      var p = this.patron();
      this.come(')');
      return p;
    }
    throw err('patrón no soportado cerca de "' + tk.v + '"');
  };

  /* ── Cláusulas ── */
  function parsear(src) {
    var ts = tokenizar(String(src));
    var i = 0, clausulas = [], declaraciones = 0;

    /* Recorta hasta el punto que cierra la cláusula. El punto es obligatorio en
       Mercury, así que llegar al final del archivo sin él es un error real:
       si el editor lo perdonara estaría aprobando código que no compila.     */
    function hastaFin() {
      var trozo = [], cerrado = false;
      while (i < ts.length) {
        if (ts[i].t === 'fin') { i++; cerrado = true; break; }
        trozo.push(ts[i++]);
      }
      if (!cerrado && trozo.length) {
        var quien = trozo[0].t === 'nombre' ? ' de ' + trozo[0].v : '';
        throw err('falta el punto que cierra la cláusula' + quien);
      }
      return trozo;
    }

    while (i < ts.length) {
      if (ts[i].t === 'fin') { i++; continue; }
      if (ts[i].t === 'op' && ts[i].v === ':-') { hastaFin(); declaraciones++; continue; }
      var trozo = hastaFin();
      if (!trozo.length) continue;
      var pp = new P(trozo);
      var cab = pp.come('nombre').v;
      var pats = [];
      if (pp.es('(')) {
        pp.i++;
        if (!pp.es(')')) {
          pats.push(pp.patron());
          while (pp.es(',')) { pp.i++; pats.push(pp.patron()); }
        }
        pp.come(')');
      }
      if (pp.es('op', ':-')) {
        throw err('por ahora este editor solo ejecuta funciones (cabeza = cuerpo); "' + cab + ' :- …" necesita el compilador real');
      }
      pp.come('op', '=');
      var cuerpo = pp.expr(1100);
      if (pp.i < trozo.length) throw err('sobra "' + trozo[pp.i].v + '" en la cláusula de ' + cab);
      clausulas.push({ nombre: cab, aridad: pats.length, pats: pats, cuerpo: cuerpo });
    }
    if (!clausulas.length && declaraciones) {
      throw err('no hay ninguna cláusula que definir: ¿falta el punto al final de una declaración «:- …»?');
    }
    return { clausulas: clausulas, declaraciones: declaraciones };
  }

  /* ── Evaluación ─────────────────────────────────────────────── */
  function emparejar(pat, v, env) {
    switch (pat.p) {
      case 'comodin': return true;
      case 'var': env[pat.v] = v; return true;
      case 'lit': return iguales(pat.v, v);
      case 'atomo': return esAtomo(v) ? v.atom === pat.v : false;
      case 'vacia': return Array.isArray(v) && v.length === 0;
      case 'lista': {
        if (!Array.isArray(v)) return false;
        if (pat.cola) {
          if (v.length < pat.items.length) return false;
        } else if (v.length !== pat.items.length) return false;
        for (var i = 0; i < pat.items.length; i++) if (!emparejar(pat.items[i], v[i], env)) return false;
        if (pat.cola) return emparejar(pat.cola, v.slice(pat.items.length), env);
        return true;
      }
    }
    return false;
  }

  function aritmetica(op, a, b) {
    var fa = esFlt(a), fb = esFlt(b), x = crudo(a), y = crudo(b);
    if (typeof x !== 'number' || typeof y !== 'number') throw err(op + ': se esperaban números');
    if (fa !== fb && op !== '^') {
      throw err(op + ': Mercury no mezcla int y float — usa float(X) para convertir');
    }
    var flotante = fa || fb, r;
    switch (op) {
      case '+': r = x + y; break;
      case '-': r = x - y; break;
      case '*': r = x * y; break;
      case '/':
        if (y === 0) throw err('/: división por cero');
        if (!flotante) throw err('/: la división de int se escribe // (o usa float(X))');
        r = x / y; break;
      case '//':
        if (y === 0) throw err('//: división por cero');
        if (flotante) throw err('//: solo para int; con float usa /');
        r = Math.trunc(x / y); break;
      case 'mod': {
        if (y === 0) throw err('mod: división por cero');
        var m = x % y;
        r = (m !== 0 && (m < 0) !== (y < 0)) ? m + y : m;
        break;
      }
      case 'rem': if (y === 0) throw err('rem: división por cero'); r = x % y; break;
      case 'div': if (y === 0) throw err('div: división por cero'); r = Math.floor(x / y); break;
      case '^': r = Math.pow(x, y); flotante = fa; break;
      default: throw err('operador no soportado: ' + op);
    }
    return flotante ? Flt(r) : r;
  }

  function comparar(op, a, b) {
    if (op === '=') return iguales(a, b);
    if (op === '\\=') return !iguales(a, b);
    var x = crudo(a), y = crudo(b);
    if (typeof x !== 'number' || typeof y !== 'number') {
      if (typeof x === 'string' && typeof y === 'string') {
        return op === '<' ? x < y : op === '>' ? x > y : op === '=<' ? x <= y : x >= y;
      }
      throw err(op + ': se esperaban números');
    }
    return op === '<' ? x < y : op === '>' ? x > y : op === '=<' ? x <= y : x >= y;
  }

  function BIBLIOTECA(ctx) {
    function unFloat(v, quien) {
      var x = crudo(v);
      if (typeof x !== 'number') throw err(quien + ': se esperaba un número');
      return x;
    }
    var B = {
      'math.sqrt': function (x) { return Flt(Math.sqrt(unFloat(x, 'math.sqrt'))); },
      'math.pow': function (a, b) { return Flt(Math.pow(unFloat(a, 'math.pow'), unFloat(b, 'math.pow'))); },
      'math.exp': function (x) { return Flt(Math.exp(unFloat(x, 'math.exp'))); },
      'math.ln': function (x) { return Flt(Math.log(unFloat(x, 'math.ln'))); },
      'math.sin': function (x) { return Flt(Math.sin(unFloat(x, 'math.sin'))); },
      'math.cos': function (x) { return Flt(Math.cos(unFloat(x, 'math.cos'))); },
      'math.tan': function (x) { return Flt(Math.tan(unFloat(x, 'math.tan'))); },
      'math.atan': function (x) { return Flt(Math.atan(unFloat(x, 'math.atan'))); },
      'math.pi': function () { return Flt(Math.PI); },
      'float': function (x) { return Flt(unFloat(x, 'float')); },
      'float.float': function (x) { return Flt(unFloat(x, 'float')); },
      'int.float': function (x) { return Flt(unFloat(x, 'float')); },
      'truncate': function (x) { return Math.trunc(unFloat(x, 'truncate')); },
      'float.truncate_to_int': function (x) { return Math.trunc(unFloat(x, 'truncate_to_int')); },
      'floor': function (x) { return Flt(Math.floor(unFloat(x, 'floor'))); },
      'ceiling': function (x) { return Flt(Math.ceil(unFloat(x, 'ceiling'))); },
      'round': function (x) { return Flt(Math.round(unFloat(x, 'round'))); },
      'abs': function (x) { var r = Math.abs(unFloat(x, 'abs')); return esFlt(x) ? Flt(r) : r; },
      'int.abs': function (x) { return Math.abs(unFloat(x, 'abs')); },
      'float.abs': function (x) { return Flt(Math.abs(unFloat(x, 'abs'))); },
      'min': function (a, b) { return crudo(a) <= crudo(b) ? a : b; },
      'max': function (a, b) { return crudo(a) >= crudo(b) ? a : b; },
      'int.min': function (a, b) { return Math.min(crudo(a), crudo(b)); },
      'int.max': function (a, b) { return Math.max(crudo(a), crudo(b)); },
      'float.min': function (a, b) { return Flt(Math.min(crudo(a), crudo(b))); },
      'float.max': function (a, b) { return Flt(Math.max(crudo(a), crudo(b))); },
      'list.length': function (l) { if (!Array.isArray(l)) throw err('list.length: se esperaba una lista'); return l.length; },
      'length': function (l) { if (!Array.isArray(l)) throw err('length: se esperaba una lista'); return l.length; },
      'list.reverse': function (l) { return l.slice().reverse(); },
      'list.append': function (a, b) { return a.concat(b); },
      'list.sum': function (l) {
        if (!l.length) return 0;
        var flot = esFlt(l[0]), s = l.reduce(function (acc, x) { return acc + crudo(x); }, 0);
        return flot ? Flt(s) : s;
      },
      'list.det_head': function (l) { if (!l.length) throw err('det_head: lista vacía'); return l[0]; },
      'string.length': function (s) { return String(s).length; },
      'string.append': function (a, b) { return String(a) + String(b); },
      'int.to_string': function (x) { return String(crudo(x)); },
      'string.int_to_string': function (x) { return String(crudo(x)); },
      'string.from_int': function (x) { return String(crudo(x)); }
    };
    return B;
  }

  function evaluar(e, env, prog, ctx) {
    if (++ctx.pasos > ctx.limite) throw err('el programa no termina (demasiados pasos): revisa la recursión');
    switch (e.k) {
      case 'lit': return e.v;
      case 'atomo': {
        if (e.v === 'yes' || e.v === 'true') return true;
        if (e.v === 'no' || e.v === 'fail') return false;
        if (prog.aridades[e.v + '/0']) return llamar(e.v, [], prog, ctx);
        if (ctx.lib[e.v]) return ctx.lib[e.v]();
        return Atomo(e.v);
      }
      case 'var': {
        if (!(e.v in env)) throw err('la variable ' + e.v + ' no está ligada en esta cláusula');
        return env[e.v];
      }
      case 'neg': {
        var v = evaluar(e.a, env, prog, ctx);
        return esFlt(v) ? Flt(-v.flt) : -crudo(v);
      }
      case 'no': return evaluar(e.a, env, prog, ctx) !== true;
      case 'lista': {
        var items = e.items.map(function (x) { return evaluar(x, env, prog, ctx); });
        if (e.cola) {
          var cola = evaluar(e.cola, env, prog, ctx);
          if (!Array.isArray(cola)) throw err('[H | T]: la cola debe ser una lista');
          return items.concat(cola);
        }
        return items;
      }
      case 'si': return evaluar(e.c, env, prog, ctx) === true
        ? evaluar(e.a, env, prog, ctx)
        : evaluar(e.b, env, prog, ctx);
      case 'op': {
        if (e.op === ',') return evaluar(e.a, env, prog, ctx) === true && evaluar(e.b, env, prog, ctx) === true;
        if (e.op === ';') return evaluar(e.a, env, prog, ctx) === true || evaluar(e.b, env, prog, ctx) === true;
        var a = evaluar(e.a, env, prog, ctx), b = evaluar(e.b, env, prog, ctx);
        if (['=', '\\=', '<', '>', '=<', '>='].indexOf(e.op) !== -1) return comparar(e.op, a, b);
        return aritmetica(e.op, a, b);
      }
      case 'llamada': {
        var args = e.args.map(function (x) { return evaluar(x, env, prog, ctx); });
        var clave = e.nombre + '/' + args.length;
        if (prog.aridades[clave]) return llamar(e.nombre, args, prog, ctx);
        var f = ctx.lib[e.nombre];
        if (f) {
          if (f.length && f.length !== args.length) throw err(e.nombre + ': espera ' + f.length + ' argumento(s)');
          return f.apply(null, args);
        }
        throw err('no conozco la función ' + clave);
      }
    }
    throw err('expresión no soportada');
  }

  function llamar(nombre, args, prog, ctx) {
    if (++ctx.pasos > ctx.limite) throw err('el programa no termina (demasiados pasos): revisa la recursión');
    var cls = prog.porNombre[nombre + '/' + args.length] || [];
    for (var i = 0; i < cls.length; i++) {
      var env = {}, ok = true;
      for (var j = 0; j < args.length; j++) {
        if (!emparejar(cls[i].pats[j], args[j], env)) { ok = false; break; }
      }
      if (!ok) continue;
      return evaluar(cls[i].cuerpo, env, prog, ctx);
    }
    throw err(nombre + ': ninguna cláusula coincide con (' + args.map(mostrar).join(', ') + ')');
  }

  function cargar(src, opciones) {
    opciones = opciones || {};
    var ctx = { pasos: 0, limite: opciones.limite || 400000, salida: '' };
    ctx.lib = BIBLIOTECA(ctx);
    var res = parsear(src);
    var prog = { porNombre: {}, aridades: {}, clausulas: res.clausulas };
    res.clausulas.forEach(function (c) {
      var clave = c.nombre + '/' + c.aridad;
      (prog.porNombre[clave] || (prog.porNombre[clave] = [])).push(c);
      prog.aridades[clave] = true;
    });
    return { prog: prog, ctx: ctx };
  }

  function ejecutar(src, opciones) {
    var cargado;
    try { cargado = cargar(src, opciones); }
    catch (e) { return { ok: false, salida: '', valores: [], error: e.message }; }
    var res = { ok: true, salida: '', valores: [], error: null };
    try {
      // sin main/0 no hay nada que correr: se evalúan las funciones de aridad 0
      Object.keys(cargado.prog.porNombre).forEach(function (clave) {
        if (!/\/0$/.test(clave)) return;
        var nombre = clave.slice(0, -2);
        if (nombre === 'main') return;
        var v = llamar(nombre, [], cargado.prog, cargado.ctx);
        res.valores.push({ nombre: nombre, texto: mostrar(v) });
      });
    } catch (e) {
      res.ok = false;
      res.error = e.message;
    }
    res.salida = cargado.ctx.salida;
    return res;
  }

  function evaluarEn(src, expr, opciones) {
    var cargado;
    try { cargado = cargar(src, opciones); }
    catch (e) { return { ok: false, texto: '', salida: '', error: e.message }; }
    try {
      var pp = new P(tokenizar(String(expr).replace(/\.\s*$/, '')));
      var e = pp.expr(1100);
      var v = evaluar(e, {}, cargado.prog, cargado.ctx);
      return { ok: true, valor: v, texto: mostrar(v), salida: cargado.ctx.salida, error: null };
    } catch (ex) {
      return { ok: false, texto: '', salida: cargado.ctx.salida, error: ex.message };
    }
  }

  window.MiniMercury = {
    ejecutar: ejecutar,
    evaluarEn: evaluarEn,
    mostrar: mostrar,
    nombre: 'Mercury (subconjunto funcional del curso)'
  };
})();
