import pool from "../utils/database.js";

const ensureMeetingTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting (
      id_meeting INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      sprint VARCHAR(100) NOT NULL,
      status VARCHAR(100) DEFAULT 'programada',
      date DATETIME NOT NULL,
      type VARCHAR(100),
      startTime VARCHAR(20),
      duration VARCHAR(50),
      room VARCHAR(100),
      link VARCHAR(255),
      fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP
    )
  `);
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
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const sprint = String(body.sprint || "").trim();
  const status = String(body.status || "").trim();
  const type = String(body.type || "").trim();
  const room = String(body.room || "").trim();
  const link = String(body.link || "").trim();
  const date = parseMeetingDate(body.date);
  const startTime = String(body.startTime || "").trim();
  const duration = body.duration ? Number(body.duration) : null;

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
    title,
    description,
    sprint,
    status,
    type,
    room,
    link,
    date: startDate,
    duration: duration || null,
    startTime: startTime || null,
  };
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const withMeetingAliases = (meeting) => {
  if (!meeting) return meeting;

  const startDate = meeting.start_date || meeting.date || null;

  return {
    ...meeting,
    id: meeting.id || meeting.id_meeting,
    date: meeting.date || startDate,
    startDate,
    endDate: meeting.end_date || null,
    startTime: meeting.startTime || meeting.start_time || null,
    endTime: meeting.endTime || meeting.end_time || null,
  };
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
        (title, description, sprint, status, date, type, startTime, duration, room, link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        payload.description,
        payload.sprint,
        payload.status,
        payload.date,
        payload.type,
        payload.startTime,
        payload.duration,
        payload.room,
        payload.link,
      ],
    );

    const [rows] = await pool.query("SELECT * FROM meeting WHERE id_meeting = ?", [result.insertId]);
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
    return res.json({ success: true, data: withMeetingAliases(rows[0]) });
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

    const [result] = await pool.query("DELETE FROM meeting WHERE id_meeting = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reunión no encontrada." });
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
    const { sprint, from, to, q } = req.query;
    const conditions = [];
    const values = [];

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
