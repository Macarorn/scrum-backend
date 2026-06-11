import pool from "../utils/database.js";
import notificacionesService from "./notificaciones.service.js";

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
    `SELECT h.id_historia, h.id_sprint, e.id_proyecto, e.id_epica
     FROM historia_usuario h
     INNER JOIN epica e ON e.id_epica = h.id_epica
     WHERE h.id_historia = ?
     LIMIT 1`,
    [Number(idHistoria)],
  );

  const contexto = rows[0] || null;
  if (!contexto) {
    return null;
  }

  // Obtener sprint de la épica si existe
  const [epicaSprintRows] = await pool.query(
    `SELECT se.id_sprint
     FROM sprint_epica se
     WHERE se.id_epica = ?
     LIMIT 1`,
    [contexto.id_epica],
  );

  return {
    ...contexto,
    id_sprint_epica: epicaSprintRows[0]?.id_sprint || null,
  };
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
  const sprintEpica = Number(contexto.id_sprint_epica) || null;

  // Si se solicita un sprint explícito, usar ese
  if (idSprintSolicitado) {
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

  // Si la historia ya tiene sprint, mantener la asignación actual
  if (sprintActual) {
    await pool.query(
      `INSERT IGNORE INTO sprint_historia (id_sprint, id_historia)
       VALUES (?, ?)`,
      [sprintActual, Number(idHistoria)],
    );
    return sprintActual;
  }

  // Si la historia no tiene sprint pero la épica sí, heredar de la épica
  if (sprintEpica) {
    await pool.query(
      `UPDATE historia_usuario
       SET id_sprint = ?
       WHERE id_historia = ?`,
      [sprintEpica, Number(idHistoria)],
    );

    await pool.query(
      `INSERT IGNORE INTO sprint_historia (id_sprint, id_historia)
       VALUES (?, ?)`,
      [sprintEpica, Number(idHistoria)],
    );

    return sprintEpica;
  }

  // Si nada de lo anterior, buscar un sprint activo del proyecto
  const sprintDestino = await resolverSprintDestino(
    contexto.id_proyecto,
    null,
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

async function obtenerNombreUsuario(idUsuario) {
  const [rows] = await pool.query(
    `SELECT nombre FROM usuario WHERE id_usuario = ?`,
    [Number(idUsuario)],
  );
  return rows[0] || null;
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

  const [asignados, etiquetas, comentarios, historial, responsable] = await Promise.all([
    obtenerAsignados(row.id_tarea),
    obtenerEtiquetas(row.id_tarea),
    obtenerComentarios(row.id_tarea),
    obtenerHistorial(row.id_tarea),
    row.id_usuario_responsable ? obtenerNombreUsuario(row.id_usuario_responsable) : Promise.resolve(null),
  ]);

  return {
    ...row,
    asignados,
    etiquetas,
    comentarios,
    historial,
    responsable_nombre: responsable?.nombre || null,
  };
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
    `SELECT t.*, h.nombre AS historia_nombre, h.id_sprint AS historia_sprint
     FROM tarea t
     LEFT JOIN historia_usuario h ON h.id_historia = t.id_historia
     ${where}
     ORDER BY t.orden_columna ASC, t.id_tarea ASC`,
    params,
  );

  // Enriquecer con asignados y responsable
  const tareasConAsignados = await Promise.all(
    rows.map(async (row) => {
      const [asignados] = await pool.query(
        `SELECT u.id_usuario, u.nombre
         FROM tarea_usuario tu
         JOIN usuario u ON tu.id_usuario = u.id_usuario
         WHERE tu.id_tarea = ?`,
        [row.id_tarea]
      );
      
      let responsableNombre = null;
      if (row.id_usuario_responsable) {
        const [responsable] = await pool.query(
          `SELECT nombre FROM usuario WHERE id_usuario = ?`,
          [row.id_usuario_responsable]
        );
        responsableNombre = responsable[0]?.nombre || null;
      }
      
      return {
        ...row,
        asignados,
        id_sprint: row.id_sprint || row.historia_sprint,
        responsable_nombre: responsableNombre,
      };
    })
  );

  return tareasConAsignados;
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

  // Enriquecer con asignados
  const tareasConAsignados = await Promise.all(
    rows.map(async (row) => {
      const [asignados] = await pool.query(
        `SELECT u.id_usuario, u.nombre
         FROM tarea_usuario tu
         JOIN usuario u ON tu.id_usuario = u.id_usuario
         WHERE tu.id_tarea = ?`,
        [row.id_tarea]
      );
      return {
        ...row,
        asignados,
      };
    })
  );

  return tareasConAsignados;
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
        id_usuario_responsable,
        fecha_inicio,
        fecha_fin_est,
        fecha_fin_real
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        responsableId || null,
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

  // NO asignar automáticamente al creador - solo asignar si se proporciona responsableId
  // if (Number.isInteger(responsableId) && responsableId > 0) {
  //   await pool.query(
  //     `INSERT IGNORE INTO tarea_usuario (id_tarea, id_usuario, es_responsable)
  //      VALUES (?, ?, 1)`,
  //     [result.insertId, responsableId],
  //   );
  // }

  const sprintAsignadoKanban = await asegurarHistoriaEnSprintParaKanban(
    idHistoria,
    sprintSolicitado,
  );

  await registrarAuditoriaHistorial(
    result.insertId,
    Number(userId) || responsableId || 1,
    "Tarea creada",
  );

  // Enviar notificación al responsable si se asignó uno al crear la tarea
  if (responsableId) {
    try {
      const tareaCreada = await obtenerFilaTarea(result.insertId);
      
      // Obtener información del proyecto
      const [proyectoRows] = await pool.query(
        `SELECT p.id_proyecto, p.nombre 
         FROM proyecto p
         JOIN historia_usuario h ON h.id_proyecto = p.id_proyecto
         WHERE h.id_historia = ?`,
        [idHistoria]
      );
      const proyecto = proyectoRows[0];

      await notificacionesService.crearNotificacion({
        id_usuario: Number(responsableId),
        tipo: 'tarea_asignada',
        titulo: 'Tarea asignada',
        mensaje: `Has sido asignado a la tarea "${data.nombre}"${proyecto ? ` en el proyecto "${proyecto.nombre}"` : ''}`,
        id_proyecto: proyecto?.id_proyecto || null,
      });
    } catch (notifError) {
      console.warn("No se pudo enviar notificación de asignación al crear tarea:", notifError.message);
    }
  }

  const tareaCreada = await obtenerTareaPorId(result.insertId);
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

  const nuevoResponsableId = normalizarIdResponsable(data);
  const responsableActual = actual.id_usuario_responsable;

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
         id_usuario_responsable = ?,
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
      nuevoResponsableId !== null ? nuevoResponsableId : responsableActual,
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

  // Enviar notificaciones si cambió el responsable
  if (nuevoResponsableId !== null && nuevoResponsableId !== responsableActual) {
    try {
      // Obtener información del proyecto
      const [proyectoRows] = await pool.query(
        `SELECT p.id_proyecto, p.nombre 
         FROM proyecto p
         JOIN historia_usuario h ON h.id_proyecto = p.id_proyecto
         WHERE h.id_historia = ?`,
        [actual.id_historia]
      );
      const proyecto = proyectoRows[0];

      // Notificar al nuevo responsable
      if (nuevoResponsableId) {
        const [nuevoUsuarioRows] = await pool.query(
          `SELECT nombre FROM usuario WHERE id_usuario = ?`,
          [Number(nuevoResponsableId)]
        );
        const nuevoUsuarioNombre = nuevoUsuarioRows[0]?.nombre || `Usuario #${nuevoResponsableId}`;

        await notificacionesService.crearNotificacion({
          id_usuario: Number(nuevoResponsableId),
          tipo: 'tarea_asignada',
          titulo: 'Tarea reasignada',
          mensaje: `La tarea "${actual.nombre}" te ha sido asignada${proyecto ? ` en el proyecto "${proyecto.nombre}"` : ''}`,
          id_proyecto: proyecto?.id_proyecto || null,
        });
      }

      // Notificar al responsable anterior que fue desasignado
      if (responsableActual) {
        await notificacionesService.crearNotificacion({
          id_usuario: Number(responsableActual),
          tipo: 'tarea_desasignada',
          titulo: 'Tarea reasignada',
          mensaje: `La tarea "${actual.nombre}" te ha sido reasignada a otro usuario${proyecto ? ` en el proyecto "${proyecto.nombre}"` : ''}`,
          id_proyecto: proyecto?.id_proyecto || null,
        });
      }
    } catch (notifError) {
      console.warn("No se pudo enviar notificación de reasignación:", notifError.message);
    }
  }

  return await obtenerTareaPorId(id);
}

export async function eliminarTareaPorId(id, userId) {
  const [result] = await pool.query(`DELETE FROM tarea WHERE id_tarea = ?`, [
    Number(id),
  ]);

  if (result.affectedRows === 0) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
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

  return await obtenerTareaPorId(id);
}

export async function asignarUsuarioTarea(id, userId, actorId) {
  const tarea = await obtenerFilaTarea(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const [result] = await pool.query(
    `INSERT IGNORE INTO tarea_usuario (id_tarea, id_usuario, es_responsable)
     VALUES (?, ?, 0)`,
    [Number(id), Number(userId)],
  );

  if (result.affectedRows === 0) {
    throw crearError("El usuario ya está asignado a esta tarea", 400, "VALIDATION_ERROR");
  }

  await registrarAuditoriaHistorial(
    id,
    Number(actorId) || 1,
    `Usuario ${Number(userId)} asignado`,
  );

  // Enviar notificación al usuario asignado
  try {
    console.log(`[DEBUG] Intentando enviar notificación de asignación: tareaId=${id}, userId=${userId}, tareaIdHistoria=${tarea.id_historia}`);
    
    const [usuarioRows] = await pool.query(
      `SELECT nombre FROM usuario WHERE id_usuario = ?`,
      [Number(userId)]
    );
    const usuarioNombre = usuarioRows[0]?.nombre || `Usuario #${userId}`;
    console.log(`[DEBUG] Usuario encontrado: ${usuarioNombre}`);

    // Obtener información del proyecto
    const [proyectoRows] = await pool.query(
      `SELECT p.id_proyecto, p.nombre 
       FROM proyecto p
       JOIN historia_usuario h ON h.id_proyecto = p.id_proyecto
       WHERE h.id_historia = ?`,
      [tarea.id_historia]
    );
    const proyecto = proyectoRows[0];
    console.log(`[DEBUG] Proyecto encontrado:`, proyecto);

    const notificacionId = await notificacionesService.crearNotificacion({
      id_usuario: Number(userId),
      tipo: 'tarea_asignada',
      titulo: 'Tarea asignada',
      mensaje: `Has sido asignado a la tarea "${tarea.nombre}"${proyecto ? ` en el proyecto "${proyecto.nombre}"` : ''}`,
      id_proyecto: proyecto?.id_proyecto || null,
    });
    console.log(`[DEBUG] Notificación creada con ID: ${notificacionId}`);
  } catch (notifError) {
    console.error("No se pudo enviar notificación de asignación:", notifError);
    console.error("Stack trace:", notifError.stack);
  }

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
