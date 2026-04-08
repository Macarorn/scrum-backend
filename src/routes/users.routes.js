import express from "express";
import {
  asignarRol,
  getPerfil,
  getPermisos,
  getRoles,
  getUsuarioById,
  getUsuarios,
  putUsuario,
  removeUsuario,
  updatePerfil,
} from "../controllers/users.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  canAccessUserResource,
  requirePermission,
  requireRole,
} from "../middleware/authorization.middleware.js";

const router = express.Router();

router.get("/usuarios", authMiddleware, requireRole(["admin"]), getUsuarios);
router.get(
  "/usuarios/:id",
  authMiddleware,
  canAccessUserResource(["admin"]),
  getUsuarioById,
);
router.put(
  "/usuarios/:id",
  authMiddleware,
  canAccessUserResource(["admin"]),
  putUsuario,
);
router.delete(
  "/usuarios/:id",
  authMiddleware,
  requirePermission("usuarios:delete"),
  removeUsuario,
);
router.post(
  "/usuarios/:id/asignar-rol",
  authMiddleware,
  requirePermission("roles:assign"),
  asignarRol,
);
router.get("/roles", authMiddleware, requireRole(["admin"]), getRoles);
router.get("/permisos", authMiddleware, requireRole(["admin"]), getPermisos);
router.get("/perfil", authMiddleware, getPerfil);
router.put("/perfil", authMiddleware, updatePerfil);

export default router;
