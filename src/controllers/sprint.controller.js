import pool from "../utils/database.js";

// ✅ CREAR
export const createSprint = async (req, res) => {
  try {
    const { nombre, fechaInicio, fechaFin, velocidad } = req.body;

    if (!nombre || !fechaInicio || !fechaFin || !velocidad) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO sprints (nombre, fecha_inicio, fecha_fin, velocidad)
       VALUES (?, ?, ?, ?)`,
      [nombre, fechaInicio, fechaFin, velocidad]
    );

    res.status(201).json({
      success: true,
      data : {
        id :result.insertId,
        nombre,
        fechaInicio,
        fechaFin,
        velocidad
      },
      message: "sprint creado correctamente"
    });

  } catch (error) {
    console.error("Error createSprint:", error);
    res.status(500).json({ 
      success: false,
      error: "INTERNAL_ERROR",
      message :"Error interno del servidor"
    
    });
  }
};

// ✅ OBTENER TODOS
export const getSprints = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sprints");

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
      "SELECT * FROM sprints WHERE id = ?",
      [id]
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
    const { nombre, fechaInicio, fechaFin, velocidad } = req.body;

    const [result] = await pool.query(
      `UPDATE sprints
       SET nombre = ?, fecha_inicio = ?, fecha_fin = ?, velocidad = ?
       WHERE id = ?`,
      [nombre, fechaInicio, fechaFin, velocidad, id]
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
      "DELETE FROM sprints WHERE id = ?",
      [id]
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

    const estadosValidos = ["pendiente", "en_curso", "finalizado"];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "Estado inválido",
      });
    }

    const [result] = await pool.query(
      "UPDATE sprints SET estado = ? WHERE id = ?",
      [estado, id]
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