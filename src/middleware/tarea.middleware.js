import { obtenerTareaPorId } from "../services/tarea.service.js";
import {
  ESTADOS,
  esTransicionValida,
} from "../utils/estado-transicion.utils.js";

// Normaliza el id del usuario autenticado.
function userIdFromReq(req) {
  return Number(req.user?.id || req.user?.id_usuario);
}

function tareaTieneUsuarioAsignado(tarea, userId) {
  return tarea.asignados.some((usuario) => {
    if (typeof usuario === "number") {
      return usuario === userId;
    }

    return Number(usuario.id_usuario) === userId;
  });
}

// Regla: solo usuarios asignados pueden mover el estado de la tarea.
export async function soloAsignadosPuedenCambiarEstado(req, res, next) {
  try {
    const tarea = await obtenerTareaPorId(req.params.id);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Tarea no encontrada",
        details: {},
      });
    }

    const userId = userIdFromReq(req);
    if (!tareaTieneUsuarioAsignado(tarea, userId)) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Solo usuarios asignados pueden cambiar el estado",
        details: { id_tarea: tarea.id_tarea, userId },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Regla: solo el responsable de la tarea puede registrar tiempo real.
export async function soloResponsablePuedeActualizarTiempo(req, res, next) {
  try {
    const tarea = await obtenerTareaPorId(req.params.id);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Tarea no encontrada",
        details: {},
      });
    }

    const userId = userIdFromReq(req);
    const responsable = tarea.asignados.find((usuario) => {
      if (typeof usuario === "number") {
        return usuario === userId;
      }

      return Number(usuario.id_usuario) === userId && usuario.es_responsable;
    });

    if (!responsable) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Solo el responsable puede actualizar el tiempo real",
        details: { id_tarea: tarea.id_tarea, userId },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Valida estados permitidos y transiciones validas del flujo kanban.
export async function validarTransicionEstado(req, res, next) {
  try {
    const { estado } = req.body;
    const tarea = await obtenerTareaPorId(req.params.id);

    if (!tarea) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Tarea no encontrada",
        details: {},
      });
    }

    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_STATE",
        message: "Estado invalido",
        details: { permitidos: ESTADOS },
      });
    }

    if (!esTransicionValida(tarea.estado, estado)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_TRANSITION",
        message: "Transicion de estado no permitida",
        details: { estadoActual: tarea.estado, nuevoEstado: estado },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
