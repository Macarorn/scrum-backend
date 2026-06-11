/**
 * Prompt especializado para el análisis automático de problemas.
 * La IA debe responder SOLO en formato JSON para que el sistema pueda
 * parsear las alertas y enviar notificaciones automáticas.
 */
export const generarPromptAlertasProyecto = (metricas, nombreProyecto) => {
  return `
Eres un sistema automatizado de análisis de proyectos Scrum.
Analiza los siguientes datos del proyecto "${nombreProyecto}" y detecta problemas.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin backticks.
2. Detecta estos tipos de problemas:
   - "cuello_de_botella": Tareas con tiempo real que supera significativamente la estimación (más del 50% de desvío).
   - "estancamiento": Tareas en estado "por_hacer" o "en_progreso" que llevan mucho tiempo sin avanzar (tiempo real > estimación y no están terminadas).
   - "sobrecarga": Un responsable tiene demasiadas tareas en progreso simultáneamente (3 o más).
   - "retraso_critico": Tareas de prioridad "alta" o "critica" que están atrasadas.
3. Si NO hay problemas, devuelve: { "alertas": [] }
4. Para cada alerta incluye: tipo, tarea, responsable, mensaje (breve, en español), y severidad ("alta", "media", "baja").

FORMATO DE RESPUESTA (JSON):
{
  "alertas": [
    {
      "tipo": "cuello_de_botella",
      "tarea": "Nombre de la tarea",
      "responsable": "Nombre del responsable",
      "mensaje": "Descripción breve del problema detectado",
      "severidad": "alta"
    }
  ]
}

=== DATOS DEL PROYECTO ===
${JSON.stringify(metricas, null, 2)}
  `;
};
