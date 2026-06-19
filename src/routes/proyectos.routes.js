import express from "express";
import * as proyectosController from "../controllers/proyectos.controller.js";
import * as ganttController from "../controllers/gantt.controller.js";
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
  proyectosController.crearProyecto,
);

// GET /api/proyectos/codigo/:codigo - Buscar proyecto por código (DEBE ir antes de /:id)
router.get("/codigo/:codigo", authMiddleware, proyectosController.buscarProyectoPorCodigo);

// POST /api/proyectos/:id/unirse - Unirse a un proyecto
router.post("/:id/unirse", authMiddleware, proyectosController.unirseAProyecto);

// GET /api/proyectos/:id/miembros - Listar miembros de un proyecto
router.get("/:id/miembros", authMiddleware, proyectosController.listarMiembrosProyecto);

// GET /api/proyectos/:id/mi-rol - Obtener el rol del usuario autenticado en un proyecto
router.get("/:id/mi-rol", authMiddleware, proyectosController.obtenerMiRolEnProyecto);

// GET /api/proyectos/:id/roles - Listar roles disponibles para el proyecto
router.get("/:id/roles", authMiddleware, proyectosController.listarRolesProyecto);

// POST /api/proyectos/:id/roles - Crear un rol nuevo en el proyecto (PO/SM)
router.post(
  "/:id/roles",
  authMiddleware,
  authorizationMiddleware(["Product Owner", "Scrum Master"]),
  proyectosController.crearRolProyecto,
);

// DELETE /api/proyectos/:id/miembros/:id_usuario - Eliminar miembro de un proyecto
router.delete("/:id/miembros/:id_usuario", authMiddleware, proyectosController.eliminarMiembroProyecto);

// PUT /api/proyectos/:id/miembros/:id_usuario/rol - Actualizar rol de un miembro de proyecto
router.put(
  "/:id/miembros/:id_usuario/rol",
  authMiddleware,
  authorizationMiddleware(["admin", "Product Owner", "Scrum Master"]),
  proyectosController.actualizarRolMiembroProyecto,
);

router.patch(
  "/:id/miembros/:id_usuario/estado",
  authMiddleware,
  authorizationMiddleware(["admin", "Product Owner", "Scrum Master"]),
  proyectosController.actualizarEstadoMiembroProyecto,
);

// POST /api/proyectos/:id/transferir-product-owner - Transferir Product Owner a otro miembro
router.post(
  "/:id/transferir-product-owner",
  authMiddleware,
  authorizationMiddleware(["admin", "Product Owner", "Scrum Master"]),
  proyectosController.transferirProductOwner,
);

// GET /api/proyectos/:id/gantt - Obtener datos para diagrama de Gantt
router.get("/:id/gantt", authMiddleware, ganttController.getGanttData);

// GET /api/proyectos/:id - Obtener proyecto
router.get("/:id", authMiddleware, proyectosController.obtenerProyecto);

// PUT /api/proyectos/:id - Actualizar proyecto
router.put(
  "/:id",
  authMiddleware,
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
