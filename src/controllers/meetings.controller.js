import pool from "../utils/database.js";
import notificacionesService from "../services/notificaciones.service.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const VALID_PRIORITIES = new Set(["alta", "media", "baja", "estandar"]);

const startOfDay = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDateMetadata = (value, priority) => {
  const eventDate = startOfDay(value);
  if (Number.isNaN(eventDate.getTime())) {
    return {
      esHoy: false,
      proximoEvento: false,
      atrasado: false,
      diasRestantes: null,
      prioridad: VALID_PRIORITIES.has(priority) ? priority : "baja",
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
    prioridad: VALID_PRIORITIES.has(priority)
      ? priority
      : esHoy || atrasado
        ? "alta"
        : proximoEvento
          ? "media"
          : "baja",
  };
};

const ensureMeetingTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting (
      id_meeting INT AUTO_INCREMENT PRIMARY KEY,
      id_proyecto INT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      sprint VARCHAR(100) NOT NULL,
      status VARCHAR(100) DEFAULT 'programada',
      date DATETIME NOT NULL,
      type VARCHAR(100),
      priority VARCHAR(20) DEFAULT 'media',
      startTime VARCHAR(20),
      duration VARCHAR(50),
      room VARCHAR(100),
      link VARCHAR(255),
      fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE
    )
  `);

  const [columns] = await pool.query("SHOW COLUMNS FROM meeting LIKE 'id_proyecto'");
  if (columns.length === 0) {
    await pool.query("ALTER TABLE meeting ADD COLUMN id_proyecto INT AFTER id_meeting");
    await pool.query("ALTER TABLE meeting ADD FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE");
  }

  const [priorityCol] = await pool.query("SHOW COLUMNS FROM meeting LIKE 'priority'");
  if (priorityCol.length === 0) {
    await pool.query("ALTER TABLE meeting ADD COLUMN priority VARCHAR(20) DEFAULT 'media' AFTER type");
  }
};

const parseMeetingDate = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  return new Date(value);
};

const normalizeMeetingPayload = (body) => {
  const id_proyecto = body.id_proyecto ? Number(body.id_proyecto) : null;
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const sprint = String(body.sprint || "").trim();
  const status = String(body.status || "").trim();
  const type = String(body.type || "").trim();
  const priority = String(body.priority || body.prioridad || "media").trim().toLowerCase();
  const room = String(body.room || "").trim();
  const link = String(body.link || "").trim();
  const date = parseMeetingDate(body.date);
  const startTime = String(body.startTime || "").trim();
  const duration = body.duration ? Number(body.duration) : null;
  // Campo opcional para seleccionar miembros específicos a notificar (preparado para futuro)
  // Si está presente, solo notifica a esos IDs de usuario. Si no está, notifica a todos los miembros del proyecto.
  const miembros_a_notificar = body.miembros_a_notificar && Array.isArray(body.miembros_a_notificar)
    ? body.miembros_a_notificar.map(id => Number(id)).filter(id => !Number.isNaN(id))
    : null;

  let startDate = null;
  if (date && !Number.isNaN(date.getTime())) {
    if (startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        startDate = new Date(date);
        startDate.setHours(hours, minutes, 0, 0);
      }
    }

    if (!startDate) {
      startDate = new Date(date);
    }
  }

  return {
    id_proyecto,
    title,
    description,
    sprint,
    status,
    type,
    priority: VALID_PRIORITIES.has(priority) ? priority : "media",
    room,
    link,
    date: startDate,
    duration: duration || null,
    startTime: startTime || null,
    miembros_a_notificar,
  };
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const withMeetingAliases = (meeting) => {
  if (!meeting) return meeting;

  const startDate = meeting.start_date || meeting.date || null;
  const priority = String(meeting.priority || meeting.prioridad || "").toLowerCase();

  return {
    ...meeting,
    id: meeting.id || meeting.id_meeting,
    date: meeting.date || startDate,
    startDate,
    endDate: meeting.end_date || null,
    startTime: meeting.startTime || meeting.start_time || null,
    endTime: meeting.endTime || meeting.end_time || null,
    priority: VALID_PRIORITIES.has(priority) ? priority : undefined,
    ...getDateMetadata(startDate, priority),
  };
};

// Función helper para notificar a miembros del proyecto
// Si se proporcionan miembros específicos, solo notifica a esos. Si no, notifica a todos.
const notifyMeetingChange = async (id_proyecto, titulo, nombreProyecto, fecha, hora, accion, userId, miembrosEspecificos = null, idMeeting = null) => {
  try {
    const fechaFormateada = fecha ? new Date(fecha).toLocaleDateString('es-ES') : '';
    const horaFormateada = hora || '';

    // Determinar el tipo de notificación basado en la acción
    let tipoNotificacion = 'informativa';
    if (accion === 'creada') tipoNotificacion = 'reunion_creada';
    else if (accion === 'actualizada') tipoNotificacion = 'reunion_actualizada';
    else if (accion === 'eliminada') tipoNotificacion = 'reunion_eliminada';

    if (miembrosEspecificos && miembrosEspecificos.length > 0) {
      // Notificar solo a los miembros específicos
      for (const id_usuario of miembrosEspecificos) {
        await notificacionesService.crearNotificacion({
          id_usuario,
          tipo: tipoNotificacion,
          titulo: titulo,
          mensaje: `Reunión en el proyecto "${nombreProyecto}" para el ${fechaFormateada}${horaFormateada ? ` a las ${horaFormateada}` : ''}`,
          id_meeting: idMeeting,
          id_proyecto: id_proyecto,
          accion: accion
        });
      }
    } else {
      // Notificar a todos los miembros del proyecto
      const miembros = await notificacionesService.obtenerMiembrosProyecto(id_proyecto);

      for (const miembro of miembros) {
        // Excluir al usuario que originó la acción
        if (userId && miembro.id_usuario === userId) {
          continue;
        }
        await notificacionesService.crearNotificacion({
          id_usuario: miembro.id_usuario,
          tipo: tipoNotificacion,
          titulo: titulo,
          mensaje: `Reunión en el proyecto "${nombreProyecto}" para el ${fechaFormateada}${horaFormateada ? ` a las ${horaFormateada}` : ''}`,
          id_meeting: idMeeting,
          id_proyecto: id_proyecto,
          accion: accion
        });
      }
    }
  } catch (notifError) {
    console.error(`Error al enviar notificación de reunión ${accion}:`, notifError);
    // No fallar la operación si falla la notificación
  }
};

export const createMeeting = async (req, res) => {
  try {
    await ensureMeetingTable();
    const payload = normalizeMeetingPayload(req.body);

    if (!payload.title || !payload.date || !isValidDate(payload.date)) {
      return res.status(400).json({
        success: false,
        message: "El título y la fecha/hora de inicio de la reunión son obligatorios.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO meeting
        (id_proyecto, title, description, sprint, status, date, type, priority, startTime, duration, room, link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.id_proyecto,
        payload.title,
        payload.description,
        payload.sprint,
        payload.status,
        payload.date,
        payload.type,
        payload.priority,
        payload.startTime,
        payload.duration,
        payload.room,
        payload.link,
      ],
    );

    const [rows] = await pool.query("SELECT * FROM meeting WHERE id_meeting = ?", [result.insertId]);

    // Notificar a los miembros del proyecto sobre la nueva reunión
    if (payload.id_proyecto) {
      const [projectRows] = await pool.query("SELECT nombre FROM proyecto WHERE id_proyecto = ?", [payload.id_proyecto]);
      const nombreProyecto = projectRows[0]?.nombre || "Proyecto";

      await notifyMeetingChange(
        payload.id_proyecto,
        payload.title,
        nombreProyecto,
        payload.date,
        payload.startTime,
        'creada',
        req.user?.id || req.user?.id_usuario,
        payload.miembros_a_notificar,
        result.insertId
      );
    }

    return res.status(201).json({ success: true, data: withMeetingAliases(rows[0]) });
  } catch (error) {
    console.error("Error createMeeting:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear la reunión.",
    });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    await ensureMeetingTable();
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "El ID de la reunión es obligatorio." });
    }

    const payload = normalizeMeetingPayload(req.body);
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar." });
    }

    values.push(id);
    const query = `UPDATE meeting SET ${fields.join(", ")} WHERE id_meeting = ?`;
    const [updateResult] = await pool.query(query, values);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reunión no encontrada." });
    }

    const [rows] = await pool.query("SELECT * FROM meeting WHERE id_meeting = ?", [id]);
    const updatedMeeting = withMeetingAliases(rows[0]);

    // Notificar a los miembros del proyecto sobre la actualización de la reunión
    if (updatedMeeting.id_proyecto) {
      const [projectRows] = await pool.query("SELECT nombre FROM proyecto WHERE id_proyecto = ?", [updatedMeeting.id_proyecto]);
      const nombreProyecto = projectRows[0]?.nombre || "Proyecto";

      await notifyMeetingChange(
        updatedMeeting.id_proyecto,
        updatedMeeting.title,
        nombreProyecto,
        updatedMeeting.date,
        updatedMeeting.startTime,
        'actualizada',
        req.user?.id || req.user?.id_usuario,
        payload.miembros_a_notificar,
        id
      );
    }

    return res.json({ success: true, data: updatedMeeting });
  } catch (error) {
    console.error("Error updateMeeting:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar la reunión." });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    await ensureMeetingTable();
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "El ID de la reunión es obligatorio." });
    }

    // Obtener la reunión antes de eliminarla para notificar
    const [meetingRows] = await pool.query("SELECT * FROM meeting WHERE id_meeting = ?", [id]);
    const meetingToDelete = meetingRows[0];

    const [result] = await pool.query("DELETE FROM meeting WHERE id_meeting = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reunión no encontrada." });
    }

    // Notificar a los miembros del proyecto sobre la eliminación de la reunión
    if (meetingToDelete && meetingToDelete.id_proyecto) {
      const [projectRows] = await pool.query("SELECT nombre FROM proyecto WHERE id_proyecto = ?", [meetingToDelete.id_proyecto]);
      const nombreProyecto = projectRows[0]?.nombre || "Proyecto";

      await notifyMeetingChange(
        meetingToDelete.id_proyecto,
        meetingToDelete.title,
        nombreProyecto,
        meetingToDelete.date,
        meetingToDelete.startTime,
        'eliminada',
        req.user?.id || req.user?.id_usuario,
        null // Al eliminar no se usa miembros específicos, se notifica a todos
      );
    }

    return res.json({ success: true, data: { id: Number(id) } });
  } catch (error) {
    console.error("Error deleteMeeting:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar la reunión." });
  }
};

export const getMeetings = async (req, res) => {
  try {
    await ensureMeetingTable();
    const { sprint, from, to, q, id_proyecto } = req.query;
    const conditions = [];
    const values = [];

    if (id_proyecto) {
      conditions.push("id_proyecto = ?");
      values.push(id_proyecto);
    }

    if (sprint) {
      conditions.push("sprint = ?");
      values.push(sprint);
    }

    if (from) {
      const fromDate = new Date(from);
      if (isValidDate(fromDate)) {
        conditions.push("date >= ?");
        values.push(fromDate);
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (isValidDate(toDate)) {
        conditions.push("date <= ?");
        values.push(toDate);
      }
    }

    if (q) {
      const like = `%${String(q).trim()}%`;
      conditions.push(
        `(title LIKE ? OR description LIKE ? OR sprint LIKE ? OR status LIKE ? OR type LIKE ? OR room LIKE ? OR link LIKE ?)`,
      );
      values.push(like, like, like, like, like, like, like);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [meetings] = await pool.query(`SELECT * FROM meeting ${whereClause} ORDER BY date ASC`, values);
    return res.json({ success: true, data: meetings.map(withMeetingAliases) });
  } catch (error) {
    console.error("Error getMeetings:", error);
    return res.status(500).json({ success: false, message: "Error al obtener las reuniones." });
  }
};
