import { hashPassword } from "../utils/password.utils.js";
import { buildError, sendSuccess } from "../utils/response.utils.js";
import {
  deleteUser,
  findUserById,
  listPermissions,
  listRoles,
  listUsers,
  setUserRole,
  updateUser,
} from "../utils/user.store.js";
import { validateProfileUpdate } from "../validations/auth.validations.js";

export const getUsuarios = async (req, res, next) => {
  try {
    const search = req.query.search || req.query.q || "";
    const users = await listUsers(search);
    return sendSuccess(res, users, "Usuarios listados correctamente");
  } catch (error) {
    next(error);
  }
};

export const getUsuarioById = async (req, res, next) => {
  try {
    const user = await findUserById(req.params.id);

    if (!user) {
      return next(
        buildError("Usuario no encontrado", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
          details: { id_usuario: req.params.id },
        }),
      );
    }

    return sendSuccess(res, user, "Usuario obtenido correctamente");
  } catch (error) {
    next(error);
  }
};

export const putUsuario = async (req, res, next) => {
  try {
    const validation = validateProfileUpdate(req.body);
    if (!validation.isValid) {
      return next(
        buildError("Datos inválidos", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: validation.errors,
        }),
      );
    }

    const payload = {
      nombre: req.body.nombre,
      email: req.body.email,
      telefono: req.body.telefono,
      ciudad: req.body.ciudad,
    };

    if (req.body.password) {
      payload.passwordHash = await hashPassword(req.body.password);
    }

    const user = await updateUser(req.params.id, payload);
    if (!user) {
      return next(
        buildError("Usuario no encontrado", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
          details: { id_usuario: req.params.id },
        }),
      );
    }

    return sendSuccess(res, user, "Usuario actualizado correctamente");
  } catch (error) {
    next(error);
  }
};

export const removeUsuario = async (req, res, next) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) {
      return next(
        buildError("Usuario no encontrado", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
          details: { id_usuario: req.params.id },
        }),
      );
    }

    return sendSuccess(res, null, "Usuario eliminado correctamente");
  } catch (error) {
    next(error);
  }
};

export const getRoles = async (req, res, next) => {
  try {
    const roles = await listRoles();
    return sendSuccess(res, roles, "Roles listados correctamente");
  } catch (error) {
    next(error);
  }
};

export const getPermisos = async (req, res, next) => {
  try {
    const permisos = await listPermissions();
    return sendSuccess(res, permisos, "Permisos listados correctamente");
  } catch (error) {
    next(error);
  }
};

export const asignarRol = async (req, res, next) => {
  try {
    const { id_rol } = req.body;

    if (!id_rol) {
      return next(
        buildError("Rol requerido", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: { id_rol: "id_rol es requerido" },
        }),
      );
    }

    const user = await setUserRole(req.params.id, id_rol);
    if (!user) {
      return next(
        buildError("Usuario no encontrado", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
          details: { id_usuario: req.params.id },
        }),
      );
    }

    return sendSuccess(res, user, "Rol asignado correctamente");
  } catch (error) {
    next(error);
  }
};

export const getPerfil = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id_usuario);

    if (!user) {
      return next(
        buildError("Usuario no encontrado", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
          details: { id_usuario: req.user.id_usuario },
        }),
      );
    }

    return sendSuccess(res, user, "Perfil obtenido correctamente");
  } catch (error) {
    next(error);
  }
};

export const updatePerfil = async (req, res, next) => {
  try {
    const validation = validateProfileUpdate(req.body);
    if (!validation.isValid) {
      return next(
        buildError("Datos inválidos", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: validation.errors,
        }),
      );
    }

    const payload = {
      nombre: req.body.nombre,
      email: req.body.email,
      telefono: req.body.telefono,
      ciudad: req.body.ciudad,
    };

    if (req.body.password) {
      payload.passwordHash = await hashPassword(req.body.password);
    }

    const updated = await updateUser(req.user.id_usuario, payload);

    return sendSuccess(res, updated, "Perfil actualizado correctamente");
  } catch (error) {
    next(error);
  }
};
