import express from "express";
import * as epicasController from "../controllers/epicas.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizationMiddleware } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, epicasController.listarEpicas);
router.post("/", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), epicasController.crearEpica);
router.get("/:id", authMiddleware, epicasController.obtenerEpica);
router.put("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), epicasController.actualizarEpica);
router.delete("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), epicasController.eliminarEpica);

export default router;
