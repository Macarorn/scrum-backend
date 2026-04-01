export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const error = err.error || "INTERNAL_ERROR";
  const message = err.message || "Error interno del servidor";

  res.status(statusCode).json({
    success: false,
    error: error,
    message: message,
    details:
      err.details ||
      (process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "NOT_FOUND",
    message: "Ruta no encontrada",
    details: {
      path: req.originalUrl,
    },
  });
};
