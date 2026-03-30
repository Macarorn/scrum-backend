//Validations para tareas

// Validar datos para crear tarea
export function validarCrearTarea(data) {
  // TODO: Validar campos requeridos y tipos
  return true;
}

// Validar datos para actualizar tarea
export function validarActualizarTarea(data) {
  // TODO: Validar campos permitidos y tipos
  return true;
}

// Validar prioridad y tipo de tarea
export function validarPrioridadYTipo(data) {
  // TODO: Validar que data.prioridad y data.tipo sean valores permitidos
  // Si necesitas validar contra la base de datos, aquí va la consulta SQL
  // Ejemplo:
  // const [rows] = await pool.query('SELECT * FROM prioridades WHERE nombre = ?', [data.prioridad]);
  // if (!rows.length) return false;
  return true;
}
