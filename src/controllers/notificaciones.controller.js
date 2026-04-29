import notificacionesService, { sendNotificationToTeam } from '../services/notificaciones.service.js';
import { sendSuccess } from '../utils/response.utils.js';

export const listarNotificaciones = async (req, res, next) => {
  try {
    const id_usuario = req.user?.id || req.user?.id_usuario;
    const result = await notificacionesService.listarNotificaciones({ id_usuario });
    return sendSuccess(res, result.data, result.message, result.status);
  } catch (error) {
    next(error);
  }
};

export const marcarComoLeida = async (req, res, next) => {
  try {
    const id_usuario = req.user?.id || req.user?.id_usuario;
    const { id_notificacion } = req.params;
    const result = await notificacionesService.marcarComoLeida({ id_usuario, id_notificacion });
    return sendSuccess(res, result.data, result.message, result.status);
  } catch (error) {
    next(error);
  }
};

//  Sprint iniciado
export const sprintStart = async (req, res) => {
  try {
    const { sprintName, durationDays, teamId } = req.body;

    if (!sprintName || !durationDays || !teamId) {
      return res.status(400).json({
        success: false,
        error: "Datos requeridos faltantes"
      });
    }

    const message = `El ${sprintName} ha comenzado. Tienes ${durationDays} días para completarlo`;

    const result = await sendNotificationToTeam({
      teamId,
      message,
      type: "informativa"
    });

    return sendSuccess(res, result, "Sprint iniciado correctamente");
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

//  Recordatorio
export const sprintReminder = async (req, res) => {
  try {
    const { sprintName, teamId } = req.body;

    if (!sprintName || !teamId) {
      return res.status(400).json({
        success: false,
        error: "Datos requeridos faltantes"
      });
    }

    const message = `El ${sprintName} finaliza mañana. Revisa tus tareas pendientes`;

    const result = await sendNotificationToTeam({
      teamId,
      message,
      type: "recordatorio"
    });

    return sendSuccess(res, result, "Recordatorio enviado");
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

//  Sprint completado
export const sprintCompleted = async (req, res) => {
  try {
    const { sprintName, velocity, teamId } = req.body;

    if (!sprintName || velocity == null || !teamId) {
      return res.status(400).json({
        success: false,
        error: "Datos requeridos faltantes"
      });
    }

    const message = `El ${sprintName} ha sido completado. Velocidad: ${velocity} puntos`;

    const result = await sendNotificationToTeam({
      teamId,
      message,
      type: "informativa"
    });

    return sendSuccess(res, result, "Sprint completado notificado");
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Notificación general
export const notifyTeam = async (req, res) => {
  try {
    const { teamId, message, type } = req.body;

    if (!teamId || !message || !type) {
      return res.status(400).json({
        success: false,
        error: "Datos requeridos faltantes"
      });
    }

    const result = await sendNotificationToTeam({
      teamId,
      message,
      type
    });

    return sendSuccess(res, result, "Notificación enviada correctamente");
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};