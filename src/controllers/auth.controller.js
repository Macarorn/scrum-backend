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
  findLegalVersion,
  insertUserConsent,
} from "../utils/legal.store.js";
import {
  validateLogin,
  validateRegister,
} from "../validations/auth.validations.js";

export const register = async (req, res, next) => {
  try {
    const { email, nombre, password, confirmPassword, telefono, ciudad, consent_granted, consent_version } = req.body;
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

    // Validar consentimiento obligatoriamente
    if (consent_granted !== true) {
      return next(
        buildError("Debes aceptar los términos y condiciones", {
          statusCode: 400,
          error: "CONSENT_REQUIRED",
          details: { consent_granted: "El consentimiento es obligatorio" },
        }),
      );
    }

    const legalVersion = await findLegalVersion(consent_version || "v1.0");
    if (!legalVersion) {
      return next(
        buildError("Versión de términos inválida", {
          statusCode: 400,
          error: "INVALID_CONSENT_VERSION",
          details: { consent_version },
        }),
      );
    }

    const ipAddress = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
    const userAgent = req.headers["user-agent"] || null;

    const user = await createUser({ 
      email, 
      nombre, 
      password,
      telefono,
      ciudad,
      consent_granted: true,
      consent_version: legalVersion.version,
      rol_plataforma: req.body.rol_plataforma || null,
    });

    await insertUserConsent({
      userId: user.id_usuario,
      consentVersion: legalVersion.version,
      accepted: true,
      ipAddress,
      userAgent,
      consentAt: new Date(),
    });

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
      user.rol_principal,
      permisos,
      user.rol_plataforma,
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
      role,
      user.permisos?.map((permiso) => permiso.nombre) || [],
      user.rol_plataforma,
    );

    return sendSuccess(res, { accessToken }, "Token refrescado correctamente");
  } catch (error) {
    next(error);
  }
};

// Endpoint para obtener versión vigente de términos
export const getTerms = async (req, res, next) => {
  try {
    const termsText = `Términos y Condiciones — v1.0

Responsable del tratamiento:
Scrum App.

Finalidad:
Gestión de usuarios, autenticación y administración de proyectos Scrum.

Datos recolectados:
Nombre, correo electrónico y credenciales de acceso.

Conservación:
Los datos serán almacenados mientras la cuenta permanezca activa.

Derechos:
El usuario podrá solicitar actualización o eliminación de sus datos personales.`;

    return sendSuccess(res, {
      version: "v1.0",
      title: "Términos y Condiciones",
      text: termsText,
    }, "Términos obtenidos correctamente");
  } catch (error) {
    next(error);
  }
};

// Endpoint para obtener consentimiento del usuario
export const getUserConsent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await findUserWithSecretById(id);

    if (!user) {
      return next(
        buildError("Usuario no encontrado", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
        }),
      );
    }

    return sendSuccess(res, {
      consent_granted: user.consent_granted || false,
      consent_at: user.consent_at || null,
      consent_version: user.consent_version || null,
    }, "Consentimiento obtenido correctamente");
  } catch (error) {
    next(error);
  }
};
