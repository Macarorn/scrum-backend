// Store temporal en memoria para pruebas del módulo proyectos.
import { generarCodigoUnicoProyecto } from "../utils/codigoProyecto.utils.js";
import pool from "../utils/database.js";

function notFoundError(entity = "Proyecto") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrado`,
  };
}

const withCalendarDateAliases = (project) => ({
  ...project,
  startDate: project.fecha_inicio,
  endDate: project.fecha_fin_est,
});

export const listarProyectos = async (userId) => {
  const [rows] = await pool.query(
    `
    SELECT DISTINCT p.*, r.nombre_rol as user_role FROM proyecto p
    LEFT JOIN equipo_proyecto ep ON p.id_proyecto = ep.id_proyecto
    LEFT JOIN usuario_equipo_proyecto uep ON ep.id_equipo_proyecto = uep.id_equipo_proyecto AND uep.id_usuario = ?
    LEFT JOIN rol r ON uep.id_rol = r.id_rol
    WHERE p.creado_por = ?
    OR uep.id_usuario = ?
  `,
    [userId, userId, userId],
  );
  return rows.map(withCalendarDateAliases);
};

export const listarTodosProyectos = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.nombre AS creador_nombre, u.email AS creador_email,
      EXISTS (
        SELECT 1 FROM equipo_proyecto ep
        JOIN usuario_equipo_proyecto uep ON ep.id_equipo_proyecto = uep.id_equipo_proyecto
        WHERE ep.id_proyecto = p.id_proyecto
          AND uep.id_usuario = ?
          AND uep.activo = 1
      ) AS es_miembro
    FROM proyecto p
    JOIN usuario u ON p.creado_por = u.id_usuario`,
    [userId],
  );
  return rows.map(withCalendarDateAliases);
};

export const listarProyectosPorFicha = async (ficha) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.nombre AS creador_nombre, u.email AS creador_email
     FROM proyecto p
     JOIN usuario u ON p.creado_por = u.id_usuario
     WHERE p.numero_ficha = ?`,
    [ficha],
  );
  return rows.map(withCalendarDateAliases);
};

export const unirseAProyecto = async (userId, proyectoId, idRol = 3) => {
  const [proyectoRows] = await pool.query(
    "SELECT * FROM proyecto WHERE id_proyecto = ?",
    [proyectoId],
  );

  if (proyectoRows.length === 0) {
    throw notFoundError();
  }

  const [teamRows] = await pool.query(
    "SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = ? LIMIT 1",
    [proyectoId],
  );

  let idEquipoProyecto;

  if (teamRows.length > 0) {
    idEquipoProyecto = teamRows[0].id_equipo_proyecto;
  } else {
    const [insertResult] = await pool.query(
      "INSERT INTO equipo_proyecto (id_proyecto, nombre, descripcion) VALUES (?, ?, ?)",
      [proyectoId, "Equipo del proyecto", "Equipo principal del proyecto"],
    );
    idEquipoProyecto = insertResult.insertId;
  }

  const [existingRows] = await pool.query(
    "SELECT 1 FROM usuario_equipo_proyecto WHERE id_usuario = ? AND id_equipo_proyecto = ?",
    [userId, idEquipoProyecto],
  );

  if (existingRows.length > 0) {
    const error = new Error("Ya eres miembro de este proyecto");
    error.statusCode = 409;
    throw error;
  }

  await pool.query(
    "INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol) VALUES (?, ?, ?)",
    [userId, idEquipoProyecto, idRol],
  );

  return withCalendarDateAliases(proyectoRows[0]);
};

export const crearProyecto = async (data, usuarioActual = null) => {
  // Si el creador es Instructor Líder, numero_ficha es obligatorio
  const esInstructorLider = usuarioActual?.rol_plataforma === "instructor_lider"
    || data.rol_plataforma_creador === "instructor_lider";

  if (esInstructorLider && !data.numero_ficha) {
    const error = new Error("El número de ficha es obligatorio para proyectos creados por un Instructor Líder");
    error.statusCode = 400;
    error.error = "FICHA_REQUIRED";
    throw error;
  }

  // Generar código único para el proyecto
  const codigoProyecto = await generarCodigoUnicoProyecto(pool);

  const [result] = await pool.query(
    `INSERT INTO proyecto (nombre, descripcion, tipo, estado, fecha_inicio, fecha_fin_est, codigo_proyecto, creado_por, numero_ficha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.descripcion || null,
      data.tipo || null,
      data.estado || "activo",
      data.fecha_inicio || null,
      data.fecha_fin_est || null,
      codigoProyecto,
      data.creado_por || 1,
      data.numero_ficha || null,
    ],
  );
  const proyectoId = result.insertId;

  // Crear equipo del proyecto
  const [equipoResult] = await pool.query(
    "INSERT INTO equipo_proyecto (id_proyecto, nombre, descripcion) VALUES (?, ?, ?)",
    [proyectoId, "Equipo del proyecto", "Equipo principal del proyecto"],
  );
  const idEquipoProyecto = equipoResult.insertId;

  // Obtener el rol de Product Owner
  const [poRoleRows] = await pool.query(
    `SELECT id_rol FROM rol WHERE nombre_rol = ?`,
    ["Product Owner"],
  );

  if (poRoleRows.length === 0) {
    throw new Error("Rol de Product Owner no encontrado en el sistema");
  }

  const poRoleId = poRoleRows[0].id_rol;

  // Asignar al creador como Product Owner del proyecto (solo en el contexto del proyecto)
  await pool.query(
    "INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol, activo, fecha_ingreso) VALUES (?, ?, ?, 1, NOW())",
    [data.creado_por || 1, idEquipoProyecto, poRoleId],
  );

  const [rows] = await pool.query(
    "SELECT * FROM proyecto WHERE id_proyecto = ?",
    [proyectoId],
  );
  return withCalendarDateAliases(rows[0]);
};

const getEquipoProyectoId = async (id_proyecto) => {
  const [rows] = await pool.query(
    "SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = ? LIMIT 1",
    [id_proyecto],
  );
  return rows.length > 0 ? rows[0].id_equipo_proyecto : null;
};

export const obtenerProyecto = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM proyecto WHERE id_proyecto = ?",
    [id],
  );
  if (rows.length === 0) {
    throw notFoundError();
  }
  return withCalendarDateAliases(rows[0]);
};

export const listarMiembrosProyecto = async (proyectoId) => {
  const proyecto = await obtenerProyecto(proyectoId);
  if (!proyecto) {
    throw notFoundError();
  }

  const [rows] = await pool.query(
    `SELECT u.id_usuario,
            u.nombre,
            u.email,
            r.id_rol,
            r.nombre_rol AS rol,
            r.descripcion AS roleDescription,
            r.id_proyecto,
            uep.fecha_ingreso,
            uep.activo
     FROM usuario u
     JOIN usuario_equipo_proyecto uep ON u.id_usuario = uep.id_usuario
     JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
     INNER JOIN rol r ON uep.id_rol = r.id_rol
     WHERE ep.id_proyecto = ?`,
    [proyectoId],
  );
  return rows;
};

export const listarRolesProyecto = async (proyectoId) => {
  await obtenerProyecto(proyectoId);

  const [rows] = await pool.query(
    `SELECT id_rol, nombre_rol, descripcion, id_proyecto
     FROM rol
     WHERE id_proyecto IS NULL OR id_proyecto = ?
     ORDER BY id_proyecto IS NULL DESC, nombre_rol`,
    [proyectoId],
  );

  return rows;
};

export const crearRolProyecto = async (
  proyectoId,
  nombre_rol,
  descripcion,
  usuarioActual,
) => {
  await obtenerProyecto(proyectoId);

  const [requesterRows] = await pool.query(
    `SELECT r.nombre_rol
     FROM usuario_equipo_proyecto uep
     JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
     JOIN rol r ON uep.id_rol = r.id_rol
     WHERE ep.id_proyecto = ?
       AND uep.id_usuario = ?
       AND uep.activo = 1`,
    [proyectoId, usuarioActual.id_usuario],
  );

  const requesterRole = requesterRows.length > 0 ? requesterRows[0].nombre_rol : null;
  const allowedRoles = ["Product Owner", "Scrum Master"];

  if (!allowedRoles.includes(requesterRole)) {
    const error = new Error("No tienes permiso para crear roles del proyecto");
    error.statusCode = 403;
    throw error;
  }

  const cleanedName = String(nombre_rol || "").trim();
  if (!cleanedName) {
    const error = new Error("El nombre del rol es requerido");
    error.statusCode = 400;
    throw error;
  }

  const cleanedDescription = String(descripcion || "").trim();
  if (!cleanedDescription) {
    const error = new Error("La descripción del rol es requerida");
    error.statusCode = 400;
    throw error;
  }

  const [existing] = await pool.query(
    `SELECT id_rol
     FROM rol
     WHERE LOWER(nombre_rol) = LOWER(?)
       AND (id_proyecto IS NULL OR id_proyecto = ?)`,
    [cleanedName, proyectoId],
  );

  if (existing.length > 0) {
    const error = new Error("Ya existe un rol con ese nombre en este proyecto o a nivel global");
    error.statusCode = 409;
    throw error;
  }

  const [result] = await pool.query(
    `INSERT INTO rol (nombre_rol, descripcion, id_proyecto)
     VALUES (?, ?, ?)`,
    [cleanedName, cleanedDescription, proyectoId],
  );

  const [rows] = await pool.query(
    `SELECT id_rol, nombre_rol, descripcion, id_proyecto
     FROM rol
     WHERE id_rol = ?`,
    [result.insertId],
  );

  return rows[0] || null;
};

export const obtenerMiRolEnProyecto = async (proyectoId, userId) => {
  const [rows] = await pool.query(
    `SELECT r.nombre_rol AS rol, r.id_rol,
     GROUP_CONCAT(p.nombre) AS permisos
     FROM usuario_equipo_proyecto uep
     JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
     JOIN rol r ON uep.id_rol = r.id_rol
     LEFT JOIN rol_permiso rp ON r.id_rol = rp.id_rol
     LEFT JOIN permiso p ON rp.id_permiso = p.id_permiso
     WHERE ep.id_proyecto = ? AND uep.id_usuario = ? AND uep.activo = 1
     GROUP BY r.nombre_rol, r.id_rol`,
    [proyectoId, userId],
  );

  if (rows.length === 0) {
    return null;
  }

  const result = rows[0];
  // Convertir permisos a array si existe
  if (result.permisos) {
    result.permisos = result.permisos.split(',');
  } else {
    result.permisos = [];
  }

  return result;
};

export const actualizarEstadoMiembroProyecto = async (
  proyectoId,
  usuarioId,
  activo,
  usuarioActual,
) => {
  const idEquipoProyecto = await getEquipoProyectoId(proyectoId);
  if (!idEquipoProyecto) {
    throw notFoundError();
  }

  const [requesterRows] = await pool.query(
    `SELECT uep.id_usuario, r.nombre_rol
     FROM usuario_equipo_proyecto uep
     JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?
       AND uep.activo = 1`,
    [idEquipoProyecto, usuarioActual.id_usuario],
  );

  const requesterRole = requesterRows.length > 0 ? requesterRows[0].nombre_rol : null;
  const allowedRoles = ["admin", "Product Owner", "Scrum Master"];

  if (
    !allowedRoles.includes(requesterRole) &&
    !allowedRoles.includes(usuarioActual.rol) &&
    !allowedRoles.includes(usuarioActual.rol_principal)
  ) {
    const error = new Error("No tienes permiso para actualizar el estado del miembro");
    error.statusCode = 403;
    throw error;
  }

  const [currentMemberRows] = await pool.query(
    `SELECT uep.id_usuario, r.nombre_rol
     FROM usuario_equipo_proyecto uep
     JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?`,
    [idEquipoProyecto, usuarioId],
  );

  if (currentMemberRows.length === 0) {
    const error = new Error("Miembro no encontrado en el proyecto");
    error.statusCode = 404;
    throw error;
  }

  const targetRole = currentMemberRows[0].nombre_rol;
  const specialRoles = ["Product Owner", "Scrum Master"];

  if (!activo && specialRoles.includes(targetRole)) {
    const error = new Error(
      "No se puede inactivar a un Product Owner o Scrum Master directamente. Utiliza la transferencia de Product Owner si se trata de cambiar el PO.",
    );
    error.statusCode = 400;
    throw error;
  }
  if (activo && specialRoles.includes(targetRole)) {
    const [existingActiveRoleRows] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM usuario_equipo_proyecto uep
       JOIN rol r ON uep.id_rol = r.id_rol
       WHERE uep.id_equipo_proyecto = ?
         AND uep.id_usuario != ?
         AND uep.activo = 1
         AND LOWER(r.nombre_rol) = LOWER(?)`,
      [idEquipoProyecto, usuarioId, targetRole],
    );

    const existingActiveCount = existingActiveRoleRows[0].count;
    if (existingActiveCount > 0) {
      const error = new Error(
        `No se puede activar a este ${targetRole} porque ya existe un ${targetRole} activo en el proyecto.`,
      );
      error.statusCode = 400;
      throw error;
    }
  }
  const [result] = await pool.query(
    `UPDATE usuario_equipo_proyecto
     SET activo = ?
     WHERE id_equipo_proyecto = ?
       AND id_usuario = ?`,
    [activo ? 1 : 0, idEquipoProyecto, usuarioId],
  );

  if (result.affectedRows === 0) {
    const error = new Error("Miembro no encontrado en el proyecto");
    error.statusCode = 404;
    throw error;
  }

  const [rows] = await pool.query(
    `SELECT u.id_usuario,
            u.nombre,
            u.email,
            r.id_rol,
            r.nombre_rol AS rol,
            r.id_proyecto,
            uep.fecha_ingreso,
            uep.activo
     FROM usuario_equipo_proyecto uep
     JOIN usuario u ON uep.id_usuario = u.id_usuario
     INNER JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?`,
    [idEquipoProyecto, usuarioId],
  );

  return rows[0] || { id_usuario: Number(usuarioId), activo };
};

export const actualizarRolMiembroProyecto = async (
  proyectoId,
  usuarioId,
  idRol,
  usuarioActual,
) => {
  const idEquipoProyecto = await getEquipoProyectoId(proyectoId);
  if (!idEquipoProyecto) {
    throw notFoundError();
  }

  const [requesterRows] = await pool.query(
    `SELECT uep.id_usuario, r.nombre_rol
     FROM usuario_equipo_proyecto uep
     JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?
       AND uep.activo = 1`,
    [idEquipoProyecto, usuarioActual.id_usuario],
  );

  const requesterRole = requesterRows.length > 0 ? requesterRows[0].nombre_rol : null;
  const allowedRoles = ["admin", "Product Owner", "Scrum Master"];

  if (
    !allowedRoles.includes(requesterRole) &&
    !allowedRoles.includes(usuarioActual.rol) &&
    !allowedRoles.includes(usuarioActual.rol_principal)
  ) {
    const error = new Error("No tienes permiso para actualizar roles de miembros");
    error.statusCode = 403;
    throw error;
  }

  // Validación de rol válido
  const [roleRows] = await pool.query(
    "SELECT id_rol, nombre_rol FROM rol WHERE id_rol = ?",
    [idRol],
  );
  if (roleRows.length === 0) {
    const error = new Error("El rol especificado no es válido");
    error.statusCode = 400;
    throw error;
  }

  // Obtener información del miembro actual
  const [currentMemberRows] = await pool.query(
    `SELECT uep.id_usuario, r.nombre_rol
     FROM usuario_equipo_proyecto uep
     JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?`,
    [idEquipoProyecto, usuarioId],
  );

  if (currentMemberRows.length === 0) {
    const error = new Error("Miembro no encontrado en el proyecto");
    error.statusCode = 404;
    throw error;
  }

  const currentMemberRole = currentMemberRows[0].nombre_rol;
  const newRoleName = roleRows[0].nombre_rol;
  const specialRoles = ["Product Owner", "Scrum Master"];

  console.log(`Actualizando rol: ${currentMemberRole} -> ${newRoleName}`);
  console.log(`Usuario actual rol: ${requesterRole}, global: ${usuarioActual.rol}, principal: ${usuarioActual.rol_principal}`);

  // VALIDACIÓN DE NEGOCIO: Asegurar que el proyecto no se queda sin roles críticos
  // Primero, verificar si el nuevo rol es un rol especial y ya existe otro activo
  if (specialRoles.includes(newRoleName) && currentMemberRole !== newRoleName) {
    const [existingSpecialRows] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM usuario_equipo_proyecto uep
       JOIN rol r ON uep.id_rol = r.id_rol
       WHERE uep.id_equipo_proyecto = ?
         AND uep.id_usuario != ?
         AND uep.activo = 1
         AND LOWER(r.nombre_rol) = LOWER(?)`,
      [idEquipoProyecto, usuarioId, newRoleName],
    );

    const existingSpecialCount = existingSpecialRows[0].count;
    console.log(`Miembros activos con rol ${newRoleName} distintos del usuario actual: ${existingSpecialCount}`);

    if (existingSpecialCount > 0) {
      console.log(`BLOQUEANDO: Ya existe otro ${newRoleName}`);
      const error = new Error(
        `Ya existe un ${newRoleName} activo en el proyecto`,
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Segundo, si el rol actual es especial, asegurar que hay otros disponibles antes de cambiarlo
  if (specialRoles.includes(currentMemberRole) && currentMemberRole !== newRoleName) {
    console.log(`Cambiando rol especial ${currentMemberRole} a ${newRoleName}`);

    const [remainingRoleCountRows] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM usuario_equipo_proyecto uep
       JOIN rol r ON uep.id_rol = r.id_rol
       WHERE uep.id_equipo_proyecto = ?
         AND uep.id_usuario != ?
         AND uep.activo = 1
         AND LOWER(r.nombre_rol) = LOWER(?)`,
      [idEquipoProyecto, usuarioId, currentMemberRole],
    );

    const remainingCount = remainingRoleCountRows[0].count;
    console.log(`Miembros restantes con rol ${currentMemberRole}: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log(`BLOQUEANDO: No queda ningún ${currentMemberRole}`);
      const error = new Error(
        `No se puede cambiar el rol. El proyecto necesita al menos un ${currentMemberRole} activo`,
      );
      error.statusCode = 400;
      throw error;
    } else {
      console.log(`PERMITIENDO: Hay ${remainingCount} miembro(s) restante(s) con rol ${currentMemberRole}`);
    }
  }

  const [result] = await pool.query(
    `UPDATE usuario_equipo_proyecto
     SET id_rol = ?
     WHERE id_equipo_proyecto = ?
       AND id_usuario = ?`,
    [idRol, idEquipoProyecto, usuarioId],
  );

  if (result.affectedRows === 0) {
    const error = new Error("Miembro no encontrado en el proyecto");
    error.statusCode = 404;
    throw error;
  }

  // Actualizar también el rol global en usuario_rol para que el JWT se refresque correctamente
  // Eliminar el rol anterior si existe
  await pool.query(
    "DELETE FROM usuario_rol WHERE id_usuario = ?",
    [usuarioId],
  );

  // Insertar el nuevo rol
  await pool.query(
    `INSERT INTO usuario_rol (id_usuario, id_rol, fecha_asignacion) VALUES (?, ?, NOW())`,
    [usuarioId, idRol],
  );

  const [rows] = await pool.query(
    `SELECT u.id_usuario,
            u.nombre,
            u.email,
            r.id_rol,
            r.nombre_rol AS rol,
            r.id_proyecto,
            uep.fecha_ingreso,
            uep.activo
     FROM usuario_equipo_proyecto uep
     JOIN usuario u ON uep.id_usuario = u.id_usuario
     INNER JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?`,
    [idEquipoProyecto, usuarioId],
  );

  return rows[0] || { id_usuario: Number(usuarioId), id_rol: Number(idRol) };
};

export const eliminarMiembroProyecto = async (proyectoId, usuarioId) => {
  const idEquipoProyecto = await getEquipoProyectoId(proyectoId);
  if (!idEquipoProyecto) {
    throw notFoundError();
  }

  const [result] = await pool.query(
    `DELETE FROM usuario_equipo_proyecto
     WHERE id_equipo_proyecto = ?
       AND id_usuario = ?`,
    [idEquipoProyecto, usuarioId],
  );

  if (result.affectedRows === 0) {
    const error = new Error("Miembro no encontrado en el proyecto");
    error.statusCode = 404;
    throw error;
  }

  return { id_usuario: Number(usuarioId), eliminado: true };
};

export const actualizarProyecto = async (id, data) => {
  const [result] = await pool.query(
    `UPDATE proyecto SET nombre = ?, descripcion = ?, tipo = ?, estado = ?, fecha_inicio = ?, fecha_fin_est = ?, numero_ficha = ?, fecha_actualizacion = NOW()
     WHERE id_proyecto = ?`,
    [
      data.nombre || null,
      data.descripcion || null,
      data.tipo || null,
      data.estado || null,
      data.fecha_inicio || null,
      data.fecha_fin_est || null,
      data.numero_ficha || null,
      id,
    ],
  );
  if (result.affectedRows === 0) {
    throw notFoundError();
  }
  const [rows] = await pool.query(
    "SELECT * FROM proyecto WHERE id_proyecto = ?",
    [id],
  );
  return withCalendarDateAliases(rows[0]);
};

export const buscarProyectoPorCodigo = async (codigo) => {
  const [rows] = await pool.query(
    "SELECT * FROM proyecto WHERE codigo_proyecto = ?",
    [codigo.toUpperCase()],
  );
  if (rows.length === 0) {
    throw notFoundError();
  }
  return withCalendarDateAliases(rows[0]);
};

/**
 * Transfiere el rol de Product Owner a otro miembro
 * - El PO actual se inactiva automáticamente
 * - El nuevo miembro se activa como PO
 * - Solo el PO actual activo puede hacer esta transferencia
 */
export const transferirProductOwner = async (
  proyectoId,
  nuevoProductOwnerId,
  usuarioActual,
) => {
  const idEquipoProyecto = await getEquipoProyectoId(proyectoId);
  if (!idEquipoProyecto) {
    throw notFoundError();
  }

  // Verificar que el usuario actual es Product Owner activo
  const [requesterRows] = await pool.query(
    `SELECT uep.id_usuario, r.nombre_rol, uep.activo
     FROM usuario_equipo_proyecto uep
     JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?`,
    [idEquipoProyecto, usuarioActual.id_usuario],
  );

  if (requesterRows.length === 0) {
    const error = new Error("No eres miembro de este proyecto");
    error.statusCode = 403;
    throw error;
  }

  const requesterRole = requesterRows[0].nombre_rol;
  const requesterActivo = requesterRows[0].activo;

  if (requesterRole !== "Product Owner" || requesterActivo === 0) {
    const error = new Error("Solo el Product Owner activo puede transferir este rol");
    error.statusCode = 403;
    throw error;
  }

  // Obtener el rol de Product Owner
  const [poRoleRows] = await pool.query(
    `SELECT id_rol FROM rol WHERE nombre_rol = ?`,
    ["Product Owner"],
  );

  if (poRoleRows.length === 0) {
    const error = new Error("Rol de Product Owner no encontrado en el sistema");
    error.statusCode = 500;
    throw error;
  }

  const poRoleId = poRoleRows[0].id_rol;

  // Verificar que el nuevo Product Owner es miembro del proyecto
  const [newPORows] = await pool.query(
    `SELECT uep.id_usuario, uep.activo, r.id_rol, r.nombre_rol, r.id_proyecto
     FROM usuario_equipo_proyecto uep
     INNER JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.id_usuario = ?`,
    [idEquipoProyecto, nuevoProductOwnerId],
  );

  if (newPORows.length === 0) {
    const error = new Error("El nuevo Product Owner debe ser miembro del proyecto");
    error.statusCode = 400;
    throw error;
  }

  // Validación: Asegurar que el proyecto tiene un Scrum Master activo
  const [smCheckRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM usuario_equipo_proyecto uep
     JOIN rol r ON uep.id_rol = r.id_rol
     WHERE uep.id_equipo_proyecto = ?
       AND uep.activo = 1
       AND LOWER(r.nombre_rol) = LOWER('Scrum Master')`,
    [idEquipoProyecto],
  );

  if (smCheckRows[0].count === 0) {
    const error = new Error(
      "El proyecto debe tener un Scrum Master activo antes de transferir el Product Owner",
    );
    error.statusCode = 400;
    throw error;
  }

  // Iniciar transacción para actualizar el rol del nuevo PO y desactivar el anterior
  try {
    // 1. Actualizar al nuevo miembro como Product Owner (ACTIVO)
    const [updateNewPO] = await pool.query(
      `UPDATE usuario_equipo_proyecto
       SET id_rol = ?, activo = 1
       WHERE id_equipo_proyecto = ?
         AND id_usuario = ?`,
      [poRoleId, idEquipoProyecto, nuevoProductOwnerId],
    );

    if (updateNewPO.affectedRows === 0) {
      throw new Error("No se pudo actualizar el nuevo Product Owner");
    }

    // 2. Desactivar el Product Owner anterior
    const [updateOldPO] = await pool.query(
      `UPDATE usuario_equipo_proyecto
       SET activo = 0
       WHERE id_equipo_proyecto = ?
         AND id_usuario = ?`,
      [idEquipoProyecto, usuarioActual.id_usuario],
    );

    if (updateOldPO.affectedRows === 0) {
      throw new Error("No se pudo desactivar el Product Owner anterior");
    }

    // 3. Actualizar roles globales - Nuevo PO
    await pool.query(
      "DELETE FROM usuario_rol WHERE id_usuario = ?",
      [nuevoProductOwnerId],
    );

    await pool.query(
      `INSERT INTO usuario_rol (id_usuario, id_rol, fecha_asignacion) VALUES (?, ?, NOW())`,
      [nuevoProductOwnerId, poRoleId],
    );

    // 4. Remover rol global al antiguo PO si lo tiene
    await pool.query(
      "DELETE FROM usuario_rol WHERE id_usuario = ?",
      [usuarioActual.id_usuario],
    );

    // Obtener datos actualizados del nuevo Product Owner
    const [nuevoPoData] = await pool.query(
      `SELECT u.id_usuario,
              u.nombre,
              u.email,
              r.nombre_rol AS rol,
              uep.fecha_ingreso,
              uep.activo
       FROM usuario_equipo_proyecto uep
       JOIN usuario u ON uep.id_usuario = u.id_usuario
       INNER JOIN rol r ON uep.id_rol = r.id_rol
       WHERE uep.id_equipo_proyecto = ?
         AND uep.id_usuario = ?`,
      [idEquipoProyecto, nuevoProductOwnerId],
    );

    const [antiguoPoData] = await pool.query(
      `SELECT u.id_usuario,
              u.nombre,
              u.email,
              r.id_rol,
              r.nombre_rol AS rol,
              r.id_proyecto,
              uep.fecha_ingreso,
              uep.activo
       FROM usuario_equipo_proyecto uep
       JOIN usuario u ON uep.id_usuario = u.id_usuario
       INNER JOIN rol r ON uep.id_rol = r.id_rol
       WHERE uep.id_equipo_proyecto = ?
         AND uep.id_usuario = ?`,
      [idEquipoProyecto, usuarioActual.id_usuario],
    );

    return {
      success: true,
      message: "Product Owner transferido exitosamente",
      nuevoProductOwner: nuevoPoData[0] || { id_usuario: nuevoProductOwnerId },
      antiguoProductOwner: antiguoPoData[0] || {
        id_usuario: usuarioActual.id_usuario,
        activo: 0,
      },
    };
  } catch (error) {
    console.error("Error al transferir Product Owner:", error);
    throw error;
  }
};
