import express from "express";
import * as documentosController from "../controllers/documentos.controller.js";
import { uploadDocumento, handleUploadError } from "../middleware/upload.middleware.js";
import {
  requireProjectMember,
  requireRole,
} from "../middleware/authorization.middleware.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

// Importante: mergeParams: true permite acceder a req.params.id_proyecto desde la ruta padre
const router = express.Router({ mergeParams: true });

// Todos los endpoints de documentos requieren autenticación y ser miembro del proyecto
router.use(authMiddleware);
router.use(requireProjectMember());

// Listar todos los documentos activos
router.get("/", documentosController.listarDocumentos);

// Subir un nuevo documento (Solo PO y SM)
router.post(
  "/",
  requireRole(["Product Owner", "Scrum Master"]),
  uploadDocumento.single("file"),
  handleUploadError,
  documentosController.crearDocumento
);

// Subir nueva versión de un documento (Solo PO y SM)
router.put(
  "/:id_documento",
  requireRole(["Product Owner", "Scrum Master"]),
  uploadDocumento.single("file"),
  handleUploadError,
  documentosController.actualizarDocumento
);

// Desactivar un documento (Solo PO y SM)
router.patch(
  "/:id_documento/desactivar",
  requireRole(["Product Owner", "Scrum Master"]),
  documentosController.desactivarDocumento
);

// Obtener historial de versiones (Cualquier miembro)
router.get("/:id_documento/historial", documentosController.obtenerHistorial);

// Obtener URL de descarga (Cualquier miembro)
router.get("/:id_documento/descargar", documentosController.descargarDocumento);

export default router;
