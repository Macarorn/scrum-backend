import express from "express";
import * as etiquetasController from "../controllers/etiquetas.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizationMiddleware } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, etiquetasController.listarEtiquetas);
router.post("/", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), etiquetasController.crearEtiqueta);
router.put("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), etiquetasController.actualizarEtiqueta);
router.delete("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), etiquetasController.eliminarEtiqueta);

export default router;
