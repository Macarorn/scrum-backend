const TIPOS_TAREA = ["feature", "bug", "technical", "chore"];
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

function esEnteroPositivo(valor) {
  return Number.isInteger(valor) && valor > 0;
}

// Validar datos para crear tarea
export function validarCrearTarea(data) {
  const errores = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Body de la solicitud invalido"] };
  }

  if (!data.titulo || typeof data.titulo !== "string") {
    errores.push("El campo titulo es obligatorio");
  }

  if (!esEnteroPositivo(data.sprintId)) {
    errores.push("El campo sprintId es obligatorio y debe ser entero positivo");
  }

  if (!esEnteroPositivo(data.responsableId)) {
    errores.push("El campo responsableId es obligatorio y debe ser entero positivo");
  }

  errores.push(...validarPrioridadYTipo(data));

  if (data.storyPoints !== undefined && !FIBONACCI.includes(data.storyPoints)) {
    errores.push("storyPoints debe seguir secuencia Fibonacci");
  }

  return {
    isValid: errores.length === 0,
    errors: errores,
  };
}

// Validar datos para actualizar tarea
export function validarActualizarTarea(data) {
  const errores = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Body de la solicitud invalido"] };
  }

  if (data.titulo !== undefined && typeof data.titulo !== "string") {
    errores.push("titulo debe ser string");
  }

  if (data.sprintId !== undefined && !esEnteroPositivo(data.sprintId)) {
    errores.push("sprintId debe ser entero positivo");
  }

  if (data.responsableId !== undefined && !esEnteroPositivo(data.responsableId)) {
    errores.push("responsableId debe ser entero positivo");
  }

  errores.push(...validarPrioridadYTipo(data));

  if (data.storyPoints !== undefined && !FIBONACCI.includes(data.storyPoints)) {
    errores.push("storyPoints debe seguir secuencia Fibonacci");
  }

  return {
    isValid: errores.length === 0,
    errors: errores,
  };
}

// Validar prioridad y tipo de tarea
export function validarPrioridadYTipo(data) {
  const errores = [];

  if (
    data.prioridad !== undefined &&
    (!Number.isInteger(data.prioridad) || data.prioridad < 1 || data.prioridad > 5)
  ) {
    errores.push("prioridad debe estar entre 1 y 5");
  }

  if (data.tipo !== undefined && !TIPOS_TAREA.includes(data.tipo)) {
    errores.push(`tipo invalido. Permitidos: ${TIPOS_TAREA.join(", ")}`);
  }

  return errores;
}
