import { obtenerTareaPorId } from "../services/tarea.service.js";
import { ESTADOS, esTransicionValida } from "../utils/estado-transicion.utils.js";

// Normaliza el id del usuario autenticado.
function userIdFromReq(req) {
  return Number(req.user?.id || req.user?.id_usuario);
}

// Regla: solo usuarios asignados pueden mover el estado de la tarea.
export async function soloAsignadosPuedenCambiarEstado(req, res, next) {
  const tarea = obtenerTareaPorId(req.params.id);
  if (!tarea) {
    return res.status(404).json({
      success: false,
      error: "NOT_FOUND",
      message: "Tarea no encontrada",
      details: {},
    });
  }

  const userId = userIdFromReq(req);
  if (!tarea.asignados.includes(userId)) {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: "Solo usuarios asignados pueden cambiar el estado",
      details: { tareaId: tarea.id, userId },
    });
  }

  next();
}

// Regla: solo el responsable de la tarea puede registrar tiempo real.
export async function soloResponsablePuedeActualizarTiempo(req, res, next) {
  const tarea = obtenerTareaPorId(req.params.id);
  if (!tarea) {
    return res.status(404).json({
      success: false,
      error: "NOT_FOUND",
      message: "Tarea no encontrada",
      details: {},
    });
  }

  const userId = userIdFromReq(req);
  if (tarea.responsableId !== userId) {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: "Solo el responsable puede actualizar el tiempo real",
      details: { tareaId: tarea.id, userId, responsableId: tarea.responsableId },
    });
  }

  next();
}

// Valida estados permitidos y transiciones validas del flujo kanban.
export async function validarTransicionEstado(req, res, next) {
  const { estado } = req.body;
  const tarea = obtenerTareaPorId(req.params.id);

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
}
