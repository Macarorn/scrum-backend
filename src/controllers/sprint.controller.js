import pool from "../utils/database.js";

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

// ✅ CREAR
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

    res.status(201).json({
      success: true,
      data: {
        id_sprint: result.insertId,
        ...sprint,
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

// ✅ OBTENER TODOS
export const getSprints = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sprint");

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

// ✅ OBTENER POR ID
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
      data: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

// ✅ ACTUALIZAR
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

// ✅ ELIMINAR
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

// ✅ CAMBIAR ESTADO
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

    res.json({
      success: true,
      message: "Estado actualizado",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
