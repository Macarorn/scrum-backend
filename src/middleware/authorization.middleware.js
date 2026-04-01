export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.rol || req.user?.rol_principal;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "No tienes permisos para realizar esta acción",
        details: {
          requiredRoles: allowedRoles,
          userRole,
        },
      });
    }

    next();
  };
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    const isAdmin =
      req.user?.rol === "admin" || req.user?.rol_principal === "admin";
    const userPermissions = req.user?.permisos || [];

    if (!isAdmin && !userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "No tienes permisos para este recurso",
        details: {
          requiredPermission: permission,
        },
      });
    }

    next();
  };
};

export const canAccessUserResource = (allowedRoles = ["admin"]) => {
  return (req, res, next) => {
    const requestedId = Number(req.params.id);
    const userId = Number(req.user?.id_usuario);
    const userRole = req.user?.rol || req.user?.rol_principal;

    if (allowedRoles.includes(userRole) || requestedId === userId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: "RESOURCE_FORBIDDEN",
      message: "No puedes acceder a este recurso",
      details: {
        requestedId,
        userId,
      },
    });
  };
};
