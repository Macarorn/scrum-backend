import { verifyToken } from "../utils/jwt.utils.js";

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "TOKEN_MISSING",
        message: "Token no proporcionado",
        details: {},
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Token inválido o expirado",
        details: {},
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "AUTH_ERROR",
      message: "Error en autenticación",
      details: { reason: error.message },
    });
  }
};
