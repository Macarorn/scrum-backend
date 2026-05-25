import pool from "../utils/database.js";

function notFoundError(entity = "Épica") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrada`,
  };
}

export const listarEpicas = async (proyectoId) => {
  const query =
    proyectoId !== undefined
      ? `SELECT e.*,
         (SELECT COUNT(*) FROM historia_usuario h WHERE h.id_epica = e.id_epica AND h.estado <> 'eliminado') as total_historias,
         (SELECT se.id_sprint FROM sprint_epica se WHERE se.id_epica = e.id_epica LIMIT 1) as id_sprint_asignado
         FROM epica e
         WHERE e.id_proyecto = ? ORDER BY e.id_epica DESC`
      : `SELECT e.*,
         (SELECT COUNT(*) FROM historia_usuario h WHERE h.id_epica = e.id_epica AND h.estado <> 'eliminado') as total_historias,
         (SELECT se.id_sprint FROM sprint_epica se WHERE se.id_epica = e.id_epica LIMIT 1) as id_sprint_asignado
         FROM epica e ORDER BY e.id_epica DESC`;
  const params = proyectoId !== undefined ? [Number(proyectoId)] : [];
  const [rows] = await pool.query(query, params);

  return rows.map((row) => ({
    id: row.id_epica,
    id_epica: row.id_epica,
    proyectoId: row.id_proyecto,
    id_proyecto: row.id_proyecto,
    nombre: row.nombre,
    descripcion: row.descripcion || "",
    categoria: row.categoria || "",
    prioridad: row.prioridad,
    estado: row.estado,
    total_historias: row.total_historias || 0,
    id_sprint_asignado: row.id_sprint_asignado || null,
    createdAt: row.fecha_creacion,
    updatedAt: row.fecha_actualizacion,
  }));
};

export const crearEpica = async (data) => {
  // Get the count of epics in this project to generate a per-project identifier
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as count FROM epica WHERE id_proyecto = ?`,
    [Number(data.proyectoId)]
  );
  const epicCount = countResult[0].count;
  const epicIdentifier = epicCount + 1;

  const [result] = await pool.query(
    `INSERT INTO epica (id_proyecto, nombre, descripcion, categoria, prioridad, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(data.proyectoId),
      data.nombre,
      data.descripcion || null,
      data.categoria || null,
      Number(data.prioridad ?? 3),
      data.estado || "por_hacer",
    ],
  );

  // Add identifier to the epic name after insertion (per-project identifier)
  const epicaId = result.insertId;
  await pool.query(
    `UPDATE epica SET nombre = CONCAT('E', ?, ' - ', nombre) WHERE id_epica = ?`,
    [epicIdentifier, epicaId]
  );

  return await obtenerEpica(epicaId);
};

export const obtenerEpica = async (id) => {
  const [rows] = await pool.query("SELECT * FROM epica WHERE id_epica = ?", [
    Number(id),
  ]);
  if (rows.length === 0) {
    throw notFoundError();
  }

  const row = rows[0];
  return {
    id: row.id_epica,
    id_epica: row.id_epica,
    proyectoId: row.id_proyecto,
    id_proyecto: row.id_proyecto,
    nombre: row.nombre,
    descripcion: row.descripcion || "",
    categoria: row.categoria || "",
    prioridad: row.prioridad,
    estado: row.estado,
    createdAt: row.fecha_creacion,
    updatedAt: row.fecha_actualizacion,
  };
};

export const actualizarEpica = async (id, data) => {
  const actual = await obtenerEpica(id).catch(() => null);
  if (!actual) {
    throw notFoundError();
  }

  await pool.query(
    `UPDATE epica
     SET id_proyecto = ?, nombre = ?, descripcion = ?, categoria = ?, prioridad = ?, estado = ?, fecha_actualizacion = NOW()
     WHERE id_epica = ?`,
    [
      data.proyectoId !== undefined ? Number(data.proyectoId) : actual.proyectoId,
      data.nombre !== undefined ? data.nombre : actual.nombre,
      data.descripcion !== undefined ? data.descripcion : actual.descripcion,
      data.categoria !== undefined ? data.categoria : actual.categoria,
      data.prioridad !== undefined ? Number(data.prioridad) : actual.prioridad,
      data.estado !== undefined ? data.estado : actual.estado,
      Number(id),
    ],
  );

  return await obtenerEpica(id);
};

export const eliminarEpica = async (id) => {
  const [result] = await pool.query("DELETE FROM epica WHERE id_epica = ?", [
    Number(id),
  ]);
  if (result.affectedRows === 0) {
    throw notFoundError();
  }

  return {
    id: Number(id),
    eliminado: true,
  };
};
