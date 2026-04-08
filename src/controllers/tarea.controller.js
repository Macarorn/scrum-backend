import {
  actualizarOrdenTarea as actualizarOrdenTareaService,
  actualizarTareaPorId,
  agregarComentarioTarea as agregarComentarioTareaService,
  asignarEtiquetaTarea as asignarEtiquetaTareaService,
  asignarUsuarioTarea as asignarUsuarioTareaService,
  cambiarEstadoTarea as cambiarEstadoTareaService,
  crearTarea as crearTareaService,
  desasignarUsuarioTarea as desasignarUsuarioTareaService,
  eliminarComentario as eliminarComentarioService,
  eliminarTareaPorId,
  listarComentariosTarea as listarComentariosTareaService,
  listarTareasPorHistoria,
  listarUsuariosAsignados as listarUsuariosAsignadosService,
  obtenerHistorialTarea as obtenerHistorialTareaService,
  obtenerTareaPorId,
  registrarTiempoReal as registrarTiempoRealService,
  removerEtiquetaTarea as removerEtiquetaTareaService,
} from "../services/tarea.service.js";
import {
  validarActualizarTarea,
  validarCrearTarea,
} from "../validations/tarea.validations.js";

// Normaliza el id del usuario para usarlo en servicios y auditoria.
function userIdFromReq(req) {
  return req.user?.id || req.user?.id_usuario;
}

// Lista tareas filtrando por historia o estado si vienen en query params.
export const listarTareas = async (req, res, next) => {
  try {
    const idHistoria =
      req.query.id_historia ?? req.query.historiaId ?? req.query.sprintId;
    const { estado } = req.query;
    const data = listarTareasPorHistoria(idHistoria, estado);

    res.status(200).json({
      success: true,
      data,
      message: "Operacion exitosa",
    });
  } catch (error) {
    next(error);
  }
};

// Crea una tarea validando primero los campos requeridos.
export const crearTarea = async (req, res, next) => {
  try {
    const validation = validarCrearTarea(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Datos invalidos",
        details: validation.errors,
      });
    }

    const data = crearTareaService(req.body, userIdFromReq(req));
    res.status(201).json({
      success: true,
      data,
      message: "Tarea creada exitosamente",
    });
  } catch (error) {
    next(error);
  }
};

// Obtiene una tarea por id y responde 404 si no existe.
export const obtenerTarea = async (req, res, next) => {
  try {
    const data = obtenerTareaPorId(req.params.id);
    if (!data) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Tarea no encontrada",
        details: {},
      });
    }

    res.status(200).json({
      success: true,
      data,
      message: "Operacion exitosa",
    });
  } catch (error) {
    next(error);
  }
};

// Actualiza campos permitidos de una tarea existente.
export const actualizarTarea = async (req, res, next) => {
  try {
    const validation = validarActualizarTarea(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Datos invalidos",
        details: validation.errors,
      });
    }

    const data = actualizarTareaPorId(
      req.params.id,
      req.body,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Tarea actualizada exitosamente",
    });
  } catch (error) {
    next(error);
  }
};

// Elimina por soft delete para mantener historial.
export const eliminarTarea = async (req, res, next) => {
  try {
    const data = eliminarTareaPorId(req.params.id, userIdFromReq(req));
    res.status(200).json({
      success: true,
      data,
      message: "Tarea eliminada exitosamente",
    });
  } catch (error) {
    next(error);
  }
};

// Cambia el estado de la tarea (flujo kanban).
export const cambiarEstadoTarea = async (req, res, next) => {
  try {
    const data = cambiarEstadoTareaService(
      req.params.id,
      req.body.estado,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Estado de tarea actualizado",
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarOrdenTarea = async (req, res, next) => {
  try {
    const data = actualizarOrdenTareaService(
      req.params.id,
      req.body.orden_columna ?? req.body.orden,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Orden de tarea actualizado",
    });
  } catch (error) {
    next(error);
  }
};

export const registrarTiempoReal = async (req, res, next) => {
  try {
    const data = registrarTiempoRealService(
      req.params.id,
      req.body.tiempo_real ?? req.body.tiempoReal,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Tiempo real registrado",
    });
  } catch (error) {
    next(error);
  }
};

export const asignarUsuarioTarea = async (req, res, next) => {
  try {
    const data = asignarUsuarioTareaService(
      req.params.id,
      req.body.id_usuario ?? req.body.userId,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Usuario asignado a tarea",
    });
  } catch (error) {
    next(error);
  }
};

export const desasignarUsuarioTarea = async (req, res, next) => {
  try {
    const data = desasignarUsuarioTareaService(
      req.params.id,
      req.params.userId,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Usuario desasignado de tarea",
    });
  } catch (error) {
    next(error);
  }
};

export const listarUsuariosAsignados = async (req, res, next) => {
  try {
    const data = listarUsuariosAsignadosService(req.params.id);
    res.status(200).json({
      success: true,
      data,
      message: "Usuarios asignados listados",
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerHistorialTarea = async (req, res, next) => {
  try {
    const data = obtenerHistorialTareaService(req.params.id);
    res.status(200).json({
      success: true,
      data,
      message: "Historial de tarea obtenido",
    });
  } catch (error) {
    next(error);
  }
};

export const listarComentariosTarea = async (req, res, next) => {
  try {
    const data = listarComentariosTareaService(req.params.id);
    res.status(200).json({
      success: true,
      data,
      message: "Comentarios listados",
    });
  } catch (error) {
    next(error);
  }
};

export const agregarComentarioTarea = async (req, res, next) => {
  try {
    const data = agregarComentarioTareaService(
      req.params.id,
      req.body.comentario,
      userIdFromReq(req),
    );
    res.status(201).json({
      success: true,
      data,
      message: "Comentario agregado",
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarComentario = async (req, res, next) => {
  try {
    const data = eliminarComentarioService(req.params.id, userIdFromReq(req));
    res.status(200).json({
      success: true,
      data,
      message: "Comentario eliminado",
    });
  } catch (error) {
    next(error);
  }
};

export const asignarEtiquetaTarea = async (req, res, next) => {
  try {
    const data = asignarEtiquetaTareaService(
      req.params.id,
      req.body.id_etiqueta ?? req.body.idEtiqueta,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Etiqueta asignada a tarea",
    });
  } catch (error) {
    next(error);
  }
};

export const removerEtiquetaTarea = async (req, res, next) => {
  try {
    const data = removerEtiquetaTareaService(
      req.params.id,
      req.params.idEtiqueta,
      userIdFromReq(req),
    );
    res.status(200).json({
      success: true,
      data,
      message: "Etiqueta removida de tarea",
    });
  } catch (error) {
    next(error);
  }
};
