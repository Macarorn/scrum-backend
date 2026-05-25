import express from "express";
import * as epicasController from "../controllers/epicas.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { checkPermission } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, epicasController.listarEpicas);
router.post("/", authMiddleware, checkPermission("editar_backlog"), epicasController.crearEpica);
router.get("/:id", authMiddleware, epicasController.obtenerEpica);
router.put("/:id", authMiddleware, checkPermission("editar_backlog"), epicasController.actualizarEpica);
router.delete("/:id", authMiddleware, checkPermission("editar_backlog"), epicasController.eliminarEpica);

export default router;
