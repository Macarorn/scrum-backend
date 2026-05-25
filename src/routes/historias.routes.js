import express from "express";
import * as historiasController from "../controllers/historias.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { checkPermission } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, historiasController.listarHistorias);
router.post("/", authMiddleware, checkPermission("editar_backlog"), historiasController.crearHistoria);
router.get("/:id", authMiddleware, historiasController.obtenerHistoria);
router.put("/:id", authMiddleware, checkPermission("editar_backlog"), historiasController.actualizarHistoria);
router.delete("/:id", authMiddleware, checkPermission("editar_backlog"), historiasController.eliminarHistoria);

// Criterios de aceptación
router.get("/:id/criterios", authMiddleware, historiasController.listarCriterios);
router.post("/:id/criterios", authMiddleware, checkPermission("editar_backlog"), historiasController.crearCriterio);

export default router;
