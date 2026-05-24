import express from 'express';
import solicitudController from '../controllers/solicitud.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post('/', solicitudController.crearSolicitud);
router.get('/', solicitudController.listarTodas);
router.get('/pendientes', solicitudController.listarPendientes);
router.get('/mis-proyectos/pendientes', solicitudController.listarMisProyectosPendientes);
router.post('/invitar', solicitudController.invitarUsuario);
router.post('/enviar-invitacion', solicitudController.enviarInvitacionProyecto);
router.post('/:id_solicitud/aprobar', solicitudController.aprobarSolicitud);
router.post('/:id_solicitud/rechazar', solicitudController.rechazarSolicitud);
router.post('/:id_solicitud/cancelar', solicitudController.cancelarSolicitud);
router.get('/:id_solicitud', solicitudController.obtenerPorId);

export default router;