import express from "express";
import { obtenerMetricas } from "../controllers/metricas.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/proyecto/:id", authMiddleware, obtenerMetricas);

export default router;
