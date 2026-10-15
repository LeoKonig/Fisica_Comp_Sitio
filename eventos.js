/*
 * eventos.js
 * Física Computacional — banco de eventos aleatorios (acertijos / problemas)
 * que ofrece la ventana emergente "Evento" (ver ventanas-emergentes.js).
 *
 * Cada evento:
 *   id        — clave estable (vive en localStorage vía FisicaSave.resolverEvento). No la cambies una vez publicada.
 *   tema      — id de un nodo de mapa.js (p.ej. "u1t1") para eventos contextuales,
 *               o null para el pool global (puede salir en cualquier tema).
 *   tipo      — "texto" (respuesta corta, se compara contra 'aceptadas') u "opcion" (opción múltiple, 'correcta' = índice)
 *   pregunta  — enunciado
 *   pista     — pista opcional, se puede revelar bajo demanda
 *   aceptadas — (tipo:"texto") lista de respuestas válidas, en minúsculas y sin acentos
 *   opciones / correcta — (tipo:"opcion")
 *
 * Para añadir un evento nuevo, agrega una entrada al array 'pool'. No hace falta
 * tocar ventanas-emergentes.js.
 */
window.EVENTOS = {
  pool: [
    {
      id: 'ev-epsilon-maquina',
      tema: 'u1t1',
      tipo: 'texto',
      pregunta: '¿Cómo se llama el número más pequeño que, sumado a 1.0 en punto flotante, produce un resultado distinto de 1.0?',
      aceptadas: ['epsilon de maquina', 'epsilon maquina', 'maquina epsilon', 'epsilon_mach', 'epsilon de la maquina', 'epsilon'],
      pista: 'Vive pegado al uno — en el Códice se llama "El vacío junto al uno".'
    },
    {
      id: 'ev-cancelacion',
      tema: 'u1t3',
      tipo: 'opcion',
      pregunta: 'Al restar dos números casi iguales en punto flotante, ¿qué le pasa a la precisión relativa del resultado?',
      opciones: ['Mejora, porque el resultado es más pequeño', 'Se mantiene igual', 'Empeora drásticamente: es la cancelación catastrófica', 'Se vuelve exacta, sin error'],
      correcta: 2,
      pista: 'Tiene nombre propio: cancelación ___.'
    },
    {
      id: 'ev-runge',
      tema: 'u2t1',
      tipo: 'opcion',
      pregunta: 'Con nodos equiespaciados y alto grado, ¿qué le ocurre al polinomio interpolador cerca de los bordes del intervalo?',
      opciones: ['Se vuelve más preciso', 'Oscila y diverge: el fenómeno de Runge', 'Se aplana a una línea recta', 'No cambia'],
      correcta: 1,
      pista: 'La cura no es más grado: son nodos de Chebyshev.'
    },
    {
      id: 'ev-montecarlo',
      tema: 'u2t4',
      tipo: 'texto',
      pregunta: '¿Qué método de integración numérica usa puntos aleatorios y tiene error O(N^(-1/2)) sin importar la dimensión?',
      aceptadas: ['monte carlo', 'montecarlo', 'metodo de monte carlo'],
      pista: 'Apostar en vez de calcular.'
    },
    {
      id: 'ev-verlet',
      tema: 'u3t1',
      tipo: 'opcion',
      pregunta: 'El integrador de Verlet no conserva la energía exactamente, pero sí conserva algo importante. ¿Qué?',
      opciones: ['La forma simpléctica del espacio de fases', 'El momento angular siempre', 'El volumen del sistema físico real', 'Nada en particular'],
      correcta: 0,
      pista: 'Lo que compra es la ausencia de deriva a largo plazo.'
    },
    {
      id: 'ev-rigidez',
      tema: 'u3t4',
      tipo: 'texto',
      pregunta: "¿Cómo se llama la propiedad de un sistema de ODEs donde coexisten escalas de tiempo muy dispares, y que obliga a un método explícito a usar pasos diminutos?",
      aceptadas: ['rigidez', 'stiffness', 'sistema rigido', 'ecuaciones rigidas', 'rigido'],
      pista: 'Los métodos A-estables (implícitos) rompen esta tiranía.'
    },
    {
      id: 'ev-condicion-matriz',
      tema: 'u4t1',
      tipo: 'opcion',
      pregunta: 'El número de condición κ₂ de una matriz mide...',
      opciones: ['Cuánto tarda en invertirse', 'Cuánto estira la matriz la bola unitaria hacia un elipsoide', 'El número de filas menos columnas', 'La suma de sus valores propios'],
      correcta: 1,
      pista: 'σ_max / σ_min.'
    },
    {
      id: 'ev-numerov',
      tema: 'u5t1',
      tipo: 'texto',
      pregunta: "¿Qué método resuelve y'' = f·y con error O(h⁶) usando solo una recurrencia de tres puntos?",
      aceptadas: ['numerov', 'metodo de numerov', 'metodo numerov'],
      pista: 'Aprovecha que no hay término en y′.'
    },
    {
      id: 'ev-cola-fifo',
      tema: null,
      tipo: 'texto',
      pregunta: 'Tengo cabeza y cola, pero no soy animal; muchos programas me usan para no perder su lugar en la fila. ¿Qué estructura soy?',
      aceptadas: ['cola', 'queue', 'fifo'],
      pista: 'FIFO: el primero en entrar es el primero en salir.'
    },
    {
      id: 'ev-recursion',
      tema: null,
      tipo: 'opcion',
      pregunta: 'Una función que se llama a sí misma necesita, para no repetirse eternamente, ¿qué elemento indispensable?',
      opciones: ['Un caso base', 'Un ciclo for', 'Una variable global', 'Un puntero nulo'],
      correcta: 0,
      pista: 'Sin él, la recursión nunca termina.'
    }
  ]
};
