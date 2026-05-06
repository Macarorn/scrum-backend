import pool from "../utils/database.js";

const normalizeMeetingPayload = (body) => {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const sprint = String(body.sprint || "").trim();
  const status = String(body.status || "").trim();
  const type = String(body.type || "").trim();
  const room = String(body.room || "").trim();
  const link = String(body.link || "").trim();
  const date = body.date ? new Date(body.date) : null;
  const startTime = String(body.startTime || "").trim();
  const duration = body.duration ? Number(body.duration) : null;

  let startDate = null;
  let endDate = null;

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

    if (duration && Number.isFinite(duration)) {
      endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + duration);
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
    start_date: startDate,
    end_date: endDate,
    created_by: body.created_by ? Number(body.created_by) : null,
    duration: duration || null,
    start_time: startTime || null,
  };
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

export const createMeeting = async (req, res) => {
  try {
    const payload = normalizeMeetingPayload(req.body);

    if (!payload.title || !payload.start_date || !isValidDate(payload.start_date)) {
      return res.status(400).json({
        success: false,
        message: "El título y la fecha/hora de inicio de la reunión son obligatorios.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO meetings
        (title, description, sprint, status, type, room, link, start_date, end_date, duration, start_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.title,
        payload.description,
        payload.sprint,
        payload.status,
        payload.type,
        payload.room,
        payload.link,
        payload.start_date,
        payload.end_date,
        payload.duration,
        payload.start_time,
        payload.created_by,
      ],
    );

    const [rows] = await pool.query("SELECT * FROM meetings WHERE id = ?", [result.insertId]);
    return res.status(201).json({ success: true, data: rows[0] });
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
    const query = `UPDATE meetings SET ${fields.join(", ")} WHERE id = ?`;
    const [updateResult] = await pool.query(query, values);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Reunión no encontrada." });
    }

    const [rows] = await pool.query("SELECT * FROM meetings WHERE id = ?", [id]);
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error updateMeeting:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar la reunión." });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "El ID de la reunión es obligatorio." });
    }

    const [result] = await pool.query("DELETE FROM meetings WHERE id = ?", [id]);
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
        conditions.push("start_date >= ?");
        values.push(fromDate);
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (isValidDate(toDate)) {
        conditions.push("start_date <= ?");
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
    const [meetings] = await pool.query(`SELECT * FROM meetings ${whereClause} ORDER BY start_date ASC`, values);
    return res.json({ success: true, data: meetings });
  } catch (error) {
    console.error("Error getMeetings:", error);
    return res.status(500).json({ success: false, message: "Error al obtener las reuniones." });
  }
};
