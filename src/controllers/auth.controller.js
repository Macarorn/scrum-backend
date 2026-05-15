import {
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
} from "../utils/jwt.utils.js";
import { comparePassword } from "../utils/password.utils.js";
import { buildError, sendSuccess } from "../utils/response.utils.js";
import {
  createUser,
  findUserWithSecretByEmail,
  findUserWithSecretById,
  hasRefreshToken,
  revokeRefreshToken,
  storeRefreshToken,
} from "../utils/user.store.js";
import {
  validateLogin,
  validateRegister,
} from "../validations/auth.validations.js";

export const register = async (req, res, next) => {
  try {
    const { email, nombre, password, confirmPassword, telefono, ciudad } = req.body;
    const validation = validateRegister(
      email,
      nombre,
      password,
      confirmPassword,
    );

    if (!validation.isValid) {
      return next(
        buildError("Datos de registro inválidos", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: validation.errors,
        }),
      );
    }

    const user = await createUser({ email, nombre, password, telefono, ciudad });

    return sendSuccess(res, user, "Usuario registrado correctamente", 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const validation = validateLogin(email, password);

    if (!validation.isValid) {
      return next(
        buildError("Datos de acceso inválidos", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: validation.errors,
        }),
      );
    }

    const user = await findUserWithSecretByEmail(email);
    if (!user) {
      return next(
        buildError("Credenciales inválidas", {
          statusCode: 401,
          error: "INVALID_CREDENTIALS",
        }),
      );
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return next(
        buildError("Credenciales inválidas", {
          statusCode: 401,
          error: "INVALID_CREDENTIALS",
        }),
      );
    }

    const permisos = user.permisos?.map((permiso) => permiso.nombre) || [];
    const accessToken = generateToken(
      user.id_usuario,
      user.email,
      user.nombre,
      user.rol_principal,
      permisos,
    );
    const refreshToken = generateRefreshToken(user.id_usuario);
    await storeRefreshToken(refreshToken);

    return sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          email: user.email,
          rol_principal: user.rol_principal,
          roles: user.roles,
          permisos: user.permisos,
        },
      },
      "Inicio de sesión exitoso",
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    return sendSuccess(res, null, "Logout exitoso");
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return next(
        buildError("Refresh token requerido", {
          statusCode: 400,
          error: "TOKEN_MISSING",
        }),
      );
    }

    const exists = await hasRefreshToken(token);
    if (!exists) {
      return next(
        buildError("Refresh token inválido", {
          statusCode: 401,
          error: "INVALID_REFRESH_TOKEN",
        }),
      );
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      return next(
        buildError("Refresh token expirado o inválido", {
          statusCode: 401,
          error: "INVALID_REFRESH_TOKEN",
        }),
      );
    }

    const user = await findUserWithSecretById(payload.id_usuario);
    if (!user) {
      return next(
        buildError("Usuario no encontrado", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
        }),
      );
    }

    const role = user.rol_principal;
    const email = user.email;

    const accessToken = generateToken(
      payload.id_usuario,
      email,
      user.nombre,
      role,
      user.permisos?.map((permiso) => permiso.nombre) || [],
    );

    return sendSuccess(res, { accessToken }, "Token refrescado correctamente");
  } catch (error) {
    next(error);
  }
};
