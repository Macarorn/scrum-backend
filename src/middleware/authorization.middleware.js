// Valida que el rol del usuario esté permitido para la acción.
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.rol;

    // Si no tiene rol válido, se bloquea con 403.
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "No tienes permisos para realizar esta acción",
        requiredRoles: allowedRoles,
        userRole: userRole,
      });
    }

    next();
  };
};

// Alias para mantener compatibilidad con rutas existentes.
export const authorizationMiddleware = requireRole;

// Punto de extensión para permisos finos por recurso/acción.
export const requirePermission = (permission) => {
  return (req, res, next) => {
    next();
  };
};
