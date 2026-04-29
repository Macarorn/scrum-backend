import notificacionesService from '../services/notificaciones.service.js';
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
