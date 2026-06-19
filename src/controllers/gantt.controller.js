import pool from "../utils/database.js";

/**
 * Obtener datos para el diagrama de Gantt de un proyecto
 * Devuelve sprints y épicas con fechas para renderizar el Gantt
 */
export const getGanttData = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el proyecto existe
    const [proyectoRows] = await pool.query(
      "SELECT id_proyecto, nombre, fecha_inicio, fecha_fin_est, estado FROM proyecto WHERE id_proyecto = ?",
      [id]
    );

    if (proyectoRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado",
      });
    }

    const proyecto = proyectoRows[0];

    // Obtener sprints del proyecto
    const [sprintRows] = await pool.query(
      `SELECT id_sprint, nombre, fecha_inicio, fecha_fin, estado, meta,
              velocidad_estimada, velocidad_real
       FROM sprint
       WHERE id_proyecto = ?
       ORDER BY fecha_inicio ASC, id_sprint ASC`,
      [id]
    );

    // Obtener épicas del proyecto con su sprint asociado
    const [epicaRows] = await pool.query(
      `SELECT e.id_epica, e.nombre, e.estado, e.prioridad, e.fecha_creacion,
              se.id_sprint, se.fecha_asignacion
       FROM epica e
       LEFT JOIN sprint_epica se ON e.id_epica = se.id_epica
       WHERE e.id_proyecto = ?
       ORDER BY se.id_sprint ASC, e.id_epica ASC`,
      [id]
    );

    // Obtener conteo de tareas por sprint y estado
    const [tareasCountRows] = await pool.query(
      `SELECT t.id_sprint,
              COUNT(*) as total,
              SUM(CASE WHEN t.estado = 'done' THEN 1 ELSE 0 END) as completadas,
              SUM(CASE WHEN t.estado = 'in_progress' THEN 1 ELSE 0 END) as en_progreso,
              SUM(CASE WHEN t.estado = 'todo' THEN 1 ELSE 0 END) as pendientes
       FROM tarea t
       JOIN historia_usuario hu ON t.id_historia = hu.id_historia
       JOIN epica e ON hu.id_epica = e.id_epica
       WHERE e.id_proyecto = ? AND t.id_sprint IS NOT NULL
       GROUP BY t.id_sprint`,
      [id]
    );

    // Crear mapa de conteo de tareas por sprint
    const tareasMap = {};
    for (const row of tareasCountRows) {
      tareasMap[row.id_sprint] = {
        total: row.total,
        completadas: row.completadas,
        en_progreso: row.en_progreso,
        pendientes: row.pendientes,
      };
    }

    // Formatear sprints para el Gantt
    const sprints = sprintRows.map((sprint) => {
      const tareas = tareasMap[sprint.id_sprint] || {
        total: 0, completadas: 0, en_progreso: 0, pendientes: 0,
      };
      const progreso = tareas.total > 0
        ? Math.round((tareas.completadas / tareas.total) * 100)
        : 0;

      return {
        id: `sprint-${sprint.id_sprint}`,
        id_sprint: sprint.id_sprint,
        nombre: sprint.nombre,
        fecha_inicio: sprint.fecha_inicio,
        fecha_fin: sprint.fecha_fin,
        estado: sprint.estado,
        meta: sprint.meta,
        velocidad_estimada: sprint.velocidad_estimada,
        velocidad_real: sprint.velocidad_real,
        progreso,
        tareas,
      };
    });

    // Formatear épicas para el Gantt (como sub-items de sprints)
    const epicas = epicaRows.map((epica) => ({
      id: `epica-${epica.id_epica}`,
      id_epica: epica.id_epica,
      nombre: epica.nombre,
      estado: epica.estado,
      prioridad: epica.prioridad,
      id_sprint: epica.id_sprint,
      sprint_parent: epica.id_sprint ? `sprint-${epica.id_sprint}` : null,
      fecha_asignacion: epica.fecha_asignacion,
      fecha_creacion: epica.fecha_creacion,
    }));

    res.json({
      success: true,
      data: {
        proyecto: {
          id: proyecto.id_proyecto,
          nombre: proyecto.nombre,
          fecha_inicio: proyecto.fecha_inicio,
          fecha_fin_est: proyecto.fecha_fin_est,
          estado: proyecto.estado,
        },
        sprints,
        epicas,
      },
    });
  } catch (error) {
    console.error("Error getGanttData:", error);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Error al obtener datos del Gantt",
    });
  }
};
