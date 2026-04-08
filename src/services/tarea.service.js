// Almacen temporal en memoria para pruebas del modulo.
const tareas = [];
let nextTareaId = 1;
let nextComentarioId = 1;

function crearError(message, statusCode, error, details = undefined) {
  return { message, statusCode, error, details };
}

function obtenerIndiceTarea(id) {
  return tareas.findIndex((tarea) => tarea.id === Number(id));
}

// Devuelve tareas activas y permite filtrar por sprint y estado.
export function listarTareasPorSprint(sprintId, estado) {
  return tareas.filter((tarea) => {
    if (!tarea.activo) {
      return false;
    }

    if (sprintId !== undefined && tarea.sprintId !== Number(sprintId)) {
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
  const nuevaTarea = {
    id: nextTareaId++,
    titulo: data.titulo,
    descripcion: data.descripcion || "",
    sprintId: Number(data.sprintId),
    prioridad: Number(data.prioridad),
    tipo: data.tipo,
    storyPoints: data.storyPoints,
    estado: "por_hacer",
    orden: Number(data.orden) || 0,
    responsableId: Number(data.responsableId),
    tiempoReal: Number(data.tiempoReal) || 0,
    asignados: Array.from(new Set([Number(data.responsableId)])),
    etiquetas: [],
    comentarios: [],
    historial: [],
    activo: true,
    createdBy: Number(userId) || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tareas.push(nuevaTarea);
  registrarAuditoriaHistorial(nuevaTarea.id, userId, "Tarea creada");
  return nuevaTarea;
}

export function obtenerTareaPorId(id) {
  return tareas.find((tarea) => tarea.id === Number(id) && tarea.activo) || null;
}

export function actualizarTareaPorId(id, data, userId) {
  const indice = obtenerIndiceTarea(id);
  if (indice < 0 || !tareas[indice].activo) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tareas[indice] = {
    ...tareas[indice],
    ...data,
    sprintId:
      data.sprintId !== undefined ? Number(data.sprintId) : tareas[indice].sprintId,
    prioridad:
      data.prioridad !== undefined ? Number(data.prioridad) : tareas[indice].prioridad,
    responsableId:
      data.responsableId !== undefined
        ? Number(data.responsableId)
        : tareas[indice].responsableId,
    updatedAt: new Date().toISOString(),
  };

  registrarAuditoriaHistorial(id, userId, "Tarea actualizada");
  return tareas[indice];
}

export function eliminarTareaPorId(id, userId) {
  const indice = obtenerIndiceTarea(id);
  if (indice < 0 || !tareas[indice].activo) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  // Soft delete: se marca inactiva en vez de borrar fisicamente.
  tareas[indice].activo = false;
  tareas[indice].updatedAt = new Date().toISOString();
  registrarAuditoriaHistorial(id, userId, "Tarea eliminada (soft delete)");
  return { id: Number(id), eliminado: true, softDelete: true };
}

export function cambiarEstadoTarea(id, nuevoEstado, userId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const estadoAnterior = tarea.estado;
  tarea.estado = nuevoEstado;
  tarea.updatedAt = new Date().toISOString();
  registrarAuditoriaHistorial(
    id,
    userId,
    `Estado actualizado: ${estadoAnterior} -> ${nuevoEstado}`,
  );

  return tarea;
}

export function actualizarOrdenTarea(id, nuevoOrden, userId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.orden = Number(nuevoOrden);
  tarea.updatedAt = new Date().toISOString();
  registrarAuditoriaHistorial(id, userId, `Orden actualizado a ${tarea.orden}`);
  return tarea;
}

export function registrarTiempoReal(id, tiempo, userId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.tiempoReal = Number(tiempo);
  tarea.updatedAt = new Date().toISOString();
  registrarAuditoriaHistorial(id, userId, `Tiempo real actualizado a ${tarea.tiempoReal}`);
  return tarea;
}

export function asignarUsuarioTarea(id, userId, actorId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const usuario = Number(userId);
  if (!tarea.asignados.includes(usuario)) {
    tarea.asignados.push(usuario);
    registrarAuditoriaHistorial(id, actorId, `Usuario ${usuario} asignado`);
  }

  return tarea;
}

export function desasignarUsuarioTarea(id, userId, actorId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.asignados = tarea.asignados.filter((usuario) => usuario !== Number(userId));
  registrarAuditoriaHistorial(id, actorId, `Usuario ${Number(userId)} desasignado`);
  return tarea;
}

export function listarUsuariosAsignados(id) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return tarea.asignados;
}

export function obtenerHistorialTarea(id) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return tarea.historial;
}

export function listarComentariosTarea(id) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  return tarea.comentarios;
}

export function agregarComentarioTarea(id, comentario, userId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const nuevoComentario = {
    id: nextComentarioId++,
    contenido: comentario,
    userId: Number(userId),
    createdAt: new Date().toISOString(),
  };

  tarea.comentarios.push(nuevoComentario);
  registrarAuditoriaHistorial(id, userId, `Comentario ${nuevoComentario.id} agregado`);
  return nuevoComentario;
}

export function eliminarComentario(idComentario, actorId) {
  const comentarioId = Number(idComentario);
  for (const tarea of tareas) {
    const cantidadAntes = tarea.comentarios.length;
    tarea.comentarios = tarea.comentarios.filter(
      (comentario) => comentario.id !== comentarioId,
    );

    if (tarea.comentarios.length !== cantidadAntes) {
      registrarAuditoriaHistorial(tarea.id, actorId, `Comentario ${comentarioId} eliminado`);
      return { id: comentarioId, eliminado: true };
    }
  }

  throw crearError("Comentario no encontrado", 404, "NOT_FOUND");
}

export function asignarEtiquetaTarea(id, etiquetaId, actorId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  const etiqueta = Number(etiquetaId);
  if (!tarea.etiquetas.includes(etiqueta)) {
    tarea.etiquetas.push(etiqueta);
    registrarAuditoriaHistorial(id, actorId, `Etiqueta ${etiqueta} asignada`);
  }

  return tarea;
}

export function removerEtiquetaTarea(id, etiquetaId, actorId) {
  const tarea = obtenerTareaPorId(id);
  if (!tarea) {
    throw crearError("Tarea no encontrada", 404, "NOT_FOUND");
  }

  tarea.etiquetas = tarea.etiquetas.filter(
    (etiqueta) => etiqueta !== Number(etiquetaId),
  );
  registrarAuditoriaHistorial(id, actorId, `Etiqueta ${Number(etiquetaId)} removida`);
  return tarea;
}

export function registrarAuditoriaHistorial(tareaId, userId, cambio) {
  const tarea = obtenerTareaPorId(tareaId);
  if (!tarea) {
    return;
  }

  tarea.historial.push({
    fecha: new Date().toISOString(),
    userId: Number(userId) || null,
    cambio,
  });
}