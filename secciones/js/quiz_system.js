// ==========================================
// SISTEMA DE CUESTIONARIOS - SIN CIFRADO
// ==========================================

// Configuración del curso
const COURSE_CONFIG = {
  courseName: "Física Computacional",
  semester: "2025-1",
  professor: "Leonardo Arturo Gómez Garduño",
};

// Inicialización de datos del alumno
function initStudentData() {
  const stored = localStorage.getItem('quiz_answers');
  if (stored) {
    window.studentData = JSON.parse(stored);
  } else {
    // Estructura inicial de datos
    window.studentData = { 
      id: "", 
      answers: {} 
    };
  }
  
  // Rellenar el input del ID si ya existe en la página actual
  const idInput = document.getElementById('student-id');
  if (idInput && window.studentData.id) {
    idInput.value = window.studentData.id;
  }
}

// Guardar respuesta individual
function saveAnswer(questionId, value) {
  if (!window.studentData) initStudentData();
  window.studentData.answers[questionId] = value;
  localStorage.setItem('quiz_answers', JSON.stringify(window.studentData));
  console.log("Guardado:", questionId, "->", value);
}

// Guardar ID del alumno
function saveStudentId() {
  const id = document.getElementById('student-id').value;
  if (!window.studentData) initStudentData();
  window.studentData.id = id;
  localStorage.setItem('quiz_answers', JSON.stringify(window.studentData));
}

// Función para generar y descargar el archivo JSON final
function finishAndDownload() {
  // Asegurar que tenemos los datos más recientes
  if (!window.studentData) initStudentData();
  
  // Validar que haya un ID
  if (!window.studentData.id) {
    alert("Por favor, ingresa tu número de cuenta antes de finalizar.");
    return;
  }

  // Construir el objeto final con metadatos del curso
  const outputData = {
    metadata: COURSE_CONFIG,
    studentId: window.studentData.id,
    timestamp: new Date().toISOString(),
    answers: window.studentData.answers
  };

  // Convertir a JSON formateado (legible)
  const jsonString = JSON.stringify(outputData, null, 2);
  
  // Crear y descargar el archivo
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `respuestas_${window.studentData.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  alert("Archivo JSON generado exitosamente.");
}

// Inicializar automáticamente al cargar la página
document.addEventListener('DOMContentLoaded', initStudentData);