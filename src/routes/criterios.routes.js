import express from "express";
import * as criteriosController from "../controllers/criterios.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { checkPermission } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.put("/:id", authMiddleware, checkPermission("editar_backlog"), criteriosController.actualizarCriterio);
router.delete("/:id", authMiddleware, checkPermission("editar_backlog"), criteriosController.eliminarCriterio);

export default router;
