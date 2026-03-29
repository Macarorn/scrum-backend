import express from 'express';
const router = express.Router();

import * as controller from '../controllers/sprint.controller.js';

// Middleware (DESACTIVADO TEMPORALMENTE)
// import { authMiddleware } from '../middleware/auth.middleware.js';

// TODO: activar cuando login esté listo

router.get('/', controller.getSprints);
// router.get('/', authMiddleware, controller.getSprints);

router.post('/', controller.createSprint);
// router.post('/', authMiddleware, controller.createSprint);

router.get('/:id', controller.getSprintById);
// router.get('/:id', authMiddleware, controller.getSprintById);

router.put('/:id', controller.updateSprint);
// router.put('/:id', authMiddleware, controller.updateSprint);

router.delete('/:id', controller.deleteSprint);
// router.delete('/:id', authMiddleware, controller.deleteSprint);

router.patch('/:id/estado', controller.updateEstado);
// router.patch('/:id/estado', authMiddleware, controller.updateEstado);

export default router;