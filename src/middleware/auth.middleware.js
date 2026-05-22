import { verifyToken } from "../utils/jwt.utils.js";

export const authMiddleware = (req, res, next) => {
  try {
    console.log("=== authMiddleware DEBUG ===");
    console.log("Request path:", req.path);
    console.log("Request method:", req.method);
    console.log("Authorization header:", req.headers.authorization);
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token extracted:", token ? "YES" : "NO");

    if (!token) {
      console.log("BLOCKING: Token not provided");
      return res.status(401).json({
        success: false,
        error: "TOKEN_MISSING",
        message: "Token no proporcionado",
        details: {},
      });
    }

    const decoded = verifyToken(token);
    console.log("Token decoded:", decoded ? "YES" : "NO");

    if (!decoded) {
      console.log("BLOCKING: Invalid or expired token");
      return res.status(401).json({
        success: false,
        error: "INVALID_TOKEN",
        message: "Token inválido o expirado",
        details: {},
      });
    }

    req.user = decoded;
    console.log("ALLOWING: User authenticated:", decoded.id_usuario);
    next();
  } catch (error) {
    console.log("BLOCKING: Auth error:", error.message);
    return res.status(401).json({
      success: false,
      error: "AUTH_ERROR",
      message: "Error en autenticación",
      details: { reason: error.message },
    });
  }
};
