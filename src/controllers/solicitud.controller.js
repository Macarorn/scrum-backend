import solicitudService from '../services/solicitud.service.js';
import { sendSuccess } from '../utils/response.utils.js';

function userIdFromReq(req) {
  return req.user?.id || req.user?.id_usuario;
}

const controller = {

  async crearSolicitud(req, res, next) {
    try {
      const id_usuario = userIdFromReq(req);
      const { id_proyecto, mensaje_opcional } = req.body;

      const result = await solicitudService.crearSolicitud({
        id_usuario,
        id_proyecto,
        mensaje_opcional
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },
  
  async listarTodas(req, res, next) {
    try {
      const id_usuario = userIdFromReq(req);

      const result = await solicitudService.listarTodas({
        id_usuario
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },

  async obtenerPorId(req, res, next) {
    try {
      const id_usuario = userIdFromReq(req);
      const { id_solicitud } = req.params;

      const result = await solicitudService.obtenerPorId({
        id_usuario,
        id_solicitud
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },

  async listarPendientes(req, res, next) {
    try {
      const id_usuario = userIdFromReq(req);
      const { proyecto } = req.query;

      const result = await solicitudService.listarPendientes({
        id_usuario,
        proyecto
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },

  async listarMisProyectosPendientes(req, res, next) {
    try {
      const id_usuario = userIdFromReq(req);

      const result = await solicitudService.listarMisProyectosPendientes({
        id_usuario
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },

  async aprobarSolicitud(req, res, next) {
    try {
      const id_usuario_aprobador = userIdFromReq(req);
      const { id_solicitud } = req.params;
      const { id_rol } = req.body;

      const result = await solicitudService.aprobarSolicitud({
        id_usuario_aprobador,
        id_solicitud,
        id_rol
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },

  async rechazarSolicitud(req, res, next) {
    try {
      const id_usuario_aprobador = userIdFromReq(req);
      const { id_solicitud } = req.params;
      const { motivo } = req.body;

      const result = await solicitudService.rechazarSolicitud({
        id_usuario_aprobador,
        id_solicitud,
        motivo
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },

  async cancelarSolicitud(req, res, next) {
    try {
      const id_usuario = userIdFromReq(req);
      const { id_solicitud } = req.params;

      const result = await solicitudService.cancelarSolicitud({
        id_usuario,
        id_solicitud
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  },

  async invitarUsuario(req, res, next) {
    try {
      const id_usuario_aprobador = userIdFromReq(req);
      const { id_usuario, id_proyecto, id_rol } = req.body;

      const result = await solicitudService.invitarUsuario({
        id_usuario_aprobador,
        id_usuario,
        id_proyecto,
        id_rol
      });

      return sendSuccess(res, result.data, result.message, result.status);
    } catch (error) {
      next(error);
    }
  }

};

export default controller;