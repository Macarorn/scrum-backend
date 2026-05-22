import pool from "../utils/database.js";
import notificacionesService from "../services/notificaciones.service.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDateMetadata = (value) => {
  const eventDate = startOfDay(value);
  if (Number.isNaN(eventDate.getTime())) {
    return {
      esHoy: false,
      proximoEvento: false,
      atrasado: false,
      diasRestantes: null,
      prioridad: "baja",
    };
  }

  const today = startOfDay();
  const diasRestantes = Math.round((eventDate - today) / DAY_IN_MS);
  const esHoy = diasRestantes === 0;
  const proximoEvento = diasRestantes > 0 && diasRestantes <= 3;
  const atrasado = diasRestantes < 0;

  return {
    esHoy,
    proximoEvento,
    atrasado,
    diasRestantes,
    prioridad: esHoy || atrasado ? "alta" : proximoEvento ? "media" : "baja",
  };
};

const withSprintCalendarMetadata = (sprint) => {
  if (!sprint) return sprint;
  return {
    ...sprint,
    ...getDateMetadata(sprint.fecha_fin || sprint.fecha_inicio),
  };
};

function normalizeSprintPayload(body) {
  return {
    id_proyecto: body.id_proyecto ?? body.proyectoId,
    nombre: body.nombre,
    meta: body.meta ?? body.descripcion ?? null,
    fecha_inicio: body.fecha_inicio ?? body.fechaInicio,
    fecha_fin: body.fecha_fin ?? body.fechaFin,
    estado: body.estado ?? "planeado",
    velocidad_estimada: body.velocidad_estimada ?? body.velocidad ?? null,
    velocidad_real: body.velocidad_real ?? body.velocidadReal ?? null,
    fecha_liberacion: body.fecha_liberacion ?? body.fechaLiberacion ?? null,
  };
}

// CREAR
export const createSprint = async (req, res) => {
  try {
    const sprint = normalizeSprintPayload(req.body);

    if (
      !sprint.id_proyecto ||
      !sprint.nombre ||
      !sprint.fecha_inicio ||
      !sprint.fecha_fin
    ) {
      return res.status(400).json({
        success: false,
        message:
          "id_proyecto, nombre, fecha_inicio y fecha_fin son obligatorios",
      });
    }

    // Validar que no haya otro sprint en curso en el mismo proyecto
    if (sprint.estado === "en_curso") {
      const [sprintsEnCurso] = await pool.query(
        "SELECT id_sprint FROM sprint WHERE id_proyecto = ? AND estado = 'en_curso'",
        [sprint.id_proyecto]
      );
      if (sprintsEnCurso.length > 0) {
        return res.status(400).json({
          success: false,
          message: "No se puede crear el sprint en curso porque ya existe otro sprint en curso en este proyecto. Primero debe completar o cambiar el estado del sprint actual.",
        });
      }
    }

    // Get the count of sprints in this project to generate a per-project identifier
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as count FROM sprint WHERE id_proyecto = ?`,
      [sprint.id_proyecto]
    );
    const sprintCount = countResult[0].count;
    const sprintIdentifier = sprintCount + 1;

    const [result] = await pool.query(
      `INSERT INTO sprint (id_proyecto, nombre, meta, fecha_inicio, fecha_fin, estado, velocidad_estimada, velocidad_real, fecha_liberacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sprint.id_proyecto,
        sprint.nombre,
        sprint.meta,
        sprint.fecha_inicio,
        sprint.fecha_fin,
        sprint.estado,
        sprint.velocidad_estimada,
        sprint.velocidad_real,
        sprint.fecha_liberacion,
      ],
    );

    // Add identifier to the sprint name after insertion (per-project identifier)
    const sprintId = result.insertId;
    await pool.query(
      `UPDATE sprint SET nombre = CONCAT('S', ?, ' - ', nombre) WHERE id_sprint = ?`,
      [sprintIdentifier, sprintId]
    );

    // Obtener nombre del proyecto para la notificación
    const [proyectoRows] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [sprint.id_proyecto]
    );
    const nombreProyecto = proyectoRows.length > 0 ? proyectoRows[0].nombre : 'Proyecto desconocido';

    // Notificar a los miembros del proyecto sobre el nuevo sprint
    const userId = req.user?.id_usuario;
    await notificacionesService.notificarNuevoSprint(
      sprint.id_proyecto,
      nombreProyecto,
      sprint.nombre,
      userId
    );

    res.status(201).json({
      success: true,
      data: {
        id_sprint: result.insertId,
        ...withSprintCalendarMetadata(sprint),
      },
      message: "sprint creado correctamente",
    });
  } catch (error) {
    console.error("Error createSprint:", error);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Error interno del servidor",
    });
  }
};

// OBTENER TODOS
export const getSprints = async (req, res) => {
  try {
    const projectIdRaw = req.query.id_proyecto ?? req.query.proyectoId;

    let rows;
    if (projectIdRaw !== undefined && projectIdRaw !== null && String(projectIdRaw).trim() !== "") {
      const projectId = Number(projectIdRaw);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return res.status(400).json({
          success: false,
          message: "id_proyecto invalido",
        });
      }

      [rows] = await pool.query(
        "SELECT * FROM sprint WHERE id_proyecto = ? ORDER BY id_sprint DESC",
        [projectId],
      );
    } else {
      [rows] = await pool.query("SELECT * FROM sprint ORDER BY id_sprint DESC");
    }

    res.json({
      success: true,
      data: rows.map(withSprintCalendarMetadata),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//  OBTENER POR ID
export const getSprintById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM sprint WHERE id_sprint = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    const sprint = rows[0];

    // Obtener épicas asociadas al sprint
    const [epicasRows] = await pool.query(
      `SELECT e.*, se.fecha_asignacion 
       FROM epica e 
       JOIN sprint_epica se ON e.id_epica = se.id_epica 
       WHERE se.id_sprint = ? 
       ORDER BY se.fecha_asignacion DESC`,
      [id]
    );

    const epicas = epicasRows.map((row) => ({
      id: row.id_epica,
      id_epica: row.id_epica,
      proyectoId: row.id_proyecto,
      id_proyecto: row.id_proyecto,
      nombre: row.nombre,
      descripcion: row.descripcion || "",
      categoria: row.categoria || "",
      prioridad: row.prioridad,
      estado: row.estado,
      fecha_asignacion: row.fecha_asignacion,
      createdAt: row.fecha_creacion,
      updatedAt: row.fecha_actualizacion,
    }));

    res.json({
      success: true,
      data: {
        ...withSprintCalendarMetadata(sprint),
        epicas,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//  ACTUALIZAR
export const updateSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const sprint = normalizeSprintPayload(req.body);
    const { forzar_cambio } = req.body;

    // Obtener el sprint actual para comparar el estado
    const [sprintActual] = await pool.query(
      "SELECT * FROM sprint WHERE id_sprint = ?",
      [id]
    );

    if (sprintActual.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    const estadoAnterior = sprintActual[0].estado;
    const proyectoId = sprintActual[0].id_proyecto;

    // Validar que no haya otro sprint en curso en el mismo proyecto
    if (sprint.estado === "en_curso" && estadoAnterior !== "en_curso") {
      const [sprintsEnCurso] = await pool.query(
        "SELECT id_sprint, nombre FROM sprint WHERE id_proyecto = ? AND estado = 'en_curso' AND id_sprint != ?",
        [proyectoId, id]
      );
      if (sprintsEnCurso.length > 0) {
        // Si se fuerza el cambio, completar el sprint anterior
        if (forzar_cambio) {
          const sprintAnterior = sprintsEnCurso[0];
          await pool.query(
            "UPDATE sprint SET estado = 'completado' WHERE id_sprint = ?",
            [sprintAnterior.id_sprint]
          );
        } else {
          return res.status(400).json({
            success: false,
            hay_sprint_en_curso: true,
            sprint_en_curso_nombre: sprintsEnCurso[0].nombre,
            message: "Ya existe otro sprint en curso en este proyecto.",
          });
        }
      }
    }

    const [result] = await pool.query(
      `UPDATE sprint
       SET id_proyecto = ?, nombre = ?, meta = ?, fecha_inicio = ?, fecha_fin = ?, estado = ?, velocidad_estimada = ?, velocidad_real = ?, fecha_liberacion = ?
       WHERE id_sprint = ?`,
      [
        sprint.id_proyecto,
        sprint.nombre,
        sprint.meta,
        sprint.fecha_inicio,
        sprint.fecha_fin,
        sprint.estado,
        sprint.velocidad_estimada,
        sprint.velocidad_real,
        sprint.fecha_liberacion,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Sprint actualizado",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//  ELIMINAR
export const deleteSprint = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM sprint WHERE id_sprint = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Sprint eliminado",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

//  CAMBIAR ESTADO
export const updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, forzar_cambio } = req.body;

    const estadosValidos = ["planeado", "en_curso", "completado", "cancelado"];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "Estado inválido",
      });
    }

    // Obtener el sprint actual para comparar el estado
    const [sprintActual] = await pool.query(
      "SELECT s.*, p.nombre as nombre_proyecto FROM sprint s JOIN proyecto p ON s.id_proyecto = p.id_proyecto WHERE s.id_sprint = ?",
      [id]
    );

    if (sprintActual.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    const estadoAnterior = sprintActual[0].estado;
    const nombreSprint = sprintActual[0].nombre;
    const nombreProyecto = sprintActual[0].nombre_proyecto;
    const fechaFin = new Date(sprintActual[0].fecha_fin);
    const proyectoId = sprintActual[0].id_proyecto;

    // Validar que no haya otro sprint en curso en el mismo proyecto
    if (estado === "en_curso" && estadoAnterior !== "en_curso") {
      const [sprintsEnCurso] = await pool.query(
        "SELECT id_sprint, nombre FROM sprint WHERE id_proyecto = ? AND estado = 'en_curso' AND id_sprint != ?",
        [proyectoId, id]
      );
      if (sprintsEnCurso.length > 0) {
        // Si se fuerza el cambio, completar el sprint anterior
        if (forzar_cambio) {
          const sprintAnterior = sprintsEnCurso[0];
          await pool.query(
            "UPDATE sprint SET estado = 'completado' WHERE id_sprint = ?",
            [sprintAnterior.id_sprint]
          );
        } else {
          return res.status(400).json({
            success: false,
            hay_sprint_en_curso: true,
            sprint_en_curso_nombre: sprintsEnCurso[0].nombre,
            message: "Ya existe otro sprint en curso en este proyecto.",
          });
        }
      }
    }

    const [result] = await pool.query(
      "UPDATE sprint SET estado = ? WHERE id_sprint = ?",
      [estado, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    // Notificar según el tipo de cambio de estado
    const userId = req.user?.id_usuario;

    if (estado === "en_curso" && estadoAnterior !== "en_curso") {
      // Calcular días restantes hasta la fecha fin
      const hoy = new Date();
      const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));

      await notificacionesService.notificarInicioSprint(
        sprintActual[0].id_proyecto,
        nombreProyecto,
        nombreSprint,
        diasRestantes > 0 ? diasRestantes : 0,
        userId
      );
    } else if (estado === "completado" && estadoAnterior !== "completado") {
      await notificacionesService.notificarSprintCompletado(
        sprintActual[0].id_proyecto,
        nombreProyecto,
        nombreSprint,
        userId
      );
    }

    res.json({
      success: true,
      message: "Estado actualizado",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

// ASOCIAR ÉPICAS A SPRINT
export const asociarEpicas = async (req, res) => {
  try {
    const { id } = req.params;
    const { epicas } = req.body; // Array de IDs de épicas

    if (!Array.isArray(epicas) || epicas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se debe proporcionar un array de IDs de épicas",
      });
    }

    // Verificar que el sprint existe
    const [sprintRows] = await pool.query(
      "SELECT id_sprint, id_proyecto FROM sprint WHERE id_sprint = ?",
      [id]
    );

    if (sprintRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    const sprint = sprintRows[0];
    const proyectoId = sprint.id_proyecto;

    // Verificar que todas las épicas pertenecen al mismo proyecto
    const [epicasRows] = await pool.query(
      "SELECT id_epica FROM epica WHERE id_epica IN (?) AND id_proyecto = ?",
      [epicas, proyectoId]
    );

    if (epicasRows.length !== epicas.length) {
      return res.status(400).json({
        success: false,
        message: "Algunas épicas no existen o no pertenecen al mismo proyecto",
      });
    }

    // Verificar si las épicas ya están asignadas a otro sprint
    const [epicasAsignadasRows] = await pool.query(
      "SELECT id_epica, id_sprint FROM sprint_epica WHERE id_epica IN (?) AND id_sprint != ?",
      [epicas, id]
    );

    if (epicasAsignadasRows.length > 0) {
      const epicasAsignadas = epicasAsignadasRows.map(row => row.id_epica);
      return res.status(400).json({
        success: false,
        message: "Algunas épicas ya están asignadas a otro sprint",
        epicasAsignadas,
      });
    }

    // Insertar las relaciones (ignorando duplicados)
    const values = epicas.map((epicaId) => [id, epicaId]);
    await pool.query(
      `INSERT IGNORE INTO sprint_epica (id_sprint, id_epica) VALUES ?`,
      [values]
    );

    res.json({
      success: true,
      message: "Épicas asociadas correctamente",
    });
  } catch (error) {
    console.error("Error asociarEpicas:", error);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Error interno del servidor",
    });
  }
};

// DESASOCIAR ÉPICA DE SPRINT
export const desasociarEpica = async (req, res) => {
  try {
    const { id, epicaId } = req.params;

    const [result] = await pool.query(
      "DELETE FROM sprint_epica WHERE id_sprint = ? AND id_epica = ?",
      [id, epicaId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Relación sprint-épica no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Épica desasociada correctamente",
    });
  } catch (error) {
    console.error("Error desasociarEpica:", error);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Error interno del servidor",
    });
  }
};

// OBTENER ÉPICAS DE UN SPRINT
export const getEpicasSprint = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT e.*, se.fecha_asignacion 
       FROM epica e 
       JOIN sprint_epica se ON e.id_epica = se.id_epica 
       WHERE se.id_sprint = ? 
       ORDER BY se.fecha_asignacion DESC`,
      [id]
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id_epica,
        id_epica: row.id_epica,
        proyectoId: row.id_proyecto,
        id_proyecto: row.id_proyecto,
        nombre: row.nombre,
        descripcion: row.descripcion || "",
        categoria: row.categoria || "",
        prioridad: row.prioridad,
        estado: row.estado,
        fecha_asignacion: row.fecha_asignacion,
        createdAt: row.fecha_creacion,
        updatedAt: row.fecha_actualizacion,
      })),
    });
  } catch (error) {
    console.error("Error getEpicasSprint:", error);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Error interno del servidor",
    });
  }
};
