// Store temporal en memoria para pruebas del módulo proyectos.
import pool from "../utils/database.js";

function notFoundError(entity = "Proyecto") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrado`,
  };
}

export const listarProyectos = async () => {
  const [rows] = await pool.query("SELECT * FROM proyecto");
  return rows;
};

export const crearProyecto = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO proyecto (nombre, descripcion, tipo, estado, fecha_inicio, fecha_fin_est, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.descripcion || null,
      data.tipo || null,
      data.estado || "inicio",
      data.fecha_inicio || null,
      data.fecha_fin_est || null,
      data.creado_por || 1, // Asumir usuario 1 si no se pasa
    ]
  );
  const [rows] = await pool.query("SELECT * FROM proyecto WHERE id_proyecto = ?", [result.insertId]);
  return rows[0];
};

export const obtenerProyecto = async (id) => {
  const [rows] = await pool.query("SELECT * FROM proyecto WHERE id_proyecto = ?", [id]);
  if (rows.length === 0) {
    throw notFoundError();
  }
  return rows[0];
};

export const actualizarProyecto = async (id, data) => {
  const [result] = await pool.query(
    `UPDATE proyecto SET nombre = ?, descripcion = ?, tipo = ?, estado = ?, fecha_inicio = ?, fecha_fin_est = ?, fecha_actualizacion = NOW()
     WHERE id_proyecto = ?`,
    [
      data.nombre || null,
      data.descripcion || null,
      data.tipo || null,
      data.estado || null,
      data.fecha_inicio || null,
      data.fecha_fin_est || null,
      id,
    ]
  );
  if (result.affectedRows === 0) {
    throw notFoundError();
  }
  const [rows] = await pool.query("SELECT * FROM proyecto WHERE id_proyecto = ?", [id]);
  return rows[0];
};

export const eliminarProyecto = async (id) => {
  const [rows] = await pool.query("SELECT * FROM proyecto WHERE id_proyecto = ?", [id]);
  if (rows.length === 0) {
    throw notFoundError();
  }
  const proyecto = rows[0];
  await pool.query("DELETE FROM proyecto WHERE id_proyecto = ?", [id]);
  return proyecto;
};