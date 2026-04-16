// Store temporal en memoria para pruebas del módulo proyectos.
import pool from "../utils/database.js";
import { generarCodigoUnicoProyecto } from "../utils/codigoProyecto.utils.js";

function notFoundError(entity = "Proyecto") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrado`,
  };
}

export const listarProyectos = async (userId) => {
  const [rows] = await pool.query(`
    SELECT DISTINCT p.* FROM proyecto p
    WHERE p.creado_por = ?
    OR EXISTS (
      SELECT 1 FROM usuario_equipo_proyecto uep
      JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
      WHERE ep.id_proyecto = p.id_proyecto AND uep.id_usuario = ?
    )
  `, [userId, userId]);
  return rows;
};

export const listarTodosProyectos = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.*,
      EXISTS (
        SELECT 1 FROM equipo_proyecto ep
        JOIN usuario_equipo_proyecto uep ON ep.id_equipo_proyecto = uep.id_equipo_proyecto
        WHERE ep.id_proyecto = p.id_proyecto
          AND uep.id_usuario = ?
          AND uep.activo = 1
      ) AS es_miembro
    FROM proyecto p`,
    [userId]
  );
  return rows;
};

export const unirseAProyecto = async (userId, proyectoId) => {
  const [proyectoRows] = await pool.query(
    "SELECT * FROM proyecto WHERE id_proyecto = ?",
    [proyectoId]
  );

  if (proyectoRows.length === 0) {
    throw notFoundError();
  }

  const [teamRows] = await pool.query(
    "SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = ? LIMIT 1",
    [proyectoId]
  );

  let idEquipoProyecto;

  if (teamRows.length > 0) {
    idEquipoProyecto = teamRows[0].id_equipo_proyecto;
  } else {
    const [insertResult] = await pool.query(
      "INSERT INTO equipo_proyecto (id_proyecto, nombre, descripcion) VALUES (?, ?, ?)",
      [proyectoId, "Equipo del proyecto", "Equipo principal del proyecto"]
    );
    idEquipoProyecto = insertResult.insertId;
  }

  const [existingRows] = await pool.query(
    "SELECT 1 FROM usuario_equipo_proyecto WHERE id_usuario = ? AND id_equipo_proyecto = ?",
    [userId, idEquipoProyecto]
  );

  if (existingRows.length > 0) {
    const error = new Error("Ya eres miembro de este proyecto");
    error.statusCode = 409;
    throw error;
  }

  await pool.query(
    "INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES (?, ?, ?)",
    [userId, idEquipoProyecto, 3]
  );

  return proyectoRows[0];
};

export const crearProyecto = async (data) => {
  // Generar código único para el proyecto
  const codigoProyecto = await generarCodigoUnicoProyecto(pool);

  const [result] = await pool.query(
    `INSERT INTO proyecto (nombre, descripcion, tipo, estado, fecha_inicio, fecha_fin_est, codigo_proyecto, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.descripcion || null,
      data.tipo || null,
      data.estado || "inicio",
      data.fecha_inicio || null,
      data.fecha_fin_est || null,
      codigoProyecto,
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

export const buscarProyectoPorCodigo = async (codigo) => {
  const [rows] = await pool.query("SELECT * FROM proyecto WHERE codigo_proyecto = ?", [codigo.toUpperCase()]);
  if (rows.length === 0) {
    throw notFoundError();
  }
  return rows[0];
};