/*
 * mini-haskell.js
 * Física Computacional — intérprete de un SUBCONJUNTO de Haskell en JavaScript.
 *
 * No es GHC, y no es perezoso: evalúa con llamada por valor. Cubre lo que el
 * curso usa: ecuaciones con varias cláusulas y patrones, guardas, where, let…in,
 * case…of, lambdas, secciones de operador, listas / tuplas / Maybe, rangos
 * [a..b], y un Prelude reducido (map, filter, foldr, zipWith, …).
 *
 * API:  window.MiniHaskell.ejecutar(src)          -> { ok, salida, error, env }
 *       window.MiniHaskell.evaluarEn(src, expr)   -> { ok, texto, valor, error }
 *
 * Limitaciones: sin clases de tipos propias, sin listas infinitas, sin do-notation
 * (salvo un main de putStrLn/print por línea), sin data declarations propias,
 * sin comprobación de tipos: las firmas `::` se leen y se ignoran.
 */
(function () {
  'use strict';

  /* ══ Valores ══════════════════════════════════════════════════
     número → number · Bool → true/false · Char → {ch} · String → JS string
     lista  → array   · tupla → {tup:[…]}  · Maybe → {con:'Just'|'Nothing', args}
     función→ JS function currificada                                       */
  function Char(c) { return { ch: c }; }
  function esChar(v) { return v && typeof v === 'object' && typeof v.ch === 'string'; }
  function esTupla(v) { return v && typeof v === 'object' && Array.isArray(v.tup); }
  function esCon(v) { return v && typeof v === 'object' && typeof v.con === 'string'; }
  function Con(c, args) { return { con: c, args: args || [] }; }

  function lista(v) {                        // vista de lista sobre array o string
    if (typeof v === 'string') { var o = []; for (var i = 0; i < v.length; i++) o.push(Char(v[i])); return o; }
    if (Array.isArray(v)) return v;
    throw err('se esperaba una lista, llegó ' + mostrar(v));
  }
  function empaquetar(arr) {                 // array de Chars → string
    if (arr.length && arr.every(esChar)) return arr.map(function (c) { return c.ch; }).join('');
    return arr;
  }
  function err(m) { var e = new Error(m); e.haskell = true; return e; }

  function mostrar(v, dentro) {
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return (v < 0 && dentro) ? '(' + v + ')' : String(v);
      var s = String(v);
      if (s.indexOf('.') === -1 && s.indexOf('e') === -1) s += '.0';
      return (v < 0 && dentro) ? '(' + s + ')' : s;
    }
    if (typeof v === 'string') return JSON.stringify(v);
    if (esChar(v)) return "'" + v.ch + "'";
    if (Array.isArray(v)) {
      if (v.length && v.every(esChar)) return JSON.stringify(v.map(function (c) { return c.ch; }).join(''));
      return '[' + v.map(function (x) { return mostrar(x); }).join(',') + ']';
    }
    if (esTupla(v)) return '(' + v.tup.map(function (x) { return mostrar(x); }).join(',') + ')';
    if (esCon(v)) {
      if (!v.args.length) return v.con;
      var t = v.con + ' ' + v.args.map(function (x) { return mostrar(x, true); }).join(' ');
      return dentro ? '(' + t + ')' : t;
    }
    if (typeof v === 'function') return '<función>';
    if (v === undefined || v === null) return '()';
    return String(v);
  }

  function igual(a, b) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (esChar(a) && esChar(b)) return a.ch === b.ch;
    if (typeof a === 'string' || typeof b === 'string' || Array.isArray(a) || Array.isArray(b)) {
      if (!(Array.isArray(a) || typeof a === 'string') || !(Array.isArray(b) || typeof b === 'string')) return false;
      var la = lista(a), lb = lista(b);
      return la.length === lb.length && la.every(function (x, i) { return igual(x, lb[i]); });
    }
    if (esTupla(a) && esTupla(b)) return a.tup.length === b.tup.length && a.tup.every(function (x, i) { return igual(x, b.tup[i]); });
    if (esCon(a) && esCon(b)) return a.con === b.con && a.args.length === b.args.length && a.args.every(function (x, i) { return igual(x, b.args[i]); });
    return false;
  }
  function comparar(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
    if (esChar(a) && esChar(b)) return a.ch < b.ch ? -1 : a.ch > b.ch ? 1 : 0;
    if (a === false && b === true) return -1;
    if (a === true && b === false) return 1;
    if (Array.isArray(a) || typeof a === 'string') {
      var la = lista(a), lb = lista(b);
      for (var i = 0; i < Math.min(la.length, lb.length); i++) {
        var c = comparar(la[i], lb[i]);
        if (c !== 0) return c;
      }
      return la.length - lb.length === 0 ? 0 : (la.length < lb.length ? -1 : 1);
    }
    if (esTupla(a) && esTupla(b)) {
      for (var j = 0; j < a.tup.length; j++) {
        var cc = comparar(a.tup[j], b.tup[j]);
        if (cc !== 0) return cc;
      }
      return 0;
    }
    if (igual(a, b)) return 0;
    throw err('no se pueden comparar estos valores');
  }

  /* ══ Léxico ══════════════════════════════════════════════════ */
  var SIMB = '!#$%&*+./<=>?@\\^|-~:';
  function tokens(linea) {
    var t = [], i = 0, n = linea.length;
    while (i < n) {
      var c = linea[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '-' && linea[i + 1] === '-' && !SIMB.includes(linea[i + 2] || ' ')) break; // comentario
      if (/[0-9]/.test(c)) {
        var num = '';
        while (i < n && /[0-9]/.test(linea[i])) num += linea[i++];
        if (linea[i] === '.' && /[0-9]/.test(linea[i + 1] || '')) { num += linea[i++]; while (i < n && /[0-9]/.test(linea[i])) num += linea[i++]; }
        if (/[eE]/.test(linea[i] || '') && /[0-9+-]/.test(linea[i + 1] || '')) { num += linea[i++]; if (/[+-]/.test(linea[i])) num += linea[i++]; while (i < n && /[0-9]/.test(linea[i])) num += linea[i++]; }
        t.push({ t: 'num', v: parseFloat(num) }); continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var id = '';
        while (i < n && /[A-Za-z0-9_']/.test(linea[i])) id += linea[i++];
        t.push({ t: /[A-Z]/.test(id[0]) ? 'con' : 'id', v: id }); continue;
      }
      if (c === '"') {
        var s = ''; i++;
        while (i < n && linea[i] !== '"') {
          if (linea[i] === '\\') { s += JSON.parse('"\\' + linea[i + 1] + '"'); i += 2; }
          else s += linea[i++];
        }
        i++; t.push({ t: 'str', v: s }); continue;
      }
      if (c === "'" ) {
        var ch;
        if (linea[i + 1] === '\\') { ch = JSON.parse('"\\' + linea[i + 2] + '"'); i += 4; }
        else { ch = linea[i + 1]; i += 3; }
        t.push({ t: 'char', v: ch }); continue;
      }
      if ('()[],;`'.includes(c)) { t.push({ t: c, v: c }); i++; continue; }
      if (SIMB.includes(c)) {
        var op = '';
        while (i < n && SIMB.includes(linea[i])) op += linea[i++];
        t.push({ t: 'op', v: op }); continue;
      }
      throw err('carácter inesperado: ' + c);
    }
    return t;
  }

  /* ══ Bloques por indentación ══════════════════════════════════
     Devuelve declaraciones: { tokens:[…], sangria } agrupando
     continuaciones (líneas más indentadas) en la misma declaración,
     pero separando bloques `where`.                                */
  function lineas(src) {
    return String(src).split('\n').map(function (l, i) {
      var sinCom = l;
      var sangria = l.length - l.replace(/^\s*/, '').length;
      return { texto: sinCom, num: i + 1, sangria: sangria, vacia: !l.trim() || /^\s*--/.test(l) };
    }).filter(function (l) { return !l.vacia; });
  }

  function declaraciones(src) {
    var ls = lineas(src), decls = [], actual = null;
    ls.forEach(function (l) {
      if (!actual || l.sangria <= actual.sangria) {
        actual = { sangria: l.sangria, lineas: [l] };
        decls.push(actual);
      } else {
        actual.lineas.push(l);
      }
    });
    return decls;
  }

  /* ══ Parser de expresiones ══════════════════════════════════ */
  var PREC = {
    '$': [0, 'r'], '||': [2, 'r'], '&&': [3, 'r'],
    '==': [4, 'n'], '/=': [4, 'n'], '<': [4, 'n'], '<=': [4, 'n'], '>': [4, 'n'], '>=': [4, 'n'],
    ':': [5, 'r'], '++': [5, 'r'],
    '+': [6, 'l'], '-': [6, 'l'],
    '*': [7, 'l'], '/': [7, 'l'],
    '^': [8, 'r'], '**': [8, 'r'], '^^': [8, 'r'],
    '.': [9, 'r'], '!!': [9, 'l']
  };
  var PREC_BT = { div: [7, 'l'], mod: [7, 'l'], quot: [7, 'l'], rem: [7, 'l'], elem: [4, 'n'], notElem: [4, 'n'], gcd: [7, 'l'], lcm: [7, 'l'], max: [6, 'l'], min: [6, 'l'] };

  function Parser(ts) { this.ts = ts; this.i = 0; }
  Parser.prototype.ojo = function (k) { return this.ts[this.i + (k || 0)]; };
  Parser.prototype.es = function (t, v) { var x = this.ojo(); return x && x.t === t && (v === undefined || x.v === v); };
  Parser.prototype.come = function (t, v) {
    if (!this.es(t, v)) throw err('se esperaba ' + (v || t) + (this.ojo() ? ', llegó "' + this.ojo().v + '"' : ' al final de la expresión'));
    return this.ts[this.i++];
  };
  Parser.prototype.fin = function () {
    while (this.ts[this.i] && this.ts[this.i].t === ';') this.i++;
    return this.i >= this.ts.length;
  };

  Parser.prototype.expr = function (prec) {
    prec = prec || 0;
    var izq = this.aplicacion();
    for (;;) {
      var tk = this.ojo(), nombre = null, info = null;
      if (tk && tk.t === 'op' && PREC[tk.v]) { nombre = tk.v; info = PREC[tk.v]; }
      else if (tk && tk.t === '`') {
        var id = this.ojo(1);
        nombre = id && id.v;
        info = (nombre && PREC_BT[nombre]) || [9, 'l'];
      }
      if (!nombre || info[0] < prec) return izq;
      if (tk.t === '`') { this.i += 3; } else { this.i++; }
      var siguiente = info[1] === 'r' ? info[0] : info[0] + 1;
      var der = this.expr(siguiente);
      izq = { k: 'bin', op: nombre, a: izq, b: der };
      if (info[1] === 'n') return izq;
    }
  };

  Parser.prototype.aplicacion = function () {
    if (this.es('op', '-')) { this.i++; return { k: 'neg', a: this.aplicacion() }; }
    if (this.es('id', 'if')) {
      this.i++;
      var c = this.expr(0); this.come('id', 'then');
      var t = this.expr(0); this.come('id', 'else');
      return { k: 'if', c: c, t: t, e: this.expr(0) };
    }
    if (this.es('id', 'do')) {
      this.i++;
      var pasos = [];
      for (;;) {
        pasos.push(this.expr(0));
        if (this.es(';')) { this.i++; if (this.fin()) break; continue; }
        break;
      }
      return { k: 'do', pasos: pasos };
    }
    if (this.es('id', 'let')) {
      this.i++;
      var ligas = [];
      for (;;) {
        ligas.push(this.ecuacionInline());
        if (this.es(';')) { this.i++; if (this.es('id', 'in')) break; continue; }
        break;
      }
      this.come('id', 'in');
      return { k: 'let', ligas: ligas, cuerpo: this.expr(0) };
    }
    if (this.es('id', 'case')) {
      this.i++;
      var suj = this.expr(0);
      this.come('id', 'of');
      var alts = [];
      for (;;) {
        var pat = this.patron();
        var guardas = null;
        if (this.es('op', '|')) {
          guardas = [];
          while (this.es('op', '|')) {
            this.i++;
            var g = this.expr(0);
            this.come('op', '->');
            guardas.push({ g: g, e: this.expr(0) });
          }
        } else {
          this.come('op', '->');
          guardas = [{ g: null, e: this.expr(0) }];
        }
        alts.push({ pat: pat, guardas: guardas });
        if (this.es(';')) { this.i++; if (this.fin()) break; continue; }
        break;
      }
      return { k: 'case', suj: suj, alts: alts };
    }
    if (this.es('op', '\\')) {
      this.i++;
      var ps = [];
      while (!this.es('op', '->')) ps.push(this.patron());
      this.come('op', '->');
      return { k: 'lam', pats: ps, cuerpo: this.expr(0) };
    }

    var f = this.atomo(), args = [];
    for (;;) {
      var tk = this.ojo();
      if (!tk) break;
      if (tk.t === 'op' || tk.t === ')' || tk.t === ']' || tk.t === ',' || tk.t === ';' || tk.t === '`') break;
      if (tk.t === 'id' && ['then', 'else', 'of', 'in', 'where'].indexOf(tk.v) !== -1) break;
      args.push(this.atomo());
    }
    return args.length ? { k: 'app', f: f, args: args } : f;
  };

  Parser.prototype.atomo = function () {
    var tk = this.ojo();
    if (!tk) throw err('expresión incompleta');
    if (tk.t === 'num') { this.i++; return { k: 'lit', v: tk.v }; }
    if (tk.t === 'str') { this.i++; return { k: 'lit', v: tk.v }; }
    if (tk.t === 'char') { this.i++; return { k: 'lit', v: Char(tk.v) }; }
    if (tk.t === 'id') { this.i++; return { k: 'var', v: tk.v }; }
    if (tk.t === 'con') { this.i++; return { k: 'con', v: tk.v }; }
    if (tk.t === '(') {
      this.i++;
      if (this.es(')')) { this.i++; return { k: 'lit', v: { tup: [] } }; }
      // (op) · (op e) sección derecha · (e op) sección izquierda
      if (this.es('op') && PREC[this.ojo().v] && this.ojo().v !== '-') {
        var op = this.come('op').v;
        if (this.es(')')) { this.i++; return { k: 'opvar', op: op }; }
        var d = this.expr(0); this.come(')');
        return { k: 'secD', op: op, b: d };
      }
      if (this.es('`')) {                    // (`elem` xs) → sección derecha
        var opbt = this.ojo(1).v;
        this.i += 3;
        if (this.es(')')) { this.i++; return { k: 'var', v: opbt }; }
        var dbt = this.expr(0); this.come(')');
        return { k: 'secD', op: opbt, b: dbt };
      }
      var e = this.expr(0);
      if (this.es(',')) {
        var partes = [e];
        while (this.es(',')) { this.i++; partes.push(this.expr(0)); }
        this.come(')');
        return { k: 'tup', partes: partes };
      }
      if (this.es('op') && PREC[this.ojo().v] && this.ojo(1) && this.ojo(1).t === ')') {
        var opi = this.come('op').v; this.come(')');
        return { k: 'secI', op: opi, a: e };
      }
      if (this.es('`')) {
        var g = this.ojo(1);
        if (this.ojo(3) && this.ojo(3).t === ')') { this.i += 4; return { k: 'secI', op: g.v, a: e, bt: true }; }
      }
      this.come(')');
      return e;
    }
    if (tk.t === '[') {
      this.i++;
      if (this.es(']')) { this.i++; return { k: 'lit', v: [] }; }
      var prim = this.expr(0);
      if (this.es('op', '|')) {              // comprensión de lista
        this.i++;
        var cals = [];
        for (;;) {
          var marca = this.i, gen = false;
          try {
            var pg = this.patron();
            if (this.es('op', '<-')) {
              this.i++;
              cals.push({ g: 'gen', pat: pg, e: this.expr(0) });
              gen = true;
            }
          } catch (e) { gen = false; }
          if (!gen) { this.i = marca; cals.push({ g: 'cond', e: this.expr(0) }); }
          if (this.es(',')) { this.i++; continue; }
          break;
        }
        this.come(']');
        return { k: 'compr', cuerpo: prim, cals: cals };
      }
      if (this.es('op', '..')) {
        this.i++;
        var hasta = this.es(']') ? null : this.expr(0);
        this.come(']');
        return { k: 'rango', de: prim, a: hasta };
      }
      if (this.es(',')) {
        this.i++;
        var seg = this.expr(0);
        if (this.es('op', '..')) {
          this.i++;
          var h2 = this.es(']') ? null : this.expr(0);
          this.come(']');
          return { k: 'rango', de: prim, paso: seg, a: h2 };
        }
        var items = [prim, seg];
        while (this.es(',')) { this.i++; items.push(this.expr(0)); }
        this.come(']');
        return { k: 'listaE', items: items };
      }
      this.come(']');
      return { k: 'listaE', items: [prim] };
    }
    throw err('no entiendo "' + tk.v + '" aquí');
  };

  /* ── Patrones ── */
  Parser.prototype.patron = function () {
    var p = this.patronAt();
    if (this.es('op', ':')) {
      this.i++;
      return { p: 'cons', cab: p, cola: this.patron() };
    }
    return p;
  };
  Parser.prototype.patronAt = function () {
    var tk = this.ojo();
    if (!tk) throw err('patrón incompleto');
    if (tk.t === 'num') { this.i++; return { p: 'lit', v: tk.v }; }
    if (tk.t === 'str') { this.i++; return { p: 'lit', v: tk.v }; }
    if (tk.t === 'char') { this.i++; return { p: 'lit', v: Char(tk.v) }; }
    if (tk.t === 'op' && tk.v === '-' && this.ojo(1) && this.ojo(1).t === 'num') { this.i += 2; return { p: 'lit', v: -this.ts[this.i - 1].v }; }
    if (tk.t === 'id') { this.i++; return tk.v === '_' ? { p: 'comodin' } : { p: 'var', v: tk.v }; }
    if (tk.t === 'con') {
      this.i++;
      var args = [];
      while (this.ojo() && (this.ojo().t === 'id' || this.ojo().t === 'num' || this.ojo().t === 'con' || this.ojo().t === '(' || this.ojo().t === '[')) {
        args.push(this.patronAt());
      }
      if (tk.v === 'True') return { p: 'lit', v: true };
      if (tk.v === 'False') return { p: 'lit', v: false };
      return { p: 'con', con: tk.v, args: args };
    }
    if (tk.t === '(') {
      this.i++;
      if (this.es(')')) { this.i++; return { p: 'lit', v: { tup: [] } }; }
      var p1 = this.patron();
      if (this.es(',')) {
        var ps = [p1];
        while (this.es(',')) { this.i++; ps.push(this.patron()); }
        this.come(')');
        return { p: 'tup', partes: ps };
      }
      this.come(')');
      return p1;
    }
    if (tk.t === '[') {
      this.i++;
      if (this.es(']')) { this.i++; return { p: 'listaVacia' }; }
      var items = [this.patron()];
      while (this.es(',')) { this.i++; items.push(this.patron()); }
      this.come(']');
      return { p: 'listaFija', items: items };
    }
    throw err('patrón no soportado cerca de "' + tk.v + '"');
  };

  /* ── Ecuación en una línea (para let / ;) ── */
  Parser.prototype.ecuacionInline = function () {
    var nombre = this.come('id').v, pats = [];
    while (!this.es('op', '=')) pats.push(this.patron());
    this.come('op', '=');
    return { nombre: nombre, pats: pats, guardas: [{ g: null, e: this.expr(0) }], donde: [] };
  };

  /* ══ Parseo de declaraciones ══════════════════════════════════ */
  function parsearDecl(decl) {
    // separa el bloque `where` del cuerpo
    var lsCuerpo = [], lsWhere = null, sangriaWhere = null;
    decl.lineas.forEach(function (l) {
      if (lsWhere) {
        if (l.sangria >= sangriaWhere) { lsWhere.push(l); return; }
      }
      var m = /^(\s*)(.*?)\bwhere\b(.*)$/.exec(l.texto);
      if (m && !lsWhere && /(^|[\s=|)\]])where\b/.test(l.texto)) {
        var antes = l.texto.slice(0, l.texto.indexOf('where'));
        if (antes.trim()) lsCuerpo.push({ texto: antes, sangria: l.sangria, num: l.num });
        lsWhere = [];
        sangriaWhere = l.sangria + 1;
        // lo que sigue a "where" en la misma línea conserva su columna, para que
        // las definiciones alineadas debajo cuenten como hermanas y no como continuación
        var colResto = l.texto.indexOf('where') + 5;
        var resto = l.texto.slice(colResto);
        if (resto.trim()) lsWhere.push({ texto: new Array(colResto + 1).join(' ') + resto, sangria: sangriaWhere, num: l.num });
        return;
      }
      lsCuerpo.push(l);
    });

    var linea0 = lsCuerpo[0];
    var texto = lsCuerpo.map(function (l) { return l.texto; }).join('\n');
    var ts;
    try { ts = tokensMulti(lsCuerpo); }
    catch (e) { throw err('línea ' + linea0.num + ': ' + e.message); }
    if (!ts.length) return null;

    // firma de tipo: name :: …  (se registra y se ignora)
    var idxDosP = ts.findIndex(function (t) { return t.t === 'op' && t.v === '::'; });
    if (idxDosP > -1 && ts[0].t === 'id' && idxDosP <= 1) {
      return { tipo: 'firma', nombre: ts[0].v, texto: texto };
    }
    if (ts[0].t === 'id' && ['import', 'module'].indexOf(ts[0].v) !== -1) return null;

    var donde = lsWhere ? declaraciones(lsWhere.map(function (l) { return l.texto; }).join('\n')).map(parsearDecl).filter(Boolean) : [];

    var P = new Parser(ts);
    var nombre;
    if (P.es('id')) nombre = P.come('id').v;
    else if (P.es('(')) { P.i++; nombre = P.come('op').v; P.come(')'); }
    else throw err('línea ' + linea0.num + ': no reconozco el lado izquierdo de la definición');

    var pats = [];
    while (!P.es('op', '=') && !P.es('op', '|')) {
      if (P.fin()) throw err('línea ' + linea0.num + ': falta el = de la definición');
      pats.push(P.patron());
    }
    var guardas = [];
    if (P.es('op', '|')) {
      while (P.es('op', '|')) {
        P.i++;
        var g = P.expr(0);
        P.come('op', '=');
        guardas.push({ g: g, e: P.expr(0) });
      }
    } else {
      P.come('op', '=');
      guardas.push({ g: null, e: P.expr(0) });
    }
    if (!P.fin()) throw err('línea ' + linea0.num + ': sobra "' + P.ojo().v + '"');
    return { tipo: 'ecuacion', nombre: nombre, pats: pats, guardas: guardas, donde: donde, texto: texto, linea: linea0.num };
  }

  /* Regla de indentación aproximada: entre dos líneas se inserta un separador
     ';' solo cuando la anterior cierra una expresión y la siguiente empieza
     otra (así se separan las alternativas de case y los pasos de do, pero las
     continuaciones y las guardas siguen pegadas a su línea).                 */
  var CLAVES_ABIERTAS = ['of', 'then', 'else', 'in', 'do', 'where', 'let', 'if', 'case'];
  var CLAVES_CIERRE = ['then', 'else', 'of', 'in', 'where'];
  function tokensMulti(ls) {
    var out = [];
    ls.forEach(function (l) {
      var ts = tokens(l.texto);
      if (!ts.length) return;
      if (out.length) {
        var prev = out[out.length - 1], sig = ts[0];
        var prevCierra = ['op', ',', '(', '[', '`'].indexOf(prev.t) === -1
          && !(prev.t === 'id' && CLAVES_ABIERTAS.indexOf(prev.v) !== -1);
        var sigAbre = ['op', ',', ')', ']', '`'].indexOf(sig.t) === -1
          && !(sig.t === 'id' && CLAVES_CIERRE.indexOf(sig.v) !== -1);
        if (prevCierra && sigAbre) out.push({ t: ';', v: ';' });
      }
      out = out.concat(ts);
    });
    return out;
  }

  /* ══ Entorno y evaluación ══════════════════════════════════ */
  function Env(padre) { this.v = Object.create(null); this.padre = padre; }
  Env.prototype.buscar = function (n) {
    var e = this;
    while (e) { if (n in e.v) return e.v[n]; e = e.padre; }
    throw err('variable no definida: ' + n);
  };
  Env.prototype.tiene = function (n) {
    var e = this;
    while (e) { if (n in e.v) return true; e = e.padre; }
    return false;
  };

  function curry(n, fn, nombre) {
    function paso(recibidos) {
      var f = function (x) {
        var args = recibidos.concat([x]);
        return args.length >= n ? fn.apply(null, args) : paso(args);
      };
      f.haskellName = nombre;
      f.aridad = n - recibidos.length;
      return f;
    }
    return n === 0 ? fn() : paso([]);
  }

  function aplicarV(f, x, ctx) {
    if (++ctx.pasos > ctx.limite) throw err('el programa no termina (demasiados pasos): revisa la recursión');
    if (typeof f !== 'function') throw err('se intentó aplicar algo que no es función: ' + mostrar(f));
    return f(x);
  }

  function emparejar(pat, v, env) {
    switch (pat.p) {
      case 'comodin': return true;
      case 'var': env.v[pat.v] = v; return true;
      case 'lit': return igual(pat.v, v);
      case 'listaVacia': return (Array.isArray(v) && v.length === 0) || v === '';
      case 'cons': {
        var l = (typeof v === 'string' || Array.isArray(v)) ? lista(v) : null;
        if (!l || !l.length) return false;
        var cola = typeof v === 'string' ? v.slice(1) : l.slice(1);
        return emparejar(pat.cab, l[0], env) && emparejar(pat.cola, cola, env);
      }
      case 'listaFija': {
        if (!(Array.isArray(v) || typeof v === 'string')) return false;
        var lf = lista(v);
        if (lf.length !== pat.items.length) return false;
        return pat.items.every(function (p, i) { return emparejar(p, lf[i], env); });
      }
      case 'tup':
        if (!esTupla(v) || v.tup.length !== pat.partes.length) return false;
        return pat.partes.every(function (p, i) { return emparejar(p, v.tup[i], env); });
      case 'con':
        if (!esCon(v) || v.con !== pat.con) return false;
        return pat.args.every(function (p, i) { return emparejar(p, v.args[i], env); });
    }
    return false;
  }

  function evaluar(e, env, ctx) {
    if (++ctx.pasos > ctx.limite) throw err('el programa no termina (demasiados pasos): revisa la recursión');
    switch (e.k) {
      case 'lit': return e.v;
      case 'var': return env.buscar(e.v);
      case 'con': {
        if (e.v === 'True') return true;
        if (e.v === 'False') return false;
        if (env.tiene(e.v)) return env.buscar(e.v);
        return Con(e.v);
      }
      case 'opvar': {
        if (env.tiene(e.op)) return env.buscar(e.op);
        return curry(2, function (a, b) { return operar(e.op, a, b, env, ctx); }, e.op);
      }
      case 'neg': return -numeroDe(evaluar(e.a, env, ctx), 'negación');
      case 'tup': return { tup: e.partes.map(function (p) { return evaluar(p, env, ctx); }) };
      case 'listaE': return empaquetar(e.items.map(function (p) { return evaluar(p, env, ctx); }));
      case 'rango': {
        var de = evaluar(e.de, env, ctx);
        var hasta = e.a ? evaluar(e.a, env, ctx) : null;
        if (hasta === null) throw err('las listas infinitas no están soportadas en este editor');
        var esC = esChar(de);
        var a0 = esC ? de.ch.charCodeAt(0) : numeroDe(de, 'rango');
        var a1 = esC ? hasta.ch.charCodeAt(0) : numeroDe(hasta, 'rango');
        var paso = e.paso ? (esC ? evaluar(e.paso, env, ctx).ch.charCodeAt(0) : numeroDe(evaluar(e.paso, env, ctx), 'rango')) - a0 : 1;
        if (paso === 0) throw err('rango con paso 0');
        var out = [];
        for (var x = a0; paso > 0 ? x <= a1 : x >= a1; x += paso) {
          out.push(esC ? Char(String.fromCharCode(x)) : x);
          if (out.length > 200000) throw err('rango demasiado largo');
        }
        return empaquetar(out);
      }
      case 'if': return evaluar(e.c, env, ctx) === true ? evaluar(e.t, env, ctx) : evaluar(e.e, env, ctx);
      case 'do': {
        var ult = { tup: [] };
        e.pasos.forEach(function (p) { ult = evaluar(p, env, ctx); });
        return ult;
      }
      case 'compr': {
        var salida = [];
        (function recorrer(k, entorno) {
          if (k >= e.cals.length) { salida.push(evaluar(e.cuerpo, entorno, ctx)); return; }
          var c = e.cals[k];
          if (c.g === 'cond') {
            if (evaluar(c.e, entorno, ctx) === true) recorrer(k + 1, entorno);
            return;
          }
          lista(evaluar(c.e, entorno, ctx)).forEach(function (x) {
            var ne = new Env(entorno);
            if (emparejar(c.pat, x, ne)) recorrer(k + 1, ne);
          });
        })(0, env);
        return empaquetar(salida);
      }
      case 'lam': {
        var n = e.pats.length;
        return curry(n, function () {
          var args = [].slice.call(arguments), ne = new Env(env);
          for (var i = 0; i < n; i++) if (!emparejar(e.pats[i], args[i], ne)) throw err('patrón de la lambda no coincide');
          return evaluar(e.cuerpo, ne, ctx);
        }, 'lambda');
      }
      case 'let': {
        var le = new Env(env);
        ligarEcuaciones(e.ligas.map(function (l) { l.tipo = 'ecuacion'; return l; }), le, ctx);
        return evaluar(e.cuerpo, le, ctx);
      }
      case 'case': {
        var s = evaluar(e.suj, env, ctx);
        for (var i = 0; i < e.alts.length; i++) {
          var ne2 = new Env(env);
          if (emparejar(e.alts[i].pat, s, ne2)) {
            var r = elegirGuarda(e.alts[i].guardas, ne2, ctx);
            if (r.hay) return r.valor;
          }
        }
        throw err('case sin alternativa que coincida para ' + mostrar(s));
      }
      case 'secI': {
        var a = evaluar(e.a, env, ctx);
        return function (b) { return operar(e.op, a, b, env, ctx); };
      }
      case 'secD': {
        var b2 = evaluar(e.b, env, ctx);
        return function (a2) { return operar(e.op, a2, b2, env, ctx); };
      }
      case 'bin': {
        if (e.op === '&&') return evaluar(e.a, env, ctx) === true ? evaluar(e.b, env, ctx) : false;
        if (e.op === '||') return evaluar(e.a, env, ctx) === true ? true : evaluar(e.b, env, ctx);
        if (e.op === '$') return aplicarV(evaluar(e.a, env, ctx), evaluar(e.b, env, ctx), ctx);
        return operar(e.op, evaluar(e.a, env, ctx), evaluar(e.b, env, ctx), env, ctx);
      }
      case 'app': {
        var f = evaluar(e.f, env, ctx);
        for (var k = 0; k < e.args.length; k++) {
          var arg = evaluar(e.args[k], env, ctx);
          if (esCon(f) && !f.listo) { f = Con(f.con, f.args.concat([arg])); }
          else f = aplicarV(f, arg, ctx);
        }
        return f;
      }
    }
    throw err('expresión no soportada');
  }

  function numeroDe(v, quien) {
    if (typeof v !== 'number') throw err((quien || 'operación') + ': se esperaba un número, llegó ' + mostrar(v));
    return v;
  }

  function operar(op, a, b, env, ctx) {
    switch (op) {
      case '+': return numeroDe(a, '+') + numeroDe(b, '+');
      case '-': return numeroDe(a, '-') - numeroDe(b, '-');
      case '*': return numeroDe(a, '*') * numeroDe(b, '*');
      case '/': if (numeroDe(b, '/') === 0) throw err('/: división por cero'); return numeroDe(a, '/') / b;
      case '^': case '**': case '^^': return Math.pow(numeroDe(a, '^'), numeroDe(b, '^'));
      case '==': return igual(a, b);
      case '/=': return !igual(a, b);
      case '<': return comparar(a, b) < 0;
      case '<=': return comparar(a, b) <= 0;
      case '>': return comparar(a, b) > 0;
      case '>=': return comparar(a, b) >= 0;
      case ':': {
        if (esChar(a) && (typeof b === 'string')) return a.ch + b;
        if (esChar(a) && Array.isArray(b) && (b.length === 0 || b.every(esChar))) return a.ch + b.map(function (c) { return c.ch; }).join('');
        return [a].concat(lista(b));
      }
      case '++': {
        if (typeof a === 'string' && typeof b === 'string') return a + b;
        if ((typeof a === 'string' || Array.isArray(a)) && (typeof b === 'string' || Array.isArray(b))) return empaquetar(lista(a).concat(lista(b)));
        throw err('++: se esperaban dos listas');
      }
      case '!!': {
        var l = lista(a);
        if (b < 0 || b >= l.length) throw err('!!: índice ' + b + ' fuera de rango');
        return l[b];
      }
      case '.': return function (x) { return aplicarV(a, aplicarV(b, x, ctx), ctx); };
      case '$': return aplicarV(a, b, ctx);
      default:
        if (env && env.tiene(op)) return aplicarV(aplicarV(env.buscar(op), a, ctx), b, ctx);
        throw err('operador no soportado: ' + op);
    }
  }

  function elegirGuarda(guardas, env, ctx) {
    for (var i = 0; i < guardas.length; i++) {
      var g = guardas[i];
      if (!g.g) return { hay: true, valor: evaluar(g.e, env, ctx) };
      if (g.g.k === 'var' && g.g.v === 'otherwise') return { hay: true, valor: evaluar(g.e, env, ctx) };
      if (evaluar(g.g, env, ctx) === true) return { hay: true, valor: evaluar(g.e, env, ctx) };
    }
    return { hay: false };
  }

  function ligarEcuaciones(decls, env, ctx) {
    var grupos = Object.create(null);
    decls.forEach(function (d) {
      if (!d || d.tipo !== 'ecuacion') return;
      (grupos[d.nombre] || (grupos[d.nombre] = [])).push(d);
    });
    Object.keys(grupos).forEach(function (nombre) {
      var cls = grupos[nombre], aridad = cls[0].pats.length;
      if (aridad === 0) {
        var calculado = false, valor;
        Object.defineProperty(env.v, nombre, {
          configurable: true, enumerable: true,
          get: function () {
            if (!calculado) {
              var ne = new Env(env);
              ligarEcuaciones(cls[0].donde, ne, ctx);
              valor = elegirGuarda(cls[0].guardas, ne, ctx).valor;
              calculado = true;
            }
            return valor;
          }
        });
        return;
      }
      env.v[nombre] = curry(aridad, function () {
        var args = [].slice.call(arguments);
        for (var i = 0; i < cls[0].pats.length && false; i++) {}
        for (var c = 0; c < cls.length; c++) {
          var ne = new Env(env), ok = true;
          for (var j = 0; j < aridad; j++) {
            if (!emparejar(cls[c].pats[j], args[j], ne)) { ok = false; break; }
          }
          if (!ok) continue;
          ligarEcuaciones(cls[c].donde, ne, ctx);
          var r = elegirGuarda(cls[c].guardas, ne, ctx);
          if (r.hay) return r.valor;
        }
        throw err(nombre + ': ningún patrón coincide con ' + args.map(function (a) { return mostrar(a, true); }).join(' '));
      }, nombre);
    });
  }

  /* ══ Prelude ══════════════════════════════════════════════════ */
  function prelude(ctx) {
    var G = new Env(null);
    function def(n, ar, fn) { G.v[n] = ar === 0 ? fn() : curry(ar, fn, n); }
    var ap = function (f, x) { return aplicarV(f, x, ctx); };

    def('id', 1, function (x) { return x; });
    def('const', 2, function (a) { return a; });
    def('flip', 3, function (f, a, b) { return ap(ap(f, b), a); });
    def('fst', 1, function (t) { return t.tup[0]; });
    def('snd', 1, function (t) { return t.tup[1]; });
    def('not', 1, function (b) { return b !== true; });
    G.v['otherwise'] = true;
    def('abs', 1, function (x) { return Math.abs(numeroDe(x, 'abs')); });
    def('signum', 1, function (x) { return Math.sign(numeroDe(x, 'signum')); });
    def('negate', 1, function (x) { return -numeroDe(x, 'negate'); });
    def('sqrt', 1, function (x) { return Math.sqrt(numeroDe(x, 'sqrt')); });
    def('exp', 1, function (x) { return Math.exp(numeroDe(x, 'exp')); });
    def('log', 1, function (x) { return Math.log(numeroDe(x, 'log')); });
    ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].forEach(function (f) { def(f, 1, function (x) { return Math[f](numeroDe(x, f)); }); });
    def('atan2', 2, function (a, b) { return Math.atan2(a, b); });
    G.v['pi'] = Math.PI;
    def('div', 2, function (a, b) { if (b === 0) throw err('div: división por cero'); return Math.floor(numeroDe(a, 'div') / b); });
    def('mod', 2, function (a, b) { if (b === 0) throw err('mod: división por cero'); var r = numeroDe(a, 'mod') % b; return (r !== 0 && (r < 0) !== (b < 0)) ? r + b : r; });
    def('quot', 2, function (a, b) { if (b === 0) throw err('quot: división por cero'); return Math.trunc(numeroDe(a, 'quot') / b); });
    def('rem', 2, function (a, b) { if (b === 0) throw err('rem: división por cero'); return numeroDe(a, 'rem') % b; });
    def('divMod', 2, function (a, b) { return { tup: [ap(ap(G.v.div, a), b), ap(ap(G.v.mod, a), b)] }; });
    def('gcd', 2, function (a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; });
    def('lcm', 2, function (a, b) { return a && b ? Math.abs(a * b) / ap(ap(G.v.gcd, a), b) : 0; });
    def('max', 2, function (a, b) { return comparar(a, b) >= 0 ? a : b; });
    def('min', 2, function (a, b) { return comparar(a, b) <= 0 ? a : b; });
    def('succ', 1, function (x) { return esChar(x) ? Char(String.fromCharCode(x.ch.charCodeAt(0) + 1)) : numeroDe(x, 'succ') + 1; });
    def('pred', 1, function (x) { return numeroDe(x, 'pred') - 1; });
    def('even', 1, function (x) { return numeroDe(x, 'even') % 2 === 0; });
    def('odd', 1, function (x) { return Math.abs(numeroDe(x, 'odd') % 2) === 1; });
    def('fromIntegral', 1, function (x) { return numeroDe(x, 'fromIntegral'); });
    def('realToFrac', 1, function (x) { return x; });
    def('toEnum', 1, function (x) { return x; });
    def('fromEnum', 1, function (x) { return esChar(x) ? x.ch.charCodeAt(0) : (x === true ? 1 : x === false ? 0 : x); });
    def('floor', 1, function (x) { return Math.floor(numeroDe(x, 'floor')); });
    def('ceiling', 1, function (x) { return Math.ceil(numeroDe(x, 'ceiling')); });
    def('truncate', 1, function (x) { return Math.trunc(numeroDe(x, 'truncate')); });
    def('round', 1, function (x) {
      var v = numeroDe(x, 'round'), f = Math.floor(v), d = v - f;
      if (d === 0.5) return f % 2 === 0 ? f : f + 1;
      return Math.round(v);
    });

    def('head', 1, function (l) { var a = lista(l); if (!a.length) throw err('head: lista vacía'); return a[0]; });
    def('tail', 1, function (l) { var a = lista(l); if (!a.length) throw err('tail: lista vacía'); return typeof l === 'string' ? l.slice(1) : a.slice(1); });
    def('last', 1, function (l) { var a = lista(l); if (!a.length) throw err('last: lista vacía'); return a[a.length - 1]; });
    def('init', 1, function (l) { var a = lista(l); if (!a.length) throw err('init: lista vacía'); return typeof l === 'string' ? l.slice(0, -1) : a.slice(0, -1); });
    def('null', 1, function (l) { return lista(l).length === 0; });
    def('length', 1, function (l) { return lista(l).length; });
    def('reverse', 1, function (l) { return typeof l === 'string' ? l.split('').reverse().join('') : lista(l).slice().reverse(); });
    def('take', 2, function (n, l) { return typeof l === 'string' ? l.slice(0, Math.max(0, n)) : lista(l).slice(0, Math.max(0, n)); });
    def('drop', 2, function (n, l) { return typeof l === 'string' ? l.slice(Math.max(0, n)) : lista(l).slice(Math.max(0, n)); });
    def('splitAt', 2, function (n, l) { return { tup: [ap(ap(G.v.take, n), l), ap(ap(G.v.drop, n), l)] }; });
    def('map', 2, function (f, l) { return empaquetar(lista(l).map(function (x) { return ap(f, x); })); });
    def('filter', 2, function (f, l) { return empaquetar(lista(l).filter(function (x) { return ap(f, x) === true; })); });
    def('all', 2, function (f, l) { return lista(l).every(function (x) { return ap(f, x) === true; }); });
    def('any', 2, function (f, l) { return lista(l).some(function (x) { return ap(f, x) === true; }); });
    def('and', 1, function (l) { return lista(l).every(function (x) { return x === true; }); });
    def('or', 1, function (l) { return lista(l).some(function (x) { return x === true; }); });
    def('takeWhile', 2, function (f, l) {
      var out = [], a = lista(l);
      for (var i = 0; i < a.length; i++) { if (ap(f, a[i]) !== true) break; out.push(a[i]); }
      return empaquetar(out);
    });
    def('dropWhile', 2, function (f, l) {
      var a = lista(l), i = 0;
      while (i < a.length && ap(f, a[i]) === true) i++;
      return typeof l === 'string' ? l.slice(i) : a.slice(i);
    });
    def('span', 2, function (f, l) { return { tup: [ap(ap(G.v.takeWhile, f), l), ap(ap(G.v.dropWhile, f), l)] }; });
    def('foldr', 3, function (f, z, l) {
      var a = lista(l), acc = z;
      for (var i = a.length - 1; i >= 0; i--) acc = ap(ap(f, a[i]), acc);
      return acc;
    });
    def('foldl', 3, function (f, z, l) {
      var acc = z;
      lista(l).forEach(function (x) { acc = ap(ap(f, acc), x); });
      return acc;
    });
    G.v["foldl'"] = G.v.foldl;
    def('foldr1', 2, function (f, l) {
      var a = lista(l);
      if (!a.length) throw err('foldr1: lista vacía');
      var acc = a[a.length - 1];
      for (var i = a.length - 2; i >= 0; i--) acc = ap(ap(f, a[i]), acc);
      return acc;
    });
    def('foldl1', 2, function (f, l) {
      var a = lista(l);
      if (!a.length) throw err('foldl1: lista vacía');
      var acc = a[0];
      for (var i = 1; i < a.length; i++) acc = ap(ap(f, acc), a[i]);
      return acc;
    });
    def('scanl', 3, function (f, z, l) {
      var out = [z], acc = z;
      lista(l).forEach(function (x) { acc = ap(ap(f, acc), x); out.push(acc); });
      return out;
    });
    def('sum', 1, function (l) { return lista(l).reduce(function (a, b) { return a + numeroDe(b, 'sum'); }, 0); });
    def('product', 1, function (l) { return lista(l).reduce(function (a, b) { return a * numeroDe(b, 'product'); }, 1); });
    def('maximum', 1, function (l) { var a = lista(l); if (!a.length) throw err('maximum: lista vacía'); return a.reduce(function (x, y) { return comparar(x, y) >= 0 ? x : y; }); });
    def('minimum', 1, function (l) { var a = lista(l); if (!a.length) throw err('minimum: lista vacía'); return a.reduce(function (x, y) { return comparar(x, y) <= 0 ? x : y; }); });
    def('elem', 2, function (x, l) { return lista(l).some(function (y) { return igual(x, y); }); });
    def('notElem', 2, function (x, l) { return !lista(l).some(function (y) { return igual(x, y); }); });
    def('zip', 2, function (a, b) {
      var la = lista(a), lb = lista(b), out = [];
      for (var i = 0; i < Math.min(la.length, lb.length); i++) out.push({ tup: [la[i], lb[i]] });
      return out;
    });
    def('zipWith', 3, function (f, a, b) {
      var la = lista(a), lb = lista(b), out = [];
      for (var i = 0; i < Math.min(la.length, lb.length); i++) out.push(ap(ap(f, la[i]), lb[i]));
      return empaquetar(out);
    });
    def('unzip', 1, function (l) {
      var a = lista(l);
      return { tup: [a.map(function (t) { return t.tup[0]; }), a.map(function (t) { return t.tup[1]; })] };
    });
    def('concat', 1, function (l) {
      var a = lista(l);
      if (a.every(function (x) { return typeof x === 'string'; })) return a.join('');
      return empaquetar(a.reduce(function (acc, x) { return acc.concat(lista(x)); }, []));
    });
    def('concatMap', 2, function (f, l) { return ap(G.v.concat, lista(l).map(function (x) { return ap(f, x); })); });
    def('replicate', 2, function (n, x) { var out = []; for (var i = 0; i < n; i++) out.push(x); return empaquetar(out); });
    def('iterate', 3, function () { throw err('iterate genera una lista infinita: no está soportado'); });
    def('lookup', 2, function (k, l) {
      var a = lista(l);
      for (var i = 0; i < a.length; i++) if (igual(a[i].tup[0], k)) return Con('Just', [a[i].tup[1]]);
      return Con('Nothing');
    });
    def('sort', 1, function (l) { return empaquetar(lista(l).slice().sort(comparar)); });
    def('nub', 1, function (l) {
      var out = [];
      lista(l).forEach(function (x) { if (!out.some(function (y) { return igual(x, y); })) out.push(x); });
      return empaquetar(out);
    });
    def('fromMaybe', 2, function (d, m) { return esCon(m) && m.con === 'Just' ? m.args[0] : d; });
    def('maybe', 3, function (d, f, m) { return esCon(m) && m.con === 'Just' ? ap(f, m.args[0]) : d; });
    G.v['Nothing'] = Con('Nothing');
    G.v['Just'] = curry(1, function (x) { return Con('Just', [x]); }, 'Just');
    def('show', 1, function (x) { return mostrar(x); });
    def('read', 1, function (s) { var v = parseFloat(s); if (isNaN(v)) throw err('read: no es un número'); return v; });
    def('words', 1, function (s) { return String(textoDe(s)).trim().split(/\s+/).filter(Boolean); });
    def('unwords', 1, function (l) { return lista(l).map(textoDe).join(' '); });
    def('lines', 1, function (s) { return String(textoDe(s)).split('\n'); });
    def('unlines', 1, function (l) { return lista(l).map(textoDe).join('\n') + '\n'; });
    def('toUpper', 1, function (c) { return Char(c.ch.toUpperCase()); });
    def('toLower', 1, function (c) { return Char(c.ch.toLowerCase()); });
    def('ord', 1, function (c) { return c.ch.charCodeAt(0); });
    def('chr', 1, function (n) { return Char(String.fromCharCode(n)); });
    def('error', 1, function (s) { throw err(textoDe(s)); });
    def('undefined', 0, function () { return { con: 'undefined' }; });

    def('putStrLn', 1, function (s) { ctx.salida += textoDe(s) + '\n'; return { tup: [] }; });
    def('putStr', 1, function (s) { ctx.salida += textoDe(s); return { tup: [] }; });
    def('print', 1, function (x) { ctx.salida += mostrar(x) + '\n'; return { tup: [] }; });
    def('mapM_', 2, function (f, l) { lista(l).forEach(function (x) { ap(f, x); }); return { tup: [] }; });
    def('return', 1, function (x) { return x; });

    return G;
  }

  function textoDe(s) {
    if (typeof s === 'string') return s;
    if (Array.isArray(s)) return s.map(function (c) { return esChar(c) ? c.ch : mostrar(c); }).join('');
    return mostrar(s);
  }

  /* ══ API ══════════════════════════════════════════════════════ */
  function cargar(src, opciones) {
    opciones = opciones || {};
    var ctx = { salida: '', pasos: 0, limite: opciones.limite || 500000 };
    var G = prelude(ctx), env = new Env(G);
    var decls = [], firmas = [];
    var texto = String(src).replace(/\{-[\s\S]*?-\}/g, '');
    declaraciones(texto).forEach(function (d) {
      var p = parsearDecl(d);
      if (!p) return;
      if (p.tipo === 'firma') firmas.push(p);
      else decls.push(p);
    });
    ligarEcuaciones(decls, env, ctx);
    return { env: env, ctx: ctx, decls: decls, firmas: firmas };
  }

  function ejecutar(src, opciones) {
    var cargado;
    try { cargado = cargar(src, opciones); }
    catch (e) { return { ok: false, salida: '', error: e.message, valores: [] }; }
    var res = { ok: true, salida: '', error: null, valores: [], env: cargado.env, ctx: cargado.ctx };
    try {
      if (cargado.env.tiene('main')) cargado.env.buscar('main');
      else {
        // evalúa los valores de aridad 0 definidos por el alumno, para dar retroalimentación
        cargado.decls.forEach(function (d) {
          if (d.pats.length === 0 && d.nombre !== 'main') {
            var v = cargado.env.buscar(d.nombre);
            if (typeof v !== 'function') res.valores.push({ nombre: d.nombre, texto: mostrar(v) });
          }
        });
      }
    } catch (e) {
      res.ok = false; res.error = e.message;
    }
    res.salida = cargado.ctx.salida;
    return res;
  }

  function evaluarEn(src, expr, opciones) {
    var cargado;
    try { cargado = cargar(src, opciones); }
    catch (e) { return { ok: false, texto: '', error: e.message, salida: '' }; }
    try {
      var P = new Parser(tokens(String(expr)));
      var e = P.expr(0);
      var v = evaluar(e, cargado.env, cargado.ctx);
      return { ok: true, valor: v, texto: mostrar(v), salida: cargado.ctx.salida, error: null };
    } catch (ex) {
      return { ok: false, texto: '', error: ex.message, salida: cargado.ctx.salida };
    }
  }

  window.MiniHaskell = {
    ejecutar: ejecutar,
    evaluarEn: evaluarEn,
    mostrar: mostrar,
    nombre: 'Haskell (subconjunto del curso)'
  };
})();
