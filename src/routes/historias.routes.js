import express from "express";
import * as historiasController from "../controllers/historias.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizationMiddleware } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, historiasController.listarHistorias);
router.post("/", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), historiasController.crearHistoria);
router.get("/:id", authMiddleware, historiasController.obtenerHistoria);
router.put("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), historiasController.actualizarHistoria);
router.delete("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), historiasController.eliminarHistoria);

// Criterios de aceptación
router.get("/:id/criterios", authMiddleware, historiasController.listarCriterios);
router.post("/:id/criterios", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), historiasController.crearCriterio);

export default router;
