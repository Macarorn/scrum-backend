/**
 * Este archivo contiene las instrucciones (prompts) que se envían a la IA.
 * Puedes modificar libremente el texto dentro de los backticks (`) para cambiar
 * el comportamiento del análisis de Gemini.
 * 
 * @param {Array} metricas - Lista de métricas del proyecto (tareas, tiempos, responsables).
 * @returns {string} - El prompt final a enviar a la API de IA.
 */
export const generarPromptAnalisisProyecto = (metricas) => {
  return `
    Actúa como un experto en gestión de proyectos y metodologías ágiles Scrum.
    Analiza los siguientes datos de rendimiento de mi proyecto y detecta de forma muy clara:
    
    1. Cuáles son los cuellos de botella exactos (tareas con mayor retraso o que toman más de lo planeado).
    2. Qué impacto tienen en la fecha de entrega final y la velocidad del equipo.
    3. Una recomendación corta, ágil y práctica para solucionar estos cuellos de botella hoy mismo.

    Por favor, responde usando un formato Markdown limpio, utilizando listas y negritas para resaltar lo más importante.

    === DATOS DEL PROYECTO (MÉTRICAS) ===
    ${JSON.stringify(metricas, null, 2)}
  `;
};
