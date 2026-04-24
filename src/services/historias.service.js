import pool from "../utils/database.js";

function notFoundError(entity = "Historia") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrada`,
  };
}

export const listarHistorias = async (epicaId) => {
  const hasEpica = epicaId !== undefined && epicaId !== null && epicaId !== "";
  const [rows] = await pool.query(
    hasEpica
      ? `SELECT * FROM historia_usuario
         WHERE id_epica = ? AND estado <> 'eliminado'
         ORDER BY id_historia DESC`
      : `SELECT * FROM historia_usuario
         WHERE estado <> 'eliminado'
         ORDER BY id_historia DESC`,
    hasEpica ? [Number(epicaId)] : [],
  );

  return rows.map((row) => ({
    id: row.id_historia,
    id_historia: row.id_historia,
    epicaId: row.id_epica,
    id_epica: row.id_epica,
    sprintId: row.id_sprint,
    id_sprint: row.id_sprint,
    nombre: row.nombre,
    descripcion: row.descripcion || "",
    prioridad: row.prioridad,
    storyPoints: row.story_points,
    story_points: row.story_points,
    estado: row.estado,
    createdAt: row.fecha_creacion,
    updatedAt: row.fecha_modificacion,
  }));
};

export const crearHistoria = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO historia_usuario
      (id_epica, nombre, descripcion, prioridad, story_points, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(data.epicaId),
      data.nombre,
      data.descripcion || null,
      Number(data.prioridad),
      Number(data.storyPoints),
      data.estado || "por_hacer",
    ],
  );

  return await obtenerHistoria(result.insertId);
};

export const obtenerHistoria = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM historia_usuario
     WHERE id_historia = ? AND estado <> 'eliminado'`,
    [Number(id)],
  );

  if (rows.length === 0) {
    throw notFoundError();
  }

  const row = rows[0];
  return {
    id: row.id_historia,
    id_historia: row.id_historia,
    epicaId: row.id_epica,
    id_epica: row.id_epica,
    sprintId: row.id_sprint,
    id_sprint: row.id_sprint,
    nombre: row.nombre,
    descripcion: row.descripcion || "",
    prioridad: row.prioridad,
    storyPoints: row.story_points,
    story_points: row.story_points,
    estado: row.estado,
    createdAt: row.fecha_creacion,
    updatedAt: row.fecha_modificacion,
  };
};

export const actualizarHistoria = async (id, data) => {
  const actual = await obtenerHistoria(id).catch(() => null);
  if (!actual) {
    throw notFoundError();
  }

  await pool.query(
    `UPDATE historia_usuario
     SET id_epica = ?,
         nombre = ?,
         descripcion = ?,
         prioridad = ?,
         story_points = ?,
         estado = ?,
         fecha_modificacion = NOW()
     WHERE id_historia = ?`,
    [
      data.epicaId !== undefined ? Number(data.epicaId) : actual.epicaId,
      data.nombre !== undefined ? data.nombre : actual.nombre,
      data.descripcion !== undefined ? data.descripcion : actual.descripcion,
      data.prioridad !== undefined ? Number(data.prioridad) : actual.prioridad,
      data.storyPoints !== undefined
        ? Number(data.storyPoints)
        : actual.storyPoints,
      data.estado !== undefined ? data.estado : actual.estado,
      Number(id),
    ],
  );

  return await obtenerHistoria(id);
};

export const eliminarHistoria = async (id) => {
  const [result] = await pool.query(
    `UPDATE historia_usuario
     SET estado = 'eliminado', fecha_modificacion = NOW()
     WHERE id_historia = ? AND estado <> 'eliminado'`,
    [Number(id)],
  );

  if (result.affectedRows === 0) {
    throw notFoundError();
  }

  return {
    id: Number(id),
    eliminado: true,
  };
};

export const listarCriterios = async (historiaId) => {
  await obtenerHistoria(historiaId);
  const [rows] = await pool.query(
    `SELECT * FROM criterio_aceptacion
     WHERE id_historia = ?
     ORDER BY id_criterio DESC`,
    [Number(historiaId)],
  );

  return rows.map((row) => ({
    id: row.id_criterio,
    historiaId: row.id_historia,
    descripcion: row.descripcion,
    cumplido: Boolean(row.cumplido),
    createdAt: row.fecha_creacion,
  }));
};

export const crearCriterio = async (historiaId, data) => {
  await obtenerHistoria(historiaId);
  const [result] = await pool.query(
    `INSERT INTO criterio_aceptacion (id_historia, descripcion, cumplido)
     VALUES (?, ?, 0)`,
    [Number(historiaId), data.descripcion],
  );

  return {
    id: result.insertId,
    historiaId: Number(historiaId),
    descripcion: data.descripcion,
    cumplido: false,
  };
};

export const obtenerCriterioPorId = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM criterio_aceptacion WHERE id_criterio = ?`,
    [Number(id)],
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id_criterio,
    historiaId: row.id_historia,
    descripcion: row.descripcion,
    cumplido: Boolean(row.cumplido),
    createdAt: row.fecha_creacion,
  };
};

export const actualizarCriterioPorId = async (id, data) => {
  const actual = await obtenerCriterioPorId(id);
  if (!actual) {
    return null;
  }

  await pool.query(
    `UPDATE criterio_aceptacion
     SET descripcion = ?, cumplido = ?
     WHERE id_criterio = ?`,
    [
      data.descripcion !== undefined ? data.descripcion : actual.descripcion,
      data.cumplido !== undefined ? Number(Boolean(data.cumplido)) : Number(actual.cumplido),
      Number(id),
    ],
  );

  return await obtenerCriterioPorId(id);
};

export const eliminarCriterioPorId = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM criterio_aceptacion WHERE id_criterio = ?`,
    [Number(id)],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return {
    id: Number(id),
    eliminado: true,
  };
};
