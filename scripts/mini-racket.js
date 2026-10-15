/*
 * mini-racket.js
 * Física Computacional — intérprete de un SUBCONJUNTO de Racket en JavaScript.
 *
 * No es Racket. Cubre lo que el curso usa: notación prefija, define, lambda/λ,
 * let / let* / letrec / named let, if, cond, and/or/when/unless/begin, quote,
 * listas, vectores, cadenas, recursión y la aritmética del curso.
 *
 * API:  window.MiniRacket.ejecutar(src, opciones?)
 *   -> { ok, valores: [{expr, valor, texto}], salida: "…", error: "…"|null }
 *   opciones.limite  (pasos máximos, default 400000)
 *
 *  window.MiniRacket.evaluarEn(src, expr)   // programa + una expresión extra
 *   -> { ok, texto, error }
 *
 * Limitaciones conocidas: sin módulos, sin continuaciones, sin macros,
 * sin structs, sin contratos, sin números exactos racionales.
 */
(function () {
  'use strict';

  /* ── Lector (tokens → s-expresiones) ───────────────────────── */
  function tokenizar(src) {
    var t = [], i = 0, n = src.length;
    while (i < n) {
      var c = src[i];
      if (c === ';') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '#' && src[i + 1] === '|') { i += 2; while (i < n && !(src[i] === '|' && src[i + 1] === '#')) i++; i += 2; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === '(' || c === '[') { t.push('('); i++; continue; }
      if (c === ')' || c === ']') { t.push(')'); i++; continue; }
      if (c === "'") { t.push("'"); i++; continue; }
      if (c === '"') {
        var s = '"'; i++;
        while (i < n && src[i] !== '"') {
          if (src[i] === '\\') { s += src[i] + src[i + 1]; i += 2; }
          else { s += src[i]; i++; }
        }
        i++; t.push(s + '"'); continue;
      }
      var a = '';
      while (i < n && !/[\s()\[\]";']/.test(src[i])) { a += src[i]; i++; }
      t.push(a);
    }
    return t;
  }

  function Sym(s) { this.s = s; }
  Sym.prototype.toString = function () { return this.s; };
  var simbolos = {};
  function sym(s) { return simbolos[s] || (simbolos[s] = new Sym(s)); }

  function atomo(tk) {
    if (tk[0] === '"') return JSON.parse(tk.replace(/\n/g, '\\n'));
    if (tk === '#t' || tk === '#true') return true;
    if (tk === '#f' || tk === '#false') return false;
    if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(tk)) return parseFloat(tk);
    if (/^[+-]?\d+\/\d+$/.test(tk)) { var p = tk.split('/'); return parseFloat(p[0]) / parseFloat(p[1]); }
    return sym(tk);
  }

  function leer(tokens) {
    var pos = 0;
    function forma() {
      if (pos >= tokens.length) throw new Error('paréntesis sin cerrar: falta )');
      var tk = tokens[pos++];
      if (tk === '(') {
        var lst = [];
        while (tokens[pos] !== ')') {
          if (pos >= tokens.length) throw new Error('paréntesis sin cerrar: falta )');
          lst.push(forma());
        }
        pos++;
        return lst;
      }
      if (tk === ')') throw new Error('paréntesis de más: ) sin abrir');
      if (tk === "'") return [sym('quote'), forma()];
      return atomo(tk);
    }
    var out = [];
    while (pos < tokens.length) out.push(forma());
    return out;
  }

  /* ── Valores ────────────────────────────────────────────────── */
  var NULO = { nulo: true };
  function Par(a, d) { this.a = a; this.d = d; }
  function Cierre(params, resto, cuerpo, env, nombre) {
    this.params = params; this.resto = resto; this.cuerpo = cuerpo; this.env = env; this.nombre = nombre || 'procedimiento';
  }
  function Vacio() {}
  var VOID = new Vacio();

  function lista() {
    var r = NULO;
    for (var i = arguments.length - 1; i >= 0; i--) r = new Par(arguments[i], r);
    return r;
  }
  function deArray(arr) {
    var r = NULO;
    for (var i = arr.length - 1; i >= 0; i--) r = new Par(arr[i], r);
    return r;
  }
  function aArray(v, quien) {
    var out = [];
    while (v instanceof Par) { out.push(v.a); v = v.d; }
    if (v !== NULO) throw new Error((quien || 'esta operación') + ': se esperaba una lista');
    return out;
  }

  function numero(x, quien) {
    if (typeof x !== 'number') throw new Error((quien || 'operación') + ': se esperaba un número, llegó ' + escribir(x));
    return x;
  }

  function escribir(v) {
    if (v === true) return '#t';
    if (v === false) return '#f';
    if (v === NULO) return "'()";
    if (v === VOID || v instanceof Vacio) return '';
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return String(v);
    }
    if (typeof v === 'string') return JSON.stringify(v);
    if (v instanceof Sym) return "'" + v.s;
    if (v instanceof Par) return "'" + interno(v);
    if (Array.isArray(v)) return "'#(" + v.map(interno).join(' ') + ')';
    if (v instanceof Cierre) return '#<procedure:' + v.nombre + '>';
    if (typeof v === 'function') return '#<procedure:' + (v.racketName || 'builtin') + '>';
    return String(v);
  }
  function interno(v) {
    if (v === NULO) return '()';
    if (v instanceof Sym) return v.s;
    if (v instanceof Par) {
      var partes = [], p = v;
      while (p instanceof Par) { partes.push(interno(p.a)); p = p.d; }
      if (p === NULO) return '(' + partes.join(' ') + ')';
      return '(' + partes.join(' ') + ' . ' + interno(p) + ')';
    }
    if (Array.isArray(v)) return '#(' + v.map(interno).join(' ') + ')';
    return escribir(v);
  }
  function mostrar(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Par || v === NULO || Array.isArray(v)) return interno(v);
    if (v instanceof Sym) return v.s;
    return escribir(v);
  }

  function iguales(a, b) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (a instanceof Sym && b instanceof Sym) return a.s === b.s;
    if (a instanceof Par && b instanceof Par) return iguales(a.a, b.a) && iguales(a.d, b.d);
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every(function (x, i) { return iguales(x, b[i]); });
    return false;
  }

  /* ── Entorno ────────────────────────────────────────────────── */
  function Env(padre) { this.vars = Object.create(null); this.padre = padre; }
  Env.prototype.buscar = function (n) {
    var e = this;
    while (e) { if (n in e.vars) return e.vars[n]; e = e.padre; }
    throw new Error(n + ': no está definido');
  };
  Env.prototype.fijar = function (n, v) { this.vars[n] = v; };
  Env.prototype.asignar = function (n, v) {
    var e = this;
    while (e) { if (n in e.vars) { e.vars[n] = v; return; } e = e.padre; }
    throw new Error('set!: ' + n + ' no está definido');
  };

  /* ── Primitivas ─────────────────────────────────────────────── */
  function construirGlobal(ctx) {
    var G = new Env(null);
    function def(nombre, fn, aridad) {
      fn.racketName = nombre;
      if (aridad) fn.aridad = aridad;
      G.fijar(nombre, fn);
    }
    var num = numero;

    def('+', function () { var s = 0; for (var i = 0; i < arguments.length; i++) s += num(arguments[i], '+'); return s; });
    def('*', function () { var s = 1; for (var i = 0; i < arguments.length; i++) s *= num(arguments[i], '*'); return s; });
    def('-', function () {
      if (!arguments.length) throw new Error('-: faltan argumentos');
      if (arguments.length === 1) return -num(arguments[0], '-');
      var s = num(arguments[0], '-');
      for (var i = 1; i < arguments.length; i++) s -= num(arguments[i], '-');
      return s;
    });
    def('/', function () {
      if (arguments.length === 1) return 1 / num(arguments[0], '/');
      var s = num(arguments[0], '/');
      for (var i = 1; i < arguments.length; i++) {
        var d = num(arguments[i], '/');
        if (d === 0) throw new Error('/: división por cero');
        s /= d;
      }
      return s;
    });
    function comp(nombre, f) {
      def(nombre, function () {
        for (var i = 0; i + 1 < arguments.length; i++) {
          if (!f(num(arguments[i], nombre), num(arguments[i + 1], nombre))) return false;
        }
        return true;
      });
    }
    comp('=', function (a, b) { return a === b; });
    comp('<', function (a, b) { return a < b; });
    comp('>', function (a, b) { return a > b; });
    comp('<=', function (a, b) { return a <= b; });
    comp('>=', function (a, b) { return a >= b; });

    def('abs', function (x) { return Math.abs(num(x, 'abs')); });
    def('sqrt', function (x) { return Math.sqrt(num(x, 'sqrt')); });
    def('sqr', function (x) { return num(x, 'sqr') * x; });
    def('expt', function (a, b) { return Math.pow(num(a, 'expt'), num(b, 'expt')); });
    def('exp', function (x) { return Math.exp(num(x, 'exp')); });
    def('log', function (x, b) { return b === undefined ? Math.log(num(x, 'log')) : Math.log(num(x, 'log')) / Math.log(num(b, 'log')); });
    ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].forEach(function (f) {
      def(f, function (x) { return Math[f](num(x, f)); });
    });
    def('max', function () { return Math.max.apply(null, [].map.call(arguments, function (x) { return num(x, 'max'); })); });
    def('min', function () { return Math.min.apply(null, [].map.call(arguments, function (x) { return num(x, 'min'); })); });
    def('floor', function (x) { return Math.floor(num(x, 'floor')); });
    def('ceiling', function (x) { return Math.ceil(num(x, 'ceiling')); });
    def('round', function (x) { var v = num(x, 'round'); var f = Math.floor(v); var d = v - f; if (d === 0.5) return f % 2 === 0 ? f : f + 1; return Math.round(v); });
    def('truncate', function (x) { return Math.trunc(num(x, 'truncate')); });
    def('quotient', function (a, b) { if (num(b, 'quotient') === 0) throw new Error('quotient: división por cero'); return Math.trunc(num(a, 'quotient') / b); });
    def('remainder', function (a, b) { if (num(b, 'remainder') === 0) throw new Error('remainder: división por cero'); return num(a, 'remainder') % b; });
    def('modulo', function (a, b) { if (num(b, 'modulo') === 0) throw new Error('modulo: división por cero'); var r = num(a, 'modulo') % b; return (r !== 0 && (r < 0) !== (b < 0)) ? r + b : r; });
    def('gcd', function () { var g = 0; for (var i = 0; i < arguments.length; i++) { var b = Math.abs(num(arguments[i], 'gcd')); while (b) { var t = g % b; g = b; b = t; } } return g; });
    def('add1', function (x) { return num(x, 'add1') + 1; });
    def('sub1', function (x) { return num(x, 'sub1') - 1; });
    def('exact->inexact', function (x) { return num(x, 'exact->inexact'); });
    def('inexact->exact', function (x) { return num(x, 'inexact->exact'); });
    def('exact-floor', function (x) { return Math.floor(num(x, 'exact-floor')); });
    G.fijar('pi', Math.PI);
    G.fijar('e', Math.E);

    def('zero?', function (x) { return num(x, 'zero?') === 0; });
    def('positive?', function (x) { return num(x, 'positive?') > 0; });
    def('negative?', function (x) { return num(x, 'negative?') < 0; });
    def('even?', function (x) { return num(x, 'even?') % 2 === 0; });
    def('odd?', function (x) { return Math.abs(num(x, 'odd?') % 2) === 1; });
    def('number?', function (x) { return typeof x === 'number'; });
    def('integer?', function (x) { return typeof x === 'number' && Number.isInteger(x); });
    def('string?', function (x) { return typeof x === 'string'; });
    def('symbol?', function (x) { return x instanceof Sym; });
    def('boolean?', function (x) { return x === true || x === false; });
    def('procedure?', function (x) { return typeof x === 'function' || x instanceof Cierre; });
    def('null?', function (x) { return x === NULO; });
    def('empty?', function (x) { return x === NULO; });
    def('pair?', function (x) { return x instanceof Par; });
    def('cons?', function (x) { return x instanceof Par; });
    def('list?', function (x) { while (x instanceof Par) x = x.d; return x === NULO; });
    def('not', function (x) { return x === false; });
    def('eq?', function (a, b) { return a === b || (a instanceof Sym && b instanceof Sym && a.s === b.s) || (typeof a === 'number' && a === b); });
    def('equal?', function (a, b) { return iguales(a, b); });
    def('eqv?', function (a, b) { return iguales(a, b); });

    def('cons', function (a, d) { return new Par(a, d); });
    def('car', function (p) { if (!(p instanceof Par)) throw new Error('car: se esperaba un par, llegó ' + escribir(p)); return p.a; });
    def('cdr', function (p) { if (!(p instanceof Par)) throw new Error('cdr: se esperaba un par, llegó ' + escribir(p)); return p.d; });
    def('first', G.buscar('car'));
    def('rest', G.buscar('cdr'));
    def('cadr', function (p) { return G.buscar('car')(G.buscar('cdr')(p)); });
    def('cddr', function (p) { return G.buscar('cdr')(G.buscar('cdr')(p)); });
    def('caddr', function (p) { return G.buscar('car')(G.buscar('cddr')(p)); });
    def('second', G.buscar('cadr'));
    def('third', G.buscar('caddr'));
    def('list', function () { return deArray([].slice.call(arguments)); });
    G.fijar('empty', NULO);
    G.fijar('null', NULO);
    def('length', function (l) { return aArray(l, 'length').length; });
    def('append', function () {
      var out = [];
      for (var i = 0; i < arguments.length - 1; i++) out = out.concat(aArray(arguments[i], 'append'));
      var ult = arguments[arguments.length - 1];
      var r = ult === undefined ? NULO : ult;
      for (var j = out.length - 1; j >= 0; j--) r = new Par(out[j], r);
      return r;
    });
    def('reverse', function (l) { return deArray(aArray(l, 'reverse').reverse()); });
    def('list-ref', function (l, k) {
      var a = aArray(l, 'list-ref');
      if (k < 0 || k >= a.length) throw new Error('list-ref: índice ' + k + ' fuera de rango');
      return a[k];
    });
    def('list-tail', function (l, k) { var v = l; for (var i = 0; i < k; i++) v = G.buscar('cdr')(v); return v; });
    def('take', function (l, k) { return deArray(aArray(l, 'take').slice(0, k)); });
    def('last', function (l) { var a = aArray(l, 'last'); if (!a.length) throw new Error('last: lista vacía'); return a[a.length - 1]; });
    def('drop-right', function (l, k) { var a = aArray(l, 'drop-right'); return deArray(a.slice(0, Math.max(0, a.length - k))); });
    def('take-right', function (l, k) { var a = aArray(l, 'take-right'); return deArray(a.slice(Math.max(0, a.length - k))); });
    def('make-list', function (n, x) { var o = []; for (var i = 0; i < n; i++) o.push(x); return deArray(o); });
    def('drop', function (l, k) { return deArray(aArray(l, 'drop').slice(k)); });
    def('range', function (a, b, s) {
      var ini = b === undefined ? 0 : a, fin = b === undefined ? a : b, paso = s === undefined ? 1 : s, out = [];
      if (paso === 0) throw new Error('range: paso 0');
      for (var i = ini; paso > 0 ? i < fin : i > fin; i += paso) { out.push(i); if (out.length > 100000) throw new Error('range: demasiados elementos'); }
      return deArray(out);
    });
    def('list->vector', function (l) { return aArray(l, 'list->vector'); });
    def('vector->list', function (v) { return deArray(v.slice()); });
    def('vector', function () { return [].slice.call(arguments); });
    def('make-vector', function (n, x) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = x === undefined ? 0 : x; return a; });
    def('vector-ref', function (v, k) {
      if (!Array.isArray(v)) throw new Error('vector-ref: se esperaba un vector');
      if (k < 0 || k >= v.length) throw new Error('vector-ref: índice ' + k + ' fuera de rango');
      return v[k];
    });
    def('vector-set!', function (v, k, x) { v[k] = x; return VOID; });
    def('vector-length', function (v) { return v.length; });
    def('build-list', function (n, f) {
      var out = [];
      for (var i = 0; i < n; i++) out.push(aplicar(f, [i], ctx));
      return deArray(out);
    });
    def('apply', function (f) {
      var args = [].slice.call(arguments, 1);
      var ultimos = args.length ? aArray(args.pop(), 'apply') : [];
      return aplicar(f, args.concat(ultimos), ctx);
    });
    def('map', function (f) {
      var ls = [].slice.call(arguments, 1).map(function (l) { return aArray(l, 'map'); });
      var n = Math.min.apply(null, ls.map(function (l) { return l.length; }));
      var out = [];
      for (var i = 0; i < n; i++) out.push(aplicar(f, ls.map(function (l) { return l[i]; }), ctx));
      return deArray(out);
    });
    def('for-each', function (f) {
      G.buscar('map').apply(null, arguments);
      return VOID;
    });
    def('filter', function (f, l) {
      return deArray(aArray(l, 'filter').filter(function (x) { return aplicar(f, [x], ctx) !== false; }));
    });
    def('foldl', function (f, ini, l) {
      var acc = ini;
      aArray(l, 'foldl').forEach(function (x) { acc = aplicar(f, [x, acc], ctx); });
      return acc;
    });
    def('foldr', function (f, ini, l) {
      var acc = ini, a = aArray(l, 'foldr');
      for (var i = a.length - 1; i >= 0; i--) acc = aplicar(f, [a[i], acc], ctx);
      return acc;
    });
    def('andmap', function (f, l) { return aArray(l, 'andmap').every(function (x) { return aplicar(f, [x], ctx) !== false; }); });
    def('ormap', function (f, l) { return aArray(l, 'ormap').some(function (x) { return aplicar(f, [x], ctx) !== false; }); });
    def('sort', function (l, f) {
      return deArray(aArray(l, 'sort').slice().sort(function (a, b) { return aplicar(f, [a, b], ctx) !== false ? -1 : 1; }));
    });
    def('member', function (x, l) {
      var v = l;
      while (v instanceof Par) { if (iguales(v.a, x)) return v; v = v.d; }
      return false;
    });

    def('string-append', function () { return [].map.call(arguments, function (s) { return String(s); }).join(''); });
    def('string-length', function (s) { return String(s).length; });
    def('substring', function (s, a, b) { return String(s).substring(a, b === undefined ? undefined : b); });
    def('string=?', function (a, b) { return String(a) === String(b); });
    def('string<?', function (a, b) { return String(a) < String(b); });
    def('number->string', function (x) { return escribir(num(x, 'number->string')); });
    def('string->number', function (s) { var v = parseFloat(s); return isNaN(v) ? false : v; });
    def('string->symbol', function (s) { return sym(String(s)); });
    def('symbol->string', function (s) { return s instanceof Sym ? s.s : String(s); });
    def('string-upcase', function (s) { return String(s).toUpperCase(); });
    def('string-downcase', function (s) { return String(s).toLowerCase(); });
    def('format', function (f) {
      var args = [].slice.call(arguments, 1), i = 0;
      return String(f).replace(/~[av]/g, function () { return mostrar(args[i++]); });
    });

    def('display', function (x) { ctx.salida += mostrar(x); return VOID; });
    def('displayln', function (x) { ctx.salida += mostrar(x) + '\n'; return VOID; });
    def('write', function (x) { ctx.salida += escribir(x); return VOID; });
    def('newline', function () { ctx.salida += '\n'; return VOID; });
    def('printf', function () { ctx.salida += G.buscar('format').apply(null, arguments); return VOID; });
    def('void', function () { return VOID; });
    def('error', function () {
      var partes = [].map.call(arguments, mostrar);
      throw new Error(partes.join(' ') || 'error');
    });
    def('identity', function (x) { return x; });
    def('exact?', function () { return true; });
    def('random', function (n) { return n === undefined ? Math.random() : Math.floor(Math.random() * n); });

    return G;
  }

  /* ── Evaluador ──────────────────────────────────────────────── */
  function esSym(x, s) { return x instanceof Sym && x.s === s; }

  function evaluar(expr, env, ctx) {
    for (;;) {
      if (++ctx.pasos > ctx.limite) throw new Error('el programa no termina (demasiados pasos): revisa la recursión');
      if (expr instanceof Sym) return env.buscar(expr.s);
      if (!Array.isArray(expr)) return expr;
      if (expr.length === 0) throw new Error('() no es una expresión válida');

      var cab = expr[0];
      if (cab instanceof Sym) {
        var f = cab.s;
        if (f === 'quote') return aDatos(expr[1]);
        if (f === 'if') {
          var prueba = evaluar(expr[1], env, ctx);
          if (prueba !== false) { expr = expr[2]; }
          else if (expr.length > 3) { expr = expr[3]; }
          else return VOID;
          continue;
        }
        if (f === 'define') {
          var objetivo = expr[1];
          if (Array.isArray(objetivo)) {
            var nombre = objetivo[0].s;
            env.fijar(nombre, hacerCierre(objetivo.slice(1), expr.slice(2), env, nombre));
          } else {
            env.fijar(objetivo.s, expr.length > 2 ? evaluar(expr[2], env, ctx) : VOID);
            var v = env.buscar(objetivo.s);
            if (v instanceof Cierre && v.nombre === 'procedimiento') v.nombre = objetivo.s;
          }
          return VOID;
        }
        if (f === 'lambda' || f === 'λ') {
          var ps = expr[1];
          return hacerCierre(Array.isArray(ps) ? ps : ps, expr.slice(2), env);
        }
        if (f === 'set!') { env.asignar(expr[1].s, evaluar(expr[2], env, ctx)); return VOID; }
        if (f === 'begin') {
          if (expr.length === 1) return VOID;
          for (var i = 1; i < expr.length - 1; i++) evaluar(expr[i], env, ctx);
          expr = expr[expr.length - 1]; continue;
        }
        if (f === 'when' || f === 'unless') {
          var c = evaluar(expr[1], env, ctx) !== false;
          if (f === 'unless') c = !c;
          if (!c) return VOID;
          expr = [sym('begin')].concat(expr.slice(2)); continue;
        }
        if (f === 'and') {
          if (expr.length === 1) return true;
          for (var ai = 1; ai < expr.length - 1; ai++) if (evaluar(expr[ai], env, ctx) === false) return false;
          expr = expr[expr.length - 1]; continue;
        }
        if (f === 'or') {
          if (expr.length === 1) return false;
          for (var oi = 1; oi < expr.length - 1; oi++) {
            var ov = evaluar(expr[oi], env, ctx);
            if (ov !== false) return ov;
          }
          expr = expr[expr.length - 1]; continue;
        }
        if (f === 'cond') {
          var elegido = null;
          for (var ci = 1; ci < expr.length; ci++) {
            var clausula = expr[ci];
            if (!Array.isArray(clausula)) throw new Error('cond: cada cláusula va entre [ ] o ( )');
            if (esSym(clausula[0], 'else')) { elegido = clausula.slice(1); break; }
            if (evaluar(clausula[0], env, ctx) !== false) {
              elegido = clausula.length > 1 ? clausula.slice(1) : [clausula[0]];
              break;
            }
          }
          if (!elegido) return VOID;
          expr = [sym('begin')].concat(elegido); continue;
        }
        if (f === 'case') {
          var clave = evaluar(expr[1], env, ctx), hecho = null;
          for (var ki = 2; ki < expr.length; ki++) {
            var cl = expr[ki];
            if (esSym(cl[0], 'else')) { hecho = cl.slice(1); break; }
            var datos = aArrayDatos(cl[0]);
            if (datos.some(function (d) { return iguales(d, clave); })) { hecho = cl.slice(1); break; }
          }
          if (!hecho) return VOID;
          expr = [sym('begin')].concat(hecho); continue;
        }
        if (f === 'let') {
          if (expr[1] instanceof Sym) {          // named let
            var nom = expr[1].s, ligas = expr[2] || [];
            var ps2 = ligas.map(function (l) { return l[0]; });
            var args0 = ligas.map(function (l) { return evaluar(l[1], env, ctx); });
            var envL = new Env(env);
            var cl2 = hacerCierre(ps2, expr.slice(3), envL, nom);
            envL.fijar(nom, cl2);
            return aplicar(cl2, args0, ctx);
          }
          var nuevo = new Env(env);
          (expr[1] || []).forEach(function (l) {
            if (l instanceof Sym) nuevo.fijar(l.s, VOID);
            else nuevo.fijar(l[0].s, evaluar(l[1], env, ctx));
          });
          env = nuevo; expr = [sym('begin')].concat(expr.slice(2)); continue;
        }
        if (f === 'let*') {
          var e2 = env;
          (expr[1] || []).forEach(function (l) {
            var ne = new Env(e2);
            ne.fijar(l[0].s, evaluar(l[1], e2, ctx));
            e2 = ne;
          });
          env = e2; expr = [sym('begin')].concat(expr.slice(2)); continue;
        }
        if (f === 'letrec' || f === 'letrec*') {
          var e3 = new Env(env);
          (expr[1] || []).forEach(function (l) { e3.fijar(l[0].s, VOID); });
          (expr[1] || []).forEach(function (l) { e3.fijar(l[0].s, evaluar(l[1], e3, ctx)); });
          env = e3; expr = [sym('begin')].concat(expr.slice(2)); continue;
        }
        if (f === 'define-values' || f === 'require' || f === 'provide' || f === '#lang') return VOID;
      }

      var proc = evaluar(cab, env, ctx);
      var args = [];
      for (var k = 1; k < expr.length; k++) args.push(evaluar(expr[k], env, ctx));

      if (proc instanceof Cierre) {          // llamada en cola: reusa el bucle
        env = ligar(proc, args);
        var cuerpo = proc.cuerpo;
        for (var b = 0; b < cuerpo.length - 1; b++) evaluar(cuerpo[b], env, ctx);
        expr = cuerpo[cuerpo.length - 1];
        continue;
      }
      return aplicarPrim(proc, args);
    }
  }

  function hacerCierre(params, cuerpo, env, nombre) {
    var fijos = [], resto = null;
    if (params instanceof Sym) resto = params.s;
    else {
      for (var i = 0; i < params.length; i++) {
        if (esSym(params[i], '.')) { resto = params[i + 1].s; break; }
        fijos.push(params[i].s);
      }
    }
    if (!cuerpo.length) cuerpo = [VOID];
    return new Cierre(fijos, resto, cuerpo, env, nombre);
  }

  function ligar(proc, args) {
    var env = new Env(proc.env);
    if (!proc.resto && args.length !== proc.params.length) {
      throw new Error(proc.nombre + ': espera ' + proc.params.length + ' argumento(s), recibió ' + args.length);
    }
    if (proc.resto && args.length < proc.params.length) {
      throw new Error(proc.nombre + ': espera al menos ' + proc.params.length + ' argumento(s), recibió ' + args.length);
    }
    proc.params.forEach(function (p, i) { env.fijar(p, args[i]); });
    if (proc.resto) env.fijar(proc.resto, deArray(args.slice(proc.params.length)));
    return env;
  }

  function aplicarPrim(proc, args) {
    if (typeof proc !== 'function') throw new Error('no es un procedimiento: ' + escribir(proc));
    return proc.apply(null, args);
  }

  function aplicar(proc, args, ctx) {
    if (proc instanceof Cierre) {
      var env = ligar(proc, args), r = VOID;
      proc.cuerpo.forEach(function (b) { r = evaluar(b, env, ctx); });
      return r;
    }
    return aplicarPrim(proc, args);
  }

  function aDatos(x) {
    if (Array.isArray(x)) return deArray(x.map(aDatos));
    return x;
  }
  function aArrayDatos(x) { return Array.isArray(x) ? x.map(aDatos) : [aDatos(x)]; }

  /* ── API ────────────────────────────────────────────────────── */
  function ejecutar(src, opciones) {
    opciones = opciones || {};
    var ctx = { salida: '', pasos: 0, limite: opciones.limite || 400000 };
    var res = { ok: true, valores: [], salida: '', error: null };
    var formas;
    try {
      formas = leer(tokenizar(String(src).replace(/^\s*#lang[^\n]*\n/, '\n')));
    } catch (e) {
      return { ok: false, valores: [], salida: '', error: 'Error de lectura — ' + e.message };
    }
    var G = construirGlobal(ctx);
    if (opciones.env) Object.keys(opciones.env).forEach(function (k) { G.fijar(k, opciones.env[k]); });
    try {
      formas.forEach(function (fm) {
        var v = evaluar(fm, G, ctx);
        if (!(v instanceof Vacio)) res.valores.push({ valor: v, texto: escribir(v) });
      });
    } catch (e) {
      res.ok = false;
      res.error = e.message;
    }
    res.salida = ctx.salida;
    res.env = G;
    res.ctx = ctx;
    return res;
  }

  function evaluarEn(src, expr, opciones) {
    var base = ejecutar(src, opciones);
    if (!base.ok) return { ok: false, texto: '', error: base.error, salida: base.salida };
    try {
      var formas = leer(tokenizar(expr));
      var v = VOID;
      formas.forEach(function (fm) { v = evaluar(fm, base.env, base.ctx); });
      return { ok: true, valor: v, texto: escribir(v), salida: base.ctx.salida, error: null };
    } catch (e) {
      return { ok: false, texto: '', error: e.message, salida: base.ctx.salida };
    }
  }

  window.MiniRacket = {
    ejecutar: ejecutar,
    evaluarEn: evaluarEn,
    escribir: escribir,
    mostrar: mostrar,
    nombre: 'Racket (subconjunto del curso)'
  };
})();
