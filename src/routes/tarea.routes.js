import express from "express";
import * as tareaController from "../controllers/tarea.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  soloAsignadosPuedenCambiarEstado,
  soloResponsablePuedeActualizarTiempo,
  validarTransicionEstado,
} from "../middleware/tarea.middleware.js";

const router = express.Router();

// CRUD básico
router.get("/", authMiddleware, tareaController.listarTareas);
router.post("/", authMiddleware, tareaController.crearTarea);
router.get("/:id", authMiddleware, tareaController.obtenerTarea);
router.put("/:id", authMiddleware, tareaController.actualizarTarea);
router.delete("/:id", authMiddleware, tareaController.eliminarTarea);

// Cambiar estado de tarea (Kanban)
router.patch(
  "/:id/estado",
  authMiddleware,
  soloAsignadosPuedenCambiarEstado,
  validarTransicionEstado,
  tareaController.cambiarEstadoTarea,
);

// Actualizar orden de tarea (drag and drop)
router.put(
  "/:id/orden",
  authMiddleware,
  tareaController.actualizarOrdenTarea,
);

// Registrar tiempo real invertido
router.patch(
  "/:id/tiempo-real",
  authMiddleware,
  soloResponsablePuedeActualizarTiempo,
  tareaController.registrarTiempoReal,
);

// Asignar usuario a tarea
router.post("/:id/asignar", authMiddleware, tareaController.asignarUsuarioTarea);

// Desasignar usuario de tarea
router.delete(
  "/:id/asignar/:userId",
  authMiddleware,
  tareaController.desasignarUsuarioTarea,
);

// Listar usuarios asignados
router.get("/:id/usuarios", authMiddleware, tareaController.listarUsuariosAsignados);

// Obtener historial de cambios
router.get("/:id/historial", authMiddleware, tareaController.obtenerHistorialTarea);

// Listar comentarios de tarea
router.get(
  "/:id/comentarios",
  authMiddleware,
  tareaController.listarComentariosTarea,
);

// Agregar comentario a tarea
router.post(
  "/:id/comentarios",
  authMiddleware,
  tareaController.agregarComentarioTarea,
);

// Eliminar comentario en el contexto de tarea
router.delete("/comentarios/:id", authMiddleware, tareaController.eliminarComentario);

// Asignar etiqueta a tarea
router.post("/:id/etiquetas", authMiddleware, tareaController.asignarEtiquetaTarea);

// Remover etiqueta de tarea
router.delete(
  "/:id/etiquetas/:idEtiqueta",
  authMiddleware,
  tareaController.removerEtiquetaTarea,
);

export default router;
