import express from "express";
import * as criteriosController from "../controllers/criterios.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizationMiddleware } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.put("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), criteriosController.actualizarCriterio);
router.delete("/:id", authMiddleware, authorizationMiddleware(["Product Owner", "Scrum Master"]), criteriosController.eliminarCriterio);

export default router;
