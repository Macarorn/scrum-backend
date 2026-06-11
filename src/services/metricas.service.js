import pool from "../utils/database.js";

/**
 * Obtiene las métricas de las tareas de un proyecto específico para su análisis.
 * @param {number} idProyecto 
 * @returns {Promise<Array>} Lista de tareas con sus estimaciones, tiempos reales y responsables.
 */
export const obtenerMetricasProyecto = async (idProyecto) => {
  const query = `
    SELECT 
      t.nombre AS tarea,
      t.estimacion_dias AS diasPlanificados,
      t.tiempo_real AS diasReales,
      t.estado,
      u.nombre AS responsable
    FROM tarea t
    JOIN historia_usuario h ON t.id_historia = h.id_historia
    JOIN epica e ON h.id_epica = e.id_epica
    LEFT JOIN tarea_usuario tu ON t.id_tarea = tu.id_tarea AND tu.es_responsable = 1
    LEFT JOIN usuario u ON tu.id_usuario = u.id_usuario
    WHERE e.id_proyecto = ?
  `;

  const [rows] = await pool.query(query, [idProyecto]);
  
  // Transformar un poco los datos para evitar nulls que confundan a la IA
  return rows.map(row => ({
    tarea: row.tarea,
    diasPlanificados: row.diasPlanificados || 0,
    diasReales: row.diasReales || 0,
    estado: row.estado,
    responsable: row.responsable || 'Sin asignar'
  }));
};
