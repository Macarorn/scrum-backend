import express from "express";
import * as powerbiController from "../controllers/powerbi.controller.js";
import { powerbiAuthMiddleware } from "../middleware/powerbi-auth.middleware.js";

const router = express.Router();

// Todas las rutas de Power BI están protegidas por el middleware de API_KEY
router.use(powerbiAuthMiddleware);

router.get("/proyectos", powerbiController.obtenerProyectos);
router.get("/sprints", powerbiController.obtenerSprints);
router.get("/epicas", powerbiController.obtenerEpicas);
router.get("/historias", powerbiController.obtenerHistorias);
router.get("/tareas", powerbiController.obtenerTareas);
router.get("/usuarios", powerbiController.obtenerUsuarios);

export default router;
