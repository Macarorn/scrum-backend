import crypto from "crypto";
import {
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
} from "../utils/jwt.utils.js";
import { comparePassword, hashPassword } from "../utils/password.utils.js";
import { buildError, sendSuccess } from "../utils/response.utils.js";
import {
  createUser,
  findUserWithSecretByEmail,
  findUserWithSecretById,
  hasRefreshToken,
  revokeRefreshToken,
  storeRefreshToken,
} from "../utils/user.store.js";
import pool from "../utils/database.js";
import {
  findLegalVersion,
  insertUserConsent,
} from "../utils/legal.store.js";
import {
  validateLogin,
  validateRegister,
} from "../validations/auth.validations.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service.js";

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

    const token = crypto.randomUUID();
    const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await pool.query(
      "INSERT INTO email_verification_token (id_usuario, token, expira_en) VALUES (?, ?, ?)",
      [user.id_usuario, token, expiraEn],
    );

    // Intentar enviar el correo, pero no fallar el registro si falla el SMTP
    try {
      await sendVerificationEmail(email, nombre, token);
    } catch (emailError) {
      console.error("Error al enviar el correo de verificación:", emailError);
    }

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

    if (!user.is_verified) {
      return next(
        buildError("Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.", {
          statusCode: 403,
          error: "EMAIL_NOT_VERIFIED",
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

// Endpoint para solicitar recuperación de contraseña
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return next(
        buildError("El correo electrónico es obligatorio", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: { email: "Campo requerido" },
        }),
      );
    }

    const user = await findUserWithSecretByEmail(email.trim());

    if (!user) {
      return next(
        buildError("El correo electrónico no está registrado en el sistema.", {
          statusCode: 404,
          error: "USER_NOT_FOUND",
        }),
      );
    }

    // Invalidate any existing tokens for this user
    await pool.query(
      "UPDATE password_reset_token SET usado = 1 WHERE id_usuario = ? AND usado = 0",
      [user.id_usuario],
    );

    // Generate a secure random token
    const token = crypto.randomUUID();
    const expiraEn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      "INSERT INTO password_reset_token (id_usuario, token, expira_en) VALUES (?, ?, ?)",
      [user.id_usuario, token, expiraEn],
    );

    try {
      await sendPasswordResetEmail(email.trim(), token);
    } catch (emailError) {
      console.error("Error al enviar correo de recuperación:", emailError);
    }

    return sendSuccess(res, {
      message: "Hemos enviado las instrucciones de recuperación a tu correo electrónico.",
    }, "Solicitud procesada");
  } catch (error) {
    next(error);
  }
};

// Endpoint para restablecer la contraseña con token
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return next(
        buildError("Token de recuperación requerido", {
          statusCode: 400,
          error: "TOKEN_MISSING",
        }),
      );
    }

    if (!password || !confirmPassword) {
      return next(
        buildError("La contraseña y su confirmación son obligatorias", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: { password: "Campo requerido" },
        }),
      );
    }

    if (password !== confirmPassword) {
      return next(
        buildError("Las contraseñas no coinciden", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: { confirmPassword: "No coincide con la contraseña" },
        }),
      );
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return next(
        buildError("La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número", {
          statusCode: 400,
          error: "VALIDATION_ERROR",
          details: { password: "Formato inválido" },
        }),
      );
    }

    // Find the token in the database
    const [tokenRows] = await pool.query(
      "SELECT * FROM password_reset_token WHERE token = ? AND usado = 0",
      [token],
    );

    if (tokenRows.length === 0) {
      return next(
        buildError("El enlace de recuperación es inválido o ya fue utilizado", {
          statusCode: 400,
          error: "INVALID_TOKEN",
        }),
      );
    }

    const resetToken = tokenRows[0];

    // Check if expired
    if (new Date(resetToken.expira_en) < new Date()) {
      // Mark as used
      await pool.query("UPDATE password_reset_token SET usado = 1 WHERE id = ?", [resetToken.id]);
      return next(
        buildError("El enlace de recuperación ha expirado. Solicita uno nuevo.", {
          statusCode: 400,
          error: "TOKEN_EXPIRED",
        }),
      );
    }

    // Hash new password and update user (also mark email as verified since they proved ownership)
    const newPasswordHash = await hashPassword(password);
    await pool.query(
      "UPDATE usuario SET password = ?, is_verified = 1, fecha_actualizacion = NOW() WHERE id_usuario = ?",
      [newPasswordHash, resetToken.id_usuario],
    );

    // Mark token as used
    await pool.query("UPDATE password_reset_token SET usado = 1 WHERE id = ?", [resetToken.id]);

    return sendSuccess(res, null, "Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return next(buildError("Token requerido", { statusCode: 400, error: "TOKEN_MISSING" }));
    }

    const [rows] = await pool.query("SELECT * FROM email_verification_token WHERE token = ? AND usado = 0", [token]);
    if (rows.length === 0) {
      return next(buildError("Enlace inválido o ya utilizado", { statusCode: 400, error: "INVALID_TOKEN" }));
    }

    const verificationToken = rows[0];
    if (new Date(verificationToken.expira_en) < new Date()) {
      return next(buildError("El enlace ha expirado", { statusCode: 400, error: "TOKEN_EXPIRED" }));
    }

    await pool.query("UPDATE usuario SET is_verified = 1 WHERE id_usuario = ?", [verificationToken.id_usuario]);
    await pool.query("UPDATE email_verification_token SET usado = 1 WHERE id = ?", [verificationToken.id]);

    return sendSuccess(res, null, "Correo verificado exitosamente. Ya puedes iniciar sesión.");
  } catch (error) {
    next(error);
  }
};
