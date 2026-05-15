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

    res.json({
      success: true,
      data: withSprintCalendarMetadata(rows[0]),
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
    const { estado } = req.body;

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
