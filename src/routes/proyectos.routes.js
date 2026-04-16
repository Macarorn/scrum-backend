import express from "express";
import * as proyectosController from "../controllers/proyectos.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizationMiddleware } from "../middleware/authorization.middleware.js";

const router = express.Router();

// GET /api/proyectos - Listar proyectos del usuario
router.get("/", authMiddleware, proyectosController.listarProyectos);

// GET /api/proyectos/todos - Listar todos los proyectos
router.get("/todos", authMiddleware, proyectosController.listarTodosProyectos);

// POST /api/proyectos - Crear proyecto
router.post(
  "/",
  authMiddleware,
  authorizationMiddleware(["Product Owner", "Scrum Master", "usuario"]),
  proyectosController.crearProyecto,
);

// GET /api/proyectos/codigo/:codigo - Buscar proyecto por código (DEBE ir antes de /:id)
router.get("/codigo/:codigo", authMiddleware, proyectosController.buscarProyectoPorCodigo);

// POST /api/proyectos/:id/unirse - Unirse a un proyecto
router.post("/:id/unirse", authMiddleware, proyectosController.unirseAProyecto);

// GET /api/proyectos/:id - Obtener proyecto
router.get("/:id", authMiddleware, proyectosController.obtenerProyecto);

// PUT /api/proyectos/:id - Actualizar proyecto
router.put(
  "/:id",
  authMiddleware,
  authorizationMiddleware(["Product Owner", "Scrum Master", "usuario"]),
  proyectosController.actualizarProyecto,
);

// DELETE /api/proyectos/:id - Eliminar proyecto
router.delete(
  "/:id",
  authMiddleware,
  authorizationMiddleware(["Product Owner", "Scrum Master", "usuario"]),
  proyectosController.eliminarProyecto,
);

export default router;
