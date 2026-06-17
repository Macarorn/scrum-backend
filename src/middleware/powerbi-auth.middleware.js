import config from "../config/config.js";

/**
 * Middleware para proteger las rutas de Power BI usando una API KEY.
 */
export const powerbiAuthMiddleware = (req, res, next) => {
  // Buscar API Key en headers (x-api-key) o en query parameters (?apiKey=)
  const apiKey = req.header("x-api-key") || req.query.apiKey;
  const envApiKey = process.env.POWERBI_API_KEY;

  if (!envApiKey) {
    console.error("Falta configurar POWERBI_API_KEY en el archivo .env");
    return res.status(500).json({
      success: false,
      message: "Error de configuración del servidor. Falta API KEY.",
    });
  }

  if (!apiKey || apiKey !== envApiKey) {
    return res.status(401).json({
      success: false,
      message: "Acceso no autorizado. Se requiere una API Key válida.",
    });
  }

  next();
};
