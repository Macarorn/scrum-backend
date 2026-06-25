import express from "express";
import { exportarMetricas, obtenerMetricas } from "../controllers/metricas.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/exportar", authMiddleware, exportarMetricas);
router.get("/proyecto/:id", authMiddleware, obtenerMetricas);
router.get("/proyecto/:id/export", authMiddleware, exportarMetricas);

export default router;
