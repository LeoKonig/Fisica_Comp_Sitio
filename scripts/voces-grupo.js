/* voces-grupo.js — lo genera el Panel del Docente (sección «Voces del grupo»).
 * Observaciones que los alumnos decidieron compartir desde las notas dialógicas,
 * con sus respuestas. «Anónimo» salvo que el alumno eligiera firmar.
 * Cada ronda: el docente carga los guardados, revisa, retira lo necesario y reemplaza este archivo.
 */
window.VOCES_GRUPO = {
  actualizado: null,
  ronda: 0,
  voces: []
};
