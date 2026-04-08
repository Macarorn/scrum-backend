// Estados válidos
export const ESTADOS = ["por_hacer", "en_progreso", "terminado"];

// Validar transición de estado
export function esTransicionValida(estadoActual, nuevoEstado) {
  const transiciones = {
    por_hacer: ["en_progreso"],
    en_progreso: ["terminado"],
    terminado: [],
  };
  return transiciones[estadoActual]?.includes(nuevoEstado);
}
