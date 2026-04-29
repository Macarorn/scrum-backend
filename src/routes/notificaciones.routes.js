import express from 'express';
import * as notificacionesController from '../controllers/notificaciones.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Endpoints de notificaciones (los nuevos que hiciste)
router.post('/sprint-start', notificacionesController.sprintStart);
router.post('/sprint-reminder', notificacionesController.sprintReminder);
router.post('/sprint-completed', notificacionesController.sprintCompleted);
router.post('/team', notificacionesController.notifyTeam);

// Obtener notificaciones del usuario autenticado
router.get('/', authMiddleware, notificacionesController.listarNotificaciones);

// Marcar notificación como leída
router.post('/:id_notificacion/leida', authMiddleware, notificacionesController.marcarComoLeida);

export default router;