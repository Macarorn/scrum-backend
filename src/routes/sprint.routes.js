import express from 'express';
const router = express.Router();

import * as controller from '../controllers/sprint.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';


const useAuth = process.env.USE_AUTH === "true";

// Si USE_AUTH = false → deja pasar todo
// Si USE_AUTH = true → activa JWT
const protect = useAuth ? authMiddleware : (req, res, next) => next();

router.get('/', protect, controller.getSprints);
router.post('/', protect, controller.createSprint);
router.get('/:id', protect, controller.getSprintById);
router.put('/:id', protect, controller.updateSprint);
router.delete('/:id', protect, controller.deleteSprint);
router.patch('/:id/estado', protect, controller.updateEstado);

export default router;