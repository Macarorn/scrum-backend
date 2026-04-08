// Almacen temporal en memoria para pruebas del modulo.
const tareas = [];
let nextTareaId = 1;
let nextComentarioId = 1;

function crearError(message, statusCode, error, details = undefined) {
  return { message, statusCode, error, details };
}

function obtenerIndiceTarea(id) {
  return tareas.findIndex((tarea) => tarea.id_tarea === Number(id));
}

function normalizarIdHistoria(data) {
  return Number(data.id_historia ?? data.historiaId ?? data.sprintId);
}

function normalizarIdResponsable(data) {
  return Number(
    data.id_usuario_responsable ??
      data.responsableId ??
      data.id_usuario ??
      null,
  );
}

function normalizarAsignados(data, responsableId) {
  const asignados = [];
  if (Number.isInteger(responsableId) && responsableId > 0) {
    asignados.push({ id_usuario: responsableId, es_responsable: true });
  }

  const extras = Array.isArray(data.usuarios_asignados)
    ? data.usuarios_asignados
    : Array.isArray(data.asignados)
      ? data.asignados
      : [];

  for (const usuario of extras) {
    const id_usuario = Number(usuario.id_usuario ?? usuario);
    if (!Number.isInteger(id_usuario) || id_usuario <= 0) {
      continue;
    }

    if (!asignados.some((item) => item.id_usuario === id_usuario)) {
      asignados.push({
        id_usuario,
        es_responsable: Boolean(
          usuario.es_responsable && id_usuario === responsableId,
        ),
      });
    }
  }

  return asignados;
}

function encontrarTareaActiva(id) {
  return tareas.find((tarea) => tarea.id_tarea === Number(id)) || null;
}

function limpiarTarea(tarea) {
  return {
    ...tarea,
    asignados: tarea.asignados.map((usuario) => ({ ...usuario })),
    etiquetas: [...tarea.etiquetas],
    comentarios: tarea.comentarios.map((comentario) => ({ ...comentario })),
    historial: tarea.historial.map((item) => ({ ...item })),
  };
}

// Devuelve tareas activas y permite filtrar por historia y estado.
export function listarTareasPorHistoria(idHistoria, estado) {
  return tareas.filter((tarea) => {
    if (idHistoria !== undefined && tarea.id_historia !== Number(idHistoria)) {
      return false;
    }

    if (estado !== undefined && tarea.estado !== estado) {
      return false;
    }

    return true;
  });
}

// Crea una tarea y registra automaticamente el evento en historial.
export function crearTarea(data, userId) {
  const responsableId = normalizarIdResponsable(data);
  const nuevaTarea = {
    id_tarea: nextTareaId++,
    id_historia: normalizarIdHistoria(data),
    nombre: data.nombre,
    descripcion: data.descripcion || "",
    tipo: data.tipo,
    estado: data.estado || "por_hacer",
    prioridad: data.prioridad || "media",
    story_points: data.story_points ?? data.storyPoints ?? null,
    estimacion_dias: data.estimacion_dias ?? data.estimacionDias ?? null,
    tiempo_real: data.tiempo_real ?? data.tiempoReal ?? 0,
    orden_columna:
      Number(data.orden_columna ?? data.ordenColumna ?? data.orden) || 0,
    fecha_inicio: data.fecha_inicio ?? data.fechaInicio ?? null,
    fecha_fin_est: data.fecha_fin_est ?? data.fechaFinEst ?? null,
    fecha_fin_real: data.fecha_fin_real ?? data.fechaFinReal ?? null,
    asignados: normalizarAsignados(data, responsableId),
    etiquetas: [],
    comentarios: [],
    historial: [],
    creado_por: Number(userId) || null,
    fecha_creacion: new Date().toISOString(),
    fecha_modificacion: new Date().toISOString(),
  };

  tareas.push(nuevaTarea);
  registrarAuditoriaHistorial(nuevaTarea.id_tarea, userId, "Tarea creada");
  return limpiarTarea(nuevaTarea);
}

export function obtenerTareaPorId(id) {
  const tarea = encontrarTareaActiva(id);
  return tarea ? limpiarTarea(tarea) : null;
}

export function actualizarTareaPorId(id, data, userId) {
  const indice = obtenerIndiceTarea(id);
  if (indice < 0) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const tareaAnterior = tareas[indice];
  tareas[indice] = {
    ...tareas[indice],
    nombre: data.nombre !== undefined ? data.nombre : tareas[indice].nombre,
    descripcion:
      data.descripcion !== undefined
        ? data.descripcion
        : tareas[indice].descripcion,
    tipo: data.tipo !== undefined ? data.tipo : tareas[indice].tipo,
    estado: data.estado !== undefined ? data.estado : tareas[indice].estado,
    id_historia:
      data.id_historia !== undefined
        ? Number(data.id_historia)
        : data.historiaId !== undefined
          ? Number(data.historiaId)
          : data.sprintId !== undefined
            ? Number(data.sprintId)
            : tareas[indice].id_historia,
    prioridad:
      data.prioridad !== undefined ? data.prioridad : tareas[indice].prioridad,
    story_points:
      data.story_points !== undefined
        ? data.story_points
        : data.storyPoints !== undefined
          ? data.storyPoints
          : tareas[indice].story_points,
    estimacion_dias:
      data.estimacion_dias !== undefined
        ? data.estimacion_dias
        : data.estimacionDias !== undefined
          ? data.estimacionDias
          : tareas[indice].estimacion_dias,
    tiempo_real:
      data.tiempo_real !== undefined
        ? data.tiempo_real
        : data.tiempoReal !== undefined
          ? data.tiempoReal
          : tareas[indice].tiempo_real,
    orden_columna:
      data.orden_columna !== undefined
        ? Number(data.orden_columna)
        : data.ordenColumna !== undefined
          ? Number(data.ordenColumna)
          : data.orden !== undefined
            ? Number(data.orden)
            : tareas[indice].orden_columna,
    fecha_modificacion: new Date().toISOString(),
  };

  registrarAuditoriaHistorial(
    id,
    userId,
    "Tarea actualizada",
    tareaAnterior.estado,
    tareas[indice].estado,
  );
  return limpiarTarea(tareas[indice]);
}

export function eliminarTareaPorId(id, userId) {
  const indice = obtenerIndiceTarea(id);
  if (indice < 0) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  registrarAuditoriaHistorial(id, userId, "Tarea eliminada");
  tareas.splice(indice, 1);
  return { id_tarea: Number(id), eliminado: true };
}

export function cambiarEstadoTarea(id, nuevoEstado, userId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const estadoAnterior = tarea.estado;
  tarea.estado = nuevoEstado;
  tarea.fecha_modificacion = new Date().toISOString();
  registrarAuditoriaHistorial(
    id,
    userId,
    `Estado actualizado: ${estadoAnterior} -> ${nuevoEstado}`,
    estadoAnterior,
    nuevoEstado,
  );

  return limpiarTarea(tarea);
}

export function actualizarOrdenTarea(id, nuevoOrden, userId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.orden_columna = Number(nuevoOrden);
  tarea.fecha_modificacion = new Date().toISOString();
  registrarAuditoriaHistorial(
    id,
    userId,
    `Orden actualizado a ${tarea.orden_columna}`,
  );
  return limpiarTarea(tarea);
}

export function registrarTiempoReal(id, tiempo, userId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.tiempo_real = Number(tiempo);
  tarea.fecha_modificacion = new Date().toISOString();
  registrarAuditoriaHistorial(
    id,
    userId,
    `Tiempo real actualizado a ${tarea.tiempo_real}`,
  );
  return limpiarTarea(tarea);
}

export function asignarUsuarioTarea(id, userId, actorId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const usuario = Number(userId);
  if (!tarea.asignados.some((item) => item.id_usuario === usuario)) {
    tarea.asignados.push({ id_usuario: usuario, es_responsable: false });
    registrarAuditoriaHistorial(id, actorId, `Usuario ${usuario} asignado`);
  }

  return limpiarTarea(tarea);
}

export function desasignarUsuarioTarea(id, userId, actorId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.asignados = tarea.asignados.filter(
    (usuario) => usuario.id_usuario !== Number(userId),
  );
  registrarAuditoriaHistorial(
    id,
    actorId,
    `Usuario ${Number(userId)} desasignado`,
  );
  return limpiarTarea(tarea);
}

export function listarUsuariosAsignados(id) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return tarea.asignados.map((usuario) => ({ ...usuario }));
}

export function obtenerHistorialTarea(id) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return tarea.historial.map((item) => ({ ...item }));
}

export function listarComentariosTarea(id) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return tarea.comentarios.map((comentario) => ({ ...comentario }));
}

export function agregarComentarioTarea(id, comentario, userId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const nuevoComentario = {
    id_comentario: nextComentarioId++,
    comentario,
    id_usuario: Number(userId),
    fecha: new Date().toISOString(),
  };

  tarea.comentarios.push(nuevoComentario);
  registrarAuditoriaHistorial(
    id,
    userId,
    `Comentario ${nuevoComentario.id_comentario} agregado`,
  );
  return { ...nuevoComentario };
}

export function eliminarComentario(idComentario, actorId) {
  const comentarioId = Number(idComentario);
  for (const tarea of tareas) {
    const cantidadAntes = tarea.comentarios.length;
    tarea.comentarios = tarea.comentarios.filter(
      (comentario) => comentario.id_comentario !== comentarioId,
    );

    if (tarea.comentarios.length !== cantidadAntes) {
      registrarAuditoriaHistorial(
        tarea.id_tarea,
        actorId,
        `Comentario ${comentarioId} eliminado`,
      );
      return { id_comentario: comentarioId, eliminado: true };
    }
  }

  throw crearError("Comentario no encontrado", 404, "NOT_FOUND");
}

export function asignarEtiquetaTarea(id, etiquetaId, actorId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const etiqueta = Number(etiquetaId);
  if (!tarea.etiquetas.includes(etiqueta)) {
    tarea.etiquetas.push(etiqueta);
    registrarAuditoriaHistorial(id, actorId, `Etiqueta ${etiqueta} asignada`);
  }

  return limpiarTarea(tarea);
}

export function removerEtiquetaTarea(id, etiquetaId, actorId) {
  const tarea = encontrarTareaActiva(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.etiquetas = tarea.etiquetas.filter(
    (etiqueta) => etiqueta !== Number(etiquetaId),
  );
  registrarAuditoriaHistorial(
    id,
    actorId,
    `Etiqueta ${Number(etiquetaId)} removida`,
  );
  return limpiarTarea(tarea);
}

export function registrarAuditoriaHistorial(
  tareaId,
  userId,
  observacion,
  estadoAnterior = null,
  estadoNuevo = null,
) {
  const tarea = encontrarTareaActiva(tareaId);
  if (!tarea) {
    return;
  }

  tarea.historial.push({
    id_usuario: Number(userId) || null,
    estado_anterior: estadoAnterior,
    estado_nuevo: estadoNuevo,
    observacion,
    fecha: new Date().toISOString(),
  });
}
