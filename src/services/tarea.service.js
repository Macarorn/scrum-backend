import pool from "../utils/database.js";
import {
  invalidarMetricasPorHistoria,
  invalidarMetricasPorTarea,
} from "./metricas.service.js";

function crearError(message, statusCode, error, details = undefined) {
  return { message, statusCode, error, details };
}

function normalizarIdHistoria(data) {
  return Number(data.id_historia ?? data.historiaId ?? data.sprintId);
}

function normalizarIdResponsable(data) {
  return Number(
    data.id_usuario_responsable ?? data.responsableId ?? data.id_usuario ?? null,
  );
}

function normalizarIdSprint(data) {
  const idSprint = Number(data.id_sprint ?? data.sprintId ?? null);
  return Number.isInteger(idSprint) && idSprint > 0 ? idSprint : null;
}

async function obtenerContextoHistoria(idHistoria) {
  const [rows] = await pool.query(
    `SELECT h.id_historia, h.id_sprint, e.id_proyecto
     FROM historia_usuario h
     INNER JOIN epica e ON e.id_epica = h.id_epica
     WHERE h.id_historia = ?
     LIMIT 1`,
    [Number(idHistoria)],
  );

  return rows[0] || null;
}

async function resolverSprintDestino(idProyecto, idSprintSolicitado = null) {
  if (idSprintSolicitado) {
    const [sprintSolicitadoRows] = await pool.query(
      `SELECT id_sprint
       FROM sprint
       WHERE id_sprint = ? AND id_proyecto = ?
       LIMIT 1`,
      [Number(idSprintSolicitado), Number(idProyecto)],
    );

    if (sprintSolicitadoRows.length > 0) {
      return sprintSolicitadoRows[0].id_sprint;
    }
  }

  const [sprintActivoRows] = await pool.query(
    `SELECT id_sprint
     FROM sprint
     WHERE id_proyecto = ? AND estado = 'en_curso'
     ORDER BY fecha_inicio DESC, id_sprint DESC
     LIMIT 1`,
    [Number(idProyecto)],
  );
  if (sprintActivoRows.length > 0) {
    return sprintActivoRows[0].id_sprint;
  }

  const [sprintPlaneadoRows] = await pool.query(
    `SELECT id_sprint
     FROM sprint
     WHERE id_proyecto = ? AND estado = 'planeado'
     ORDER BY fecha_inicio DESC, id_sprint DESC
     LIMIT 1`,
    [Number(idProyecto)],
  );
  if (sprintPlaneadoRows.length > 0) {
    return sprintPlaneadoRows[0].id_sprint;
  }

  const [sprintUltimoRows] = await pool.query(
    `SELECT id_sprint
     FROM sprint
     WHERE id_proyecto = ?
     ORDER BY fecha_inicio DESC, id_sprint DESC
     LIMIT 1`,
    [Number(idProyecto)],
  );
  if (sprintUltimoRows.length > 0) {
    return sprintUltimoRows[0].id_sprint;
  }

  return null;
}

async function asegurarHistoriaEnSprintParaKanban(idHistoria, idSprintSolicitado = null) {
  const contexto = await obtenerContextoHistoria(idHistoria);
  if (!contexto) {
    return null;
  }

  const sprintActual = Number(contexto.id_sprint) || null;

  // Si ya tiene sprint y no se solicita cambio, mantenemos la asignacion actual.
  if (sprintActual && !idSprintSolicitado) {
    await pool.query(
      `INSERT IGNORE INTO sprint_historia (id_sprint, id_historia)
       VALUES (?, ?)`,
      [sprintActual, Number(idHistoria)],
    );
    return sprintActual;
  }

  const sprintDestino = await resolverSprintDestino(
    contexto.id_proyecto,
    idSprintSolicitado,
  );
  if (!sprintDestino) {
    return null;
  }

  await pool.query(
    `UPDATE historia_usuario
     SET id_sprint = ?
     WHERE id_historia = ?`,
    [sprintDestino, Number(idHistoria)],
  );

  await pool.query(
    `INSERT IGNORE INTO sprint_historia (id_sprint, id_historia)
     VALUES (?, ?)`,
    [sprintDestino, Number(idHistoria)],
  );

  return sprintDestino;
}

async function existeHistoriaActiva(idHistoria) {
  const [rows] = await pool.query(
    `SELECT id_historia
     FROM historia_usuario
     WHERE id_historia = ? AND estado <> 'eliminado'
     LIMIT 1`,
    [Number(idHistoria)],
  );

  return rows.length > 0;
}

async function existeUsuario(idUsuario) {
  const [rows] = await pool.query(
    `SELECT id_usuario
     FROM usuario
     WHERE id_usuario = ?
     LIMIT 1`,
    [Number(idUsuario)],
  );

  return rows.length > 0;
}

function mapearErrorMysql(error) {
  if (!error) return null;

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return crearError(
      "No se pudo crear la tarea: la historia o el usuario responsable no existen",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (error.code === "ER_BAD_NULL_ERROR") {
    return crearError(
      "No se pudo crear la tarea: faltan campos obligatorios",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (error.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
    return crearError(
      "No se pudo crear la tarea: uno o más valores tienen formato inválido",
      400,
      "VALIDATION_ERROR",
    );
  }

  return null;
}

async function obtenerFilaTarea(id) {
  const [rows] = await pool.query(
    `SELECT t.*, h.nombre AS historia_nombre
     FROM tarea t
     LEFT JOIN historia_usuario h ON h.id_historia = t.id_historia
     WHERE t.id_tarea = ?`,
    [Number(id)],
  );

  return rows[0] || null;
}

async function obtenerAsignados(idTarea) {
  const [rows] = await pool.query(
    `SELECT tu.id_usuario, tu.es_responsable, u.nombre
     FROM tarea_usuario tu
     LEFT JOIN usuario u ON u.id_usuario = tu.id_usuario
     WHERE tu.id_tarea = ?
     ORDER BY tu.es_responsable DESC, tu.id_usuario ASC`,
    [Number(idTarea)],
  );

  return rows.map((row) => ({
    id_usuario: row.id_usuario,
    es_responsable: Boolean(row.es_responsable),
    nombre: row.nombre || null,
  }));
}

async function obtenerAsignadosPorTareas(idTareas) {
  const ids = [...new Set(idTareas.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) {
    return new Map();
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT tu.id_tarea, tu.id_usuario, tu.es_responsable, u.nombre
     FROM tarea_usuario tu
     LEFT JOIN usuario u ON u.id_usuario = tu.id_usuario
     WHERE tu.id_tarea IN (${placeholders})
     ORDER BY tu.id_tarea ASC, tu.es_responsable DESC, tu.id_usuario ASC`,
    ids,
  );

  const asignadosPorTarea = new Map(ids.map((id) => [id, []]));
  for (const row of rows) {
    const idTarea = Number(row.id_tarea);
    const asignados = asignadosPorTarea.get(idTarea) || [];
    asignados.push({
      id_usuario: row.id_usuario,
      es_responsable: Boolean(row.es_responsable),
      nombre: row.nombre || null,
    });
    asignadosPorTarea.set(idTarea, asignados);
  }

  return asignadosPorTarea;
}

async function obtenerEtiquetas(idTarea) {
  const [rows] = await pool.query(
    `SELECT id_etiqueta
     FROM tarea_etiqueta
     WHERE id_tarea = ?
     ORDER BY id_etiqueta ASC`,
    [Number(idTarea)],
  );

  return rows.map((row) => row.id_etiqueta);
}

async function obtenerComentarios(idTarea) {
  const [rows] = await pool.query(
    `SELECT id_comentario, comentario, id_usuario, fecha
     FROM comentario_tarea
     WHERE id_tarea = ?
     ORDER BY id_comentario ASC`,
    [Number(idTarea)],
  );

  return rows.map((row) => ({ ...row }));
}

async function obtenerHistorial(idTarea) {
  const [rows] = await pool.query(
    `SELECT id_historial, id_usuario, estado_anterior, estado_nuevo, observacion, fecha
     FROM historial_tarea
     WHERE id_tarea = ?
     ORDER BY id_historial ASC`,
    [Number(idTarea)],
  );

  return rows.map((row) => ({ ...row }));
}

async function mapearTareaCompleta(row) {
  if (!row) {
    return null;
  }

  const [asignados, etiquetas, comentarios, historial] = await Promise.all([
    obtenerAsignados(row.id_tarea),
    obtenerEtiquetas(row.id_tarea),
    obtenerComentarios(row.id_tarea),
    obtenerHistorial(row.id_tarea),
  ]);

  return {
    ...row,
    asignados,
    etiquetas,
    comentarios,
    historial,
  };
}

async function mapearTareasConAsignados(rows) {
  const asignadosPorTarea = await obtenerAsignadosPorTareas(
    rows.map((row) => row.id_tarea),
  );

  return rows.map((row) => ({
    ...row,
    asignados: asignadosPorTarea.get(Number(row.id_tarea)) || [],
  }));
}

export async function listarTareasPorHistoria(idHistoria, estado) {
  const condiciones = [];
  const params = [];

  if (idHistoria !== undefined && idHistoria !== null && idHistoria !== "") {
    condiciones.push("t.id_historia = ?");
    params.push(Number(idHistoria));
  }

  if (estado !== undefined && estado !== null && estado !== "") {
    condiciones.push("t.estado = ?");
    params.push(estado);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT t.*, h.nombre AS historia_nombre
     FROM tarea t
     LEFT JOIN historia_usuario h ON h.id_historia = t.id_historia
     ${where}
     ORDER BY t.orden_columna ASC, t.id_tarea ASC`,
    params,
  );

  return await mapearTareasConAsignados(rows);
}

export async function listarTareasPorSprint(idSprint, estado) {
  const condiciones = [
    `(h.id_sprint = ? OR EXISTS (
      SELECT 1
      FROM sprint_historia sh
      WHERE sh.id_historia = t.id_historia AND sh.id_sprint = ?
    ))`,
  ];
  const params = [Number(idSprint), Number(idSprint)];

  if (estado !== undefined && estado !== null && estado !== "") {
    condiciones.push("t.estado = ?");
    params.push(estado);
  }

  const [rows] = await pool.query(
    `SELECT t.*, h.nombre AS historia_nombre
     FROM tarea t
     INNER JOIN historia_usuario h ON h.id_historia = t.id_historia
     WHERE ${condiciones.join(" AND ")}
     ORDER BY t.orden_columna ASC, t.id_tarea ASC`,
    params,
  );

  return await mapearTareasConAsignados(rows);
}

export async function crearTarea(data, userId) {
  const idHistoria = normalizarIdHistoria(data);
  const responsableId = normalizarIdResponsable(data);
  const sprintSolicitado = normalizarIdSprint(data);

  const historiaExiste = await existeHistoriaActiva(idHistoria);
  if (!historiaExiste) {
    throw crearError(
      "No se pudo crear la tarea: la historia no existe o fue eliminada",
      400,
      "VALIDATION_ERROR",
      { id_historia: idHistoria },
    );
  }

  if (Number.isInteger(responsableId) && responsableId > 0) {
    const usuarioExiste = await existeUsuario(responsableId);
    if (!usuarioExiste) {
      throw crearError(
        "No se pudo crear la tarea: el usuario responsable no existe",
        400,
        "VALIDATION_ERROR",
        { id_usuario_responsable: responsableId },
      );
    }
  }

  let result;
  try {
    const [insertResult] = await pool.query(
      `INSERT INTO tarea (
        id_historia,
        nombre,
        descripcion,
        tipo,
        estado,
        prioridad,
        story_points,
        estimacion_dias,
        tiempo_real,
        orden_columna,
        fecha_inicio,
        fecha_fin_est,
        fecha_fin_real
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idHistoria,
        data.nombre,
        data.descripcion || null,
        data.tipo || "otro",
        data.estado || "por_hacer",
        data.prioridad || "media",
        data.story_points ?? data.storyPoints ?? null,
        data.estimacion_dias ?? data.estimacionDias ?? null,
        data.tiempo_real ?? data.tiempoReal ?? 0,
        Number(data.orden_columna ?? data.ordenColumna ?? data.orden) || 0,
        data.fecha_inicio ?? data.fechaInicio ?? null,
        data.fecha_fin_est ?? data.fechaFinEst ?? null,
        data.fecha_fin_real ?? data.fechaFinReal ?? null,
      ],
    );
    result = insertResult;
  } catch (error) {
    const errorMapeado = mapearErrorMysql(error);
    if (errorMapeado) {
      throw errorMapeado;
    }
    throw error;
  }

  if (Number.isInteger(responsableId) && responsableId > 0) {
    await pool.query(
      `INSERT IGNORE INTO tarea_usuario (id_tarea, id_usuario, es_responsable)
       VALUES (?, ?, 1)`,
      [result.insertId, responsableId],
    );
  }

  const sprintAsignadoKanban = await asegurarHistoriaEnSprintParaKanban(
    idHistoria,
    sprintSolicitado,
  );

  await registrarAuditoriaHistorial(
    result.insertId,
    Number(userId) || responsableId || 1,
    "Tarea creada",
  );

  const tareaCreada = await obtenerTareaPorId(result.insertId);
  await invalidarMetricasPorHistoria(idHistoria);

  return {
    ...tareaCreada,
    id_sprint_resuelto: sprintAsignadoKanban,
  };
}

export async function obtenerTareaPorId(id) {
  const row = await obtenerFilaTarea(id);
  if (!row) {
    return null;
  }

  return await mapearTareaCompleta(row);
}

export async function actualizarTareaPorId(id, data, userId) {
  const actual = await obtenerFilaTarea(id);
  if (!actual) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const siguienteHistoria =
    data.id_historia !== undefined
      ? Number(data.id_historia)
      : data.historiaId !== undefined
        ? Number(data.historiaId)
        : data.sprintId !== undefined
          ? Number(data.sprintId)
          : actual.id_historia;

  await pool.query(
    `UPDATE tarea
     SET nombre = ?,
         descripcion = ?,
         tipo = ?,
         estado = ?,
         id_historia = ?,
         prioridad = ?,
         story_points = ?,
         estimacion_dias = ?,
         tiempo_real = ?,
         orden_columna = ?,
         fecha_modificacion = NOW()
     WHERE id_tarea = ?`,
    [
      data.nombre !== undefined ? data.nombre : actual.nombre,
      data.descripcion !== undefined ? data.descripcion : actual.descripcion,
      data.tipo !== undefined ? data.tipo : actual.tipo,
      data.estado !== undefined ? data.estado : actual.estado,
      siguienteHistoria,
      data.prioridad !== undefined ? data.prioridad : actual.prioridad,
      data.story_points !== undefined
        ? data.story_points
        : data.storyPoints !== undefined
          ? data.storyPoints
          : actual.story_points,
      data.estimacion_dias !== undefined
        ? data.estimacion_dias
        : data.estimacionDias !== undefined
          ? data.estimacionDias
          : actual.estimacion_dias,
      data.tiempo_real !== undefined
        ? data.tiempo_real
        : data.tiempoReal !== undefined
          ? data.tiempoReal
          : actual.tiempo_real,
      data.orden_columna !== undefined
        ? Number(data.orden_columna)
        : data.ordenColumna !== undefined
          ? Number(data.ordenColumna)
          : data.orden !== undefined
            ? Number(data.orden)
            : actual.orden_columna,
      Number(id),
    ],
  );

  await registrarAuditoriaHistorial(
    id,
    Number(userId) || 1,
    "Tarea actualizada",
    actual.estado,
    data.estado !== undefined ? data.estado : actual.estado,
  );

  await invalidarMetricasPorHistoria(actual.id_historia);
  if (Number(siguienteHistoria) !== Number(actual.id_historia)) {
    await invalidarMetricasPorHistoria(siguienteHistoria);
  }

  return await obtenerTareaPorId(id);
}

export async function eliminarTareaPorId(id, userId) {
  const actual = await obtenerFilaTarea(id);
  const [result] = await pool.query(`DELETE FROM tarea WHERE id_tarea = ?`, [
    Number(id),
  ]);

  if (result.affectedRows === 0) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  if (actual?.id_historia) {
    await invalidarMetricasPorHistoria(actual.id_historia);
  }

  return { id_tarea: Number(id), eliminado: true };
}

export async function cambiarEstadoTarea(id, nuevoEstado, userId) {
  const actual = await obtenerFilaTarea(id);
  if (!actual) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  await pool.query(
    `UPDATE tarea
     SET estado = ?, fecha_modificacion = NOW()
     WHERE id_tarea = ?`,
    [nuevoEstado, Number(id)],
  );

  await registrarAuditoriaHistorial(
    id,
    Number(userId) || 1,
    `Estado actualizado: ${actual.estado} -> ${nuevoEstado}`,
    actual.estado,
    nuevoEstado,
  );

  await invalidarMetricasPorHistoria(actual.id_historia);

  return await obtenerTareaPorId(id);
}

export async function actualizarOrdenTarea(id, nuevoOrden, userId) {
  const [result] = await pool.query(
    `UPDATE tarea
     SET orden_columna = ?, fecha_modificacion = NOW()
     WHERE id_tarea = ?`,
    [Number(nuevoOrden), Number(id)],
  );

  if (result.affectedRows === 0) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  await registrarAuditoriaHistorial(
    id,
    Number(userId) || 1,
    `Orden actualizado a ${Number(nuevoOrden)}`,
  );

  return await obtenerTareaPorId(id);
}

export async function registrarTiempoReal(id, tiempo, userId) {
  const [result] = await pool.query(
    `UPDATE tarea
     SET tiempo_real = ?, fecha_modificacion = NOW()
     WHERE id_tarea = ?`,
    [Number(tiempo), Number(id)],
  );

  if (result.affectedRows === 0) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  await registrarAuditoriaHistorial(
    id,
    Number(userId) || 1,
    `Tiempo real actualizado a ${Number(tiempo)}`,
  );

  await invalidarMetricasPorTarea(id);

  return await obtenerTareaPorId(id);
}

export async function asignarUsuarioTarea(id, userId, actorId) {
  const [result] = await pool.query(
    `INSERT IGNORE INTO tarea_usuario (id_tarea, id_usuario, es_responsable)
     VALUES (?, ?, 0)`,
    [Number(id), Number(userId)],
  );

  if (result.affectedRows === 0) {
    const tarea = await obtenerFilaTarea(id);
    if (!tarea) {
      throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
    }
  }

  await registrarAuditoriaHistorial(
    id,
    Number(actorId) || 1,
    `Usuario ${Number(userId)} asignado`,
  );

  await invalidarMetricasPorTarea(id);

  return await obtenerTareaPorId(id);
}

export async function desasignarUsuarioTarea(id, userId, actorId) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  await pool.query(
    `DELETE FROM tarea_usuario
     WHERE id_tarea = ? AND id_usuario = ?`,
    [Number(id), Number(userId)],
  );

  await registrarAuditoriaHistorial(
    id,
    Number(actorId) || 1,
    `Usuario ${Number(userId)} desasignado`,
  );

  await invalidarMetricasPorTarea(id);

  return await obtenerTareaPorId(id);
}

export async function listarUsuariosAsignados(id) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return await obtenerAsignados(id);
}

export async function obtenerHistorialTarea(id) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return await obtenerHistorial(id);
}

export async function listarComentariosTarea(id) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return await obtenerComentarios(id);
}

export async function agregarComentarioTarea(id, comentario, userId) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const actor = Number(userId);
  if (!Number.isInteger(actor) || actor <= 0) {
    throw crearError("Usuario invalido para comentario", 400, "VALIDATION_ERROR");
  }

  const [result] = await pool.query(
    `INSERT INTO comentario_tarea (id_tarea, id_usuario, comentario)
     VALUES (?, ?, ?)`,
    [Number(id), actor, comentario],
  );

  await registrarAuditoriaHistorial(
    id,
    actor,
    `Comentario ${result.insertId} agregado`,
  );

  return {
    id_comentario: result.insertId,
    comentario,
    id_usuario: actor,
    id_tarea: Number(id),
  };
}

export async function eliminarComentario(idComentario, actorId) {
  const [rows] = await pool.query(
    `SELECT id_tarea FROM comentario_tarea WHERE id_comentario = ?`,
    [Number(idComentario)],
  );

  if (rows.length === 0) {
    throw crearError("Comentario no encontrado", 404, "NOT_FOUND");
  }

  const idTarea = rows[0].id_tarea;

  await pool.query(
    `DELETE FROM comentario_tarea WHERE id_comentario = ?`,
    [Number(idComentario)],
  );

  await registrarAuditoriaHistorial(
    idTarea,
    Number(actorId) || 1,
    `Comentario ${Number(idComentario)} eliminado`,
  );

  return { id_comentario: Number(idComentario), eliminado: true };
}

export async function asignarEtiquetaTarea(id, etiquetaId, actorId) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  await pool.query(
    `INSERT IGNORE INTO tarea_etiqueta (id_tarea, id_etiqueta)
     VALUES (?, ?)`,
    [Number(id), Number(etiquetaId)],
  );

  await registrarAuditoriaHistorial(
    id,
    Number(actorId) || 1,
    `Etiqueta ${Number(etiquetaId)} asignada`,
  );

  return await obtenerTareaPorId(id);
}

export async function removerEtiquetaTarea(id, etiquetaId, actorId) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  await pool.query(
    `DELETE FROM tarea_etiqueta
     WHERE id_tarea = ? AND id_etiqueta = ?`,
    [Number(id), Number(etiquetaId)],
  );

  await registrarAuditoriaHistorial(
    id,
    Number(actorId) || 1,
    `Etiqueta ${Number(etiquetaId)} removida`,
  );

  return await obtenerTareaPorId(id);
}

export async function registrarAuditoriaHistorial(
  tareaId,
  userId,
  observacion,
  estadoAnterior = null,
  estadoNuevo = null,
) {
  const actor = Number(userId);
  if (!Number.isInteger(actor) || actor <= 0) {
    return;
  }

  try {
    const estadosValidos = new Set([
      "por_hacer",
      "en_progreso",
      "terminado",
      "bloqueado",
    ]);

    let estadoNuevoFinal = estadoNuevo;
    if (!estadoNuevoFinal) {
      const filaTarea = await obtenerFilaTarea(tareaId);
      estadoNuevoFinal = filaTarea?.estado || estadoAnterior || "por_hacer";
    }

    if (!estadosValidos.has(estadoNuevoFinal)) {
      estadoNuevoFinal = "por_hacer";
    }

    await pool.query(
      `INSERT INTO historial_tarea
        (id_tarea, id_usuario, estado_anterior, estado_nuevo, observacion)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(tareaId),
        actor,
        estadoAnterior,
        estadoNuevoFinal,
        observacion,
      ],
    );
  } catch (error) {
    // El log de auditoria no debe impedir la operacion principal.
    console.warn("No se pudo registrar historial de tarea:", error.message);
  }
}
