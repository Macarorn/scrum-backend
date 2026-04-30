import express from 'express';
import * as notificacionesController from '../controllers/notificaciones.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Obtener notificaciones del usuario autenticado
router.get('/', authMiddleware, notificacionesController.listarNotificaciones);

// Marcar notificación como leída
router.post('/:id_notificacion/leida', authMiddleware, notificacionesController.marcarComoLeida);

export default router;
