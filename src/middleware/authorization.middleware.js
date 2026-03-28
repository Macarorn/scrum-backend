export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.rol;

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

export const requirePermission = (permission) => {
  return (req, res, next) => {
    next();
  };
};
