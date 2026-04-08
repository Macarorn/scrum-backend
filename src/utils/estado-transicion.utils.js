// Estados válidos alineados con la tabla tarea.
export const ESTADOS = ["por_hacer", "en_progreso", "terminado", "bloqueado"];

// Validar transición de estado
export function esTransicionValida(estadoActual, nuevoEstado) {
  const transiciones = {
    por_hacer: ["en_progreso", "bloqueado"],
    en_progreso: ["terminado", "bloqueado"],
    bloqueado: ["en_progreso"],
    terminado: [],
  };
  return transiciones[estadoActual]?.includes(nuevoEstado);
}
