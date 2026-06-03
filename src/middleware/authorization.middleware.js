import pool from "../utils/database.js";

// Valida que el rol del usuario esté permitido para la acción.
export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    const userId = req.user?.id_usuario;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Usuario no autenticado",
      });
    }

    // Obtener el ID del proyecto de la solicitud
    let projectId = req.params.id_proyecto || req.body.id_proyecto || req.body.proyectoId || req.query.id_proyecto || req.query.proyectoId;

    console.log("=== requireRole DEBUG ===");
    console.log("userId:", userId);
    console.log("Initial projectId:", projectId);
    console.log("req.baseUrl:", req.baseUrl);
    console.log("req.params:", req.params);
    console.log("req.body:", req.body);

    // Si la ruta pertenece a proyectos, usar directamente el parámetro :id como id de proyecto
    if (!projectId && req.params.id && req.baseUrl?.includes("/proyectos")) {
      projectId = req.params.id;
      console.log("ProjectId from project route param id:", projectId);
    }

    // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID del criterio de aceptación
    if (!projectId && req.params.id) {
      try {
        const [criterio] = await pool.query(
          `SELECT id_historia FROM criterio_aceptacion WHERE id_criterio = ?`,
          [req.params.id]
        );
        console.log("Criterio query result:", criterio);
        if (criterio.length > 0) {
          const [historia] = await pool.query(
            `SELECT id_epica FROM historia_usuario WHERE id_historia = ?`,
            [criterio[0].id_historia]
          );
          console.log("Historia query result:", historia);
          if (historia.length > 0) {
            const [epica] = await pool.query(
              `SELECT id_proyecto FROM epica WHERE id_epica = ?`,
              [historia[0].id_epica]
            );
            console.log("Epica query result:", epica);
            if (epica.length > 0) {
              projectId = epica[0].id_proyecto;
              console.log("ProjectId from criterio:", projectId);
            }
          }
        }
      } catch (error) {
        console.error("Error al obtener proyecto desde criterio:", error);
      }
    }

    console.log("Final projectId:", projectId);

    if (projectId) {
      // Verificar el rol del usuario en el proyecto específico
      const [projectRoles] = await pool.query(
        `SELECT r.nombre_rol FROM usuario_equipo_proyecto uep
         JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
         JOIN rol r ON uep.id_rol = r.id_rol
         WHERE ep.id_proyecto = ? AND uep.id_usuario = ? AND uep.activo = 1`,
        [projectId, userId]
      );

      console.log("Project roles query result:", projectRoles);

      if (projectRoles.length === 0) {
        console.log("BLOCKING: User has no roles in project");
        return res.status(403).json({
          success: false,
          error: "FORBIDDEN",
          message: "No tienes permisos para realizar esta acción",
        });
      }

      const projectRoleNames = projectRoles.map(r => r.nombre_rol);
      console.log("Project role names:", projectRoleNames);

      if (!projectRoleNames.some(role => allowedRoles.includes(role))) {
        console.log("BLOCKING: User role not in allowed roles");
        return res.status(403).json({
          success: false,
          error: "FORBIDDEN",
          message: "No tienes permisos para realizar esta acción",
          details: {
            requiredRoles: allowedRoles,
            userRole: projectRoleNames[0],
          },
        });
      }

      console.log("ALLOWING: User has required role");
      return next();
    }

    // Si no hay ID de proyecto, verificar rol global
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

// Alias para mantener compatibilidad con rutas existentes.
export const authorizationMiddleware = requireRole;

// Punto de extensión para permisos finos por recurso/acción.
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

// Verifica si el usuario tiene un permiso específico consultando la base de datos
// Ahora verifica el rol del usuario en el contexto del proyecto específico
export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id_usuario;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "UNAUTHORIZED",
          message: "Usuario no autenticado",
        });
      }

      // Obtener el ID del proyecto de la solicitud
      let projectId = req.params.id_proyecto || req.body.id_proyecto || req.body.proyectoId || req.query.id_proyecto || req.query.proyectoId;

      console.log("=== checkPermission DEBUG ===");
      console.log("userId:", userId);
      console.log("Initial projectId:", projectId);
      console.log("req.params:", req.params);
      console.log("req.body:", req.body);

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID del sprint (desde params)
      if (!projectId && req.params.id) {
        try {
          const [sprint] = await pool.query(
            `SELECT id_sprint, id_proyecto, nombre FROM sprint WHERE id_sprint = ?`,
            [req.params.id]
          );
          console.log("Sprint query result (from params.id):", sprint);
          if (sprint.length > 0) {
            projectId = sprint[0].id_proyecto;
            console.log("ProjectId from sprint (params.id):", projectId, "sprint name:", sprint[0].nombre);
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde sprint (params.id):", error);
        }
      }

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID de la historia (desde params)
      if (!projectId && req.params.id) {
        try {
          const [historia] = await pool.query(
            `SELECT id_historia, id_epica FROM historia_usuario WHERE id_historia = ?`,
            [req.params.id]
          );
          console.log("Historia query result (from params.id):", historia);
          if (historia.length > 0) {
            const [epica] = await pool.query(
              `SELECT id_epica, id_proyecto, nombre FROM epica WHERE id_epica = ?`,
              [historia[0].id_epica]
            );
            console.log("Epica query result (from historia):", epica);
            if (epica.length > 0) {
              projectId = epica[0].id_proyecto;
              console.log("ProjectId from historia (params.id):", projectId, "epica name:", epica[0].nombre);
            }
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde historia (params.id):", error);
        }
      }

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID de la historia (desde body)
      if (!projectId && req.body.id_historia) {
        try {
          const [historia] = await pool.query(
            `SELECT id_historia, id_epica FROM historia_usuario WHERE id_historia = ?`,
            [req.body.id_historia]
          );
          console.log("Historia query result (from body.id_historia):", historia);
          if (historia.length > 0) {
            const [epica] = await pool.query(
              `SELECT id_epica, id_proyecto, nombre FROM epica WHERE id_epica = ?`,
              [historia[0].id_epica]
            );
            console.log("Epica query result (from historia):", epica);
            if (epica.length > 0) {
              projectId = epica[0].id_proyecto;
              console.log("ProjectId from historia (body.id_historia):", projectId, "epica name:", epica[0].nombre);
            }
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde historia (body.id_historia):", error);
        }
      }

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID de la tarea (desde params)
      if (!projectId && req.params.id) {
        try {
          const [tarea] = await pool.query(
            `SELECT id_tarea, id_historia FROM tarea WHERE id_tarea = ?`,
            [req.params.id]
          );
          console.log("Tarea query result (from params.id):", tarea);
          if (tarea.length > 0) {
            const [historia] = await pool.query(
              `SELECT id_historia, id_epica FROM historia_usuario WHERE id_historia = ?`,
              [tarea[0].id_historia]
            );
            console.log("Historia query result (from tarea):", historia);
            if (historia.length > 0) {
              const [epica] = await pool.query(
                `SELECT id_epica, id_proyecto, nombre FROM epica WHERE id_epica = ?`,
                [historia[0].id_epica]
              );
              console.log("Epica query result (from historia):", epica);
              if (epica.length > 0) {
                projectId = epica[0].id_proyecto;
                console.log("ProjectId from tarea (params.id):", projectId, "epica name:", epica[0].nombre);
              }
            }
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde tarea (params.id):", error);
        }
      }

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID de la épica (desde params)
      if (!projectId && req.params.id) {
        try {
          const [epica] = await pool.query(
            `SELECT id_epica, id_proyecto, nombre FROM epica WHERE id_epica = ?`,
            [req.params.id]
          );
          console.log("Epica query result (from params.id):", epica);
          if (epica.length > 0) {
            projectId = epica[0].id_proyecto;
            console.log("ProjectId from epica (params.id):", projectId, "epica name:", epica[0].nombre);
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde épica (params.id):", error);
        }
      }

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID de la épica (desde body)
      if (!projectId && req.body.epicaId) {
        try {
          const [epica] = await pool.query(
            `SELECT id_epica, id_proyecto, nombre FROM epica WHERE id_epica = ?`,
            [req.body.epicaId]
          );
          console.log("Epica query result (from body.epicaId):", epica);
          if (epica.length > 0) {
            projectId = epica[0].id_proyecto;
            console.log("ProjectId from epica (body.epicaId):", projectId, "epica name:", epica[0].nombre);
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde épica (body.epicaId):", error);
        }
      }

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID de la historia
      if (!projectId && req.params.id) {
        try {
          const [historia] = await pool.query(
            `SELECT id_epica FROM historia_usuario WHERE id_historia = ?`,
            [req.params.id]
          );
          console.log("Historia query result:", historia);
          if (historia.length > 0) {
            const [epica] = await pool.query(
              `SELECT id_proyecto FROM epica WHERE id_epica = ?`,
              [historia[0].id_epica]
            );
            if (epica.length > 0) {
              projectId = epica[0].id_proyecto;
              console.log("ProjectId from historia:", projectId);
            }
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde historia:", error);
        }
      }

      // Si no hay ID de proyecto, intentar obtenerlo desde la base de datos usando el ID del sprint
      if (!projectId && req.params.id) {
        try {
          const [sprint] = await pool.query(
            `SELECT id_proyecto FROM sprint WHERE id_sprint = ?`,
            [req.params.id]
          );
          console.log("Sprint query result:", sprint);
          if (sprint.length > 0) {
            projectId = sprint[0].id_proyecto;
            console.log("ProjectId from sprint:", projectId);
          }
        } catch (error) {
          console.error("Error al obtener proyecto desde sprint:", error);
        }
      }

      console.log("Final projectId:", projectId);

      if (!projectId) {
        console.log("BLOCKING: No projectId found");
        return res.status(403).json({
          success: false,
          error: "FORBIDDEN",
          message: "No se pudo identificar el proyecto. Se requiere un ID de proyecto para verificar permisos.",
        });
      }

      // Obtener el rol del usuario en el proyecto específico
      const query = `SELECT r.nombre_rol FROM usuario_equipo_proyecto uep
         JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
         JOIN rol r ON uep.id_rol = r.id_rol
         WHERE ep.id_proyecto = ? AND uep.id_usuario = ? AND uep.activo = 1`;
      console.log("Project roles query:", query, "params:", [projectId, userId]);

      const [projectRoles] = await pool.query(query, [projectId, userId]);

      console.log("Project roles query result:", projectRoles);

      // Debug: Get all roles for this user across all projects
      const [allRoles] = await pool.query(
        `SELECT ep.id_proyecto, r.nombre_rol FROM usuario_equipo_proyecto uep
         JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
         JOIN rol r ON uep.id_rol = r.id_rol
         WHERE uep.id_usuario = ? AND uep.activo = 1`,
        [userId]
      );
      console.log("All roles for user across all projects:", allRoles);

      if (projectRoles.length === 0) {
        console.log("BLOCKING: User has no roles in project");
        return res.status(403).json({
          success: false,
          error: "FORBIDDEN",
          message: "No tienes permisos para realizar esta acción",
        });
      }

      const projectRoleNames = projectRoles.map(r => r.nombre_rol);
      console.log("Project role names:", projectRoleNames);

      // Product Owner y Scrum Master tienen todos los permisos en el proyecto (case-insensitive)
      const hasAdminRole = projectRoleNames.some(role =>
        role.toLowerCase() === 'product owner' || role.toLowerCase() === 'scrum master'
      );

      console.log("Has admin role:", hasAdminRole);

      if (hasAdminRole) {
        console.log("ALLOWING: User has admin role");
        return next();
      }

      // Verificar si el usuario tiene el permiso específico en el proyecto
      const [permissions] = await pool.query(
        `SELECT p.nombre FROM rol_permiso rp 
         JOIN permiso p ON rp.id_permiso = p.id_permiso 
         WHERE rp.id_rol IN (
           SELECT uep.id_rol FROM usuario_equipo_proyecto uep
           JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
           WHERE ep.id_proyecto = ? AND uep.id_usuario = ? AND uep.activo = 1
         ) AND p.nombre = ?`,
        [projectId, userId, permission]
      );

      if (permissions.length === 0) {
        return res.status(403).json({
          success: false,
          error: "FORBIDDEN",
          message: "No tienes permisos para realizar esta acción. Solo Product Owner y Scrum Master pueden editar o eliminar elementos del backlog y sprints.",
        });
      }

      next();
    } catch (error) {
      console.error("Error checking permission:", error);
      return res.status(500).json({
        success: false,
        error: "INTERNAL_ERROR",
        message: "Error al verificar permisos",
      });
    }
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
