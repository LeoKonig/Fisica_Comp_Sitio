/* grupo-stats.js
 * Estadísticas AGREGADAS del grupo, sin nombres ni ranking individual.
 * El profesor actualiza este archivo (a mano o desde los .json exportados).
 * Todo es promedio/mediana/percentil: nadie puede ver el avance de otra persona.
 */
window.GRUPO_STATS = {
  actualizado: '2026-08-18',
  alumnos: 34,

  // temas del Mapa del Conocimiento completados (de 23)
  temas: { mediana: 7, p25: 4, p75: 11 },

  // retos de Unidad 0 resueltos, sumando los lenguajes que cada quien haya tocado
  retos: { mediana: 9, p25: 4, p75: 16 },

  // cuántos alumnos han empezado cada lenguaje (para "qué está eligiendo el grupo")
  lenguajes: {
    racket: 26,
    haskell: 14,
    idris: 7,
    agda: 5,
    ats: 4,
    mercury: 9,
    lean: 0
  },

  // vínculos de las notas dialógicas: por tema, cuántos alumnos lo conectaron con
  // cada otro tema. Lo genera el Panel del Docente; solo temas con 5+ alumnos.
  //   u1t1: { n: 20, a: { u1t4: 9, u1t3: 6 } }
  vinculos: {}
};
