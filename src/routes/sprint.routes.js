import express from 'express';
const router = express.Router();

import * as controller from '../controllers/sprint.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { checkPermission, requireProjectMember } from '../middleware/authorization.middleware.js';

router.get('/', authMiddleware, controller.getSprints);
router.get('/project/:idProyecto', authMiddleware, requireProjectMember(), (req, res, next) => {
	// pasar idProyecto como query para la función existente
	req.query.id_proyecto = req.params.idProyecto;
	return controller.getSprints(req, res, next);
});
router.post('/', authMiddleware, checkPermission('gestionar_sprints'), controller.createSprint);
router.get('/:id', authMiddleware, controller.getSprintById);
router.put('/:id', authMiddleware, checkPermission('gestionar_sprints'), controller.updateSprint);
router.delete('/:id', authMiddleware, checkPermission('gestionar_sprints'), controller.deleteSprint);
router.patch('/:id/estado', authMiddleware, checkPermission('gestionar_sprints'), controller.updateEstado);

// Rutas para gestión de épicas en sprints
router.post('/:id/epicas', authMiddleware, checkPermission('gestionar_sprints'), controller.asociarEpicas);
router.delete('/:id/epicas/:epicaId', authMiddleware, checkPermission('gestionar_sprints'), controller.desasociarEpica);
router.get('/:id/epicas', authMiddleware, controller.getEpicasSprint);

export default router;