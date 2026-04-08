const TIPOS_TAREA = ["RF", "RNF", "bug", "mejora", "otro"];
const ESTADOS_TAREA = ["por_hacer", "en_progreso", "terminado", "bloqueado"];
const PRIORIDADES_TAREA = ["baja", "media", "alta", "critica"];
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

function esEnteroPositivo(valor) {
  return Number.isInteger(valor) && valor > 0;
}

function obtenerHistoriaId(data) {
  return data.id_historia ?? data.historiaId ?? data.sprintId;
}

function obtenerResponsableId(data) {
  return data.id_usuario_responsable ?? data.responsableId ?? data.id_usuario;
}

// Validar datos para crear tarea
export function validarCrearTarea(data) {
  const errores = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Body de la solicitud invalido"] };
  }

  if (!data.nombre || typeof data.nombre !== "string") {
    errores.push("El campo nombre es obligatorio");
  }

  if (!esEnteroPositivo(obtenerHistoriaId(data))) {
    errores.push(
      "El campo id_historia es obligatorio y debe ser entero positivo",
    );
  }

  if (!esEnteroPositivo(obtenerResponsableId(data))) {
    errores.push(
      "El campo id_usuario_responsable es obligatorio y debe ser entero positivo",
    );
  }

  errores.push(...validarPrioridadYTipo(data));

  if (data.estado !== undefined && !ESTADOS_TAREA.includes(data.estado)) {
    errores.push(`estado invalido. Permitidos: ${ESTADOS_TAREA.join(", ")}`);
  }

  if (data.storyPoints !== undefined && !FIBONACCI.includes(data.storyPoints)) {
    errores.push("storyPoints debe seguir secuencia Fibonacci");
  }

  if (
    data.story_points !== undefined &&
    !FIBONACCI.includes(data.story_points)
  ) {
    errores.push("story_points debe seguir secuencia Fibonacci");
  }

  if (
    data.prioridad !== undefined &&
    !PRIORIDADES_TAREA.includes(data.prioridad)
  ) {
    errores.push(
      `prioridad invalida. Permitidas: ${PRIORIDADES_TAREA.join(", ")}`,
    );
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

  if (data.nombre !== undefined && typeof data.nombre !== "string") {
    errores.push("nombre debe ser string");
  }

  const historiaId = obtenerHistoriaId(data);
  if (historiaId !== undefined && !esEnteroPositivo(historiaId)) {
    errores.push("id_historia debe ser entero positivo");
  }

  const responsableId = obtenerResponsableId(data);
  if (responsableId !== undefined && !esEnteroPositivo(responsableId)) {
    errores.push("id_usuario_responsable debe ser entero positivo");
  }

  errores.push(...validarPrioridadYTipo(data));

  if (data.estado !== undefined && !ESTADOS_TAREA.includes(data.estado)) {
    errores.push(`estado invalido. Permitidos: ${ESTADOS_TAREA.join(", ")}`);
  }

  if (data.storyPoints !== undefined && !FIBONACCI.includes(data.storyPoints)) {
    errores.push("storyPoints debe seguir secuencia Fibonacci");
  }

  if (
    data.story_points !== undefined &&
    !FIBONACCI.includes(data.story_points)
  ) {
    errores.push("story_points debe seguir secuencia Fibonacci");
  }

  if (
    data.prioridad !== undefined &&
    !PRIORIDADES_TAREA.includes(data.prioridad)
  ) {
    errores.push(
      `prioridad invalida. Permitidas: ${PRIORIDADES_TAREA.join(", ")}`,
    );
  }

  return {
    isValid: errores.length === 0,
    errors: errores,
  };
}

// Validar prioridad y tipo de tarea
export function validarPrioridadYTipo(data) {
  const errores = [];

  if (data.tipo !== undefined && !TIPOS_TAREA.includes(data.tipo)) {
    errores.push(`tipo invalido. Permitidos: ${TIPOS_TAREA.join(", ")}`);
  }

  return errores;
}
