import pool from "../utils/database.js";

const logSolicitud = (event, details = {}) => {
  console.log(
    JSON.stringify({
      service: "solicitud",
      event,
      ...details,
      timestamp: new Date().toISOString(),
    }),
  );
};

// =============================
// VALIDAR APROBADOR
// =============================
async function esAprobador(userId, idProyecto) {
  // Solo el Product Owner (rol id_rol = 1) puede aprobar solicitudes
  const [rows] = await pool.query(
    `
    SELECT 1 FROM usuario_equipo_proyecto uep
    JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
    WHERE ep.id_proyecto = ? AND uep.id_usuario = ? AND uep.id_rol = 1 AND uep.activo = 1
  `,
    [idProyecto, userId],
  );

  return rows.length > 0;
}

// =============================
// VALIDAR MIEMBRO DE PROYECTO
// =============================
async function esMiembroProyecto(userId, idProyecto) {
  const [rows] = await pool.query(
    `
    SELECT 1 FROM usuario_equipo_proyecto uep
    JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
    WHERE ep.id_proyecto = ? AND uep.id_usuario = ? AND uep.activo = 1
  `,
    [idProyecto, userId],
  );

  return rows.length > 0;
}

// =============================
// VALIDAR PROYECTO ACTIVO
// =============================
async function proyectoActivo(idProyecto) {
  const [rows] = await pool.query(
    "SELECT estado FROM proyecto WHERE id_proyecto = ?",
    [idProyecto],
  );

  if (!rows.length) return false;

  // ✅ Solo proyectos activos permiten solicitudes
  return rows[0].estado === "activo";
}

const solicitudService = {
  // =============================
  // CREAR
  // =============================
  async crearSolicitud({ id_usuario, id_proyecto, mensaje_opcional }) {
    if (!(await proyectoActivo(id_proyecto))) {
      return {
        status: 400,
        data: null,
        message: "Proyecto inactivo o eliminado",
      };
    }

    const [solCount] = await pool.query(
      `SELECT COUNT(*) as total FROM solicitud 
       WHERE id_usuario = ? AND id_proyecto = ? 
       AND fecha_creacion >= (NOW() - INTERVAL 6 HOUR)`,
      [id_usuario, id_proyecto],
    );

    if (solCount[0].total >= 5) {
      return {
        status: 429,
        data: null,
        message: "Límite de 5 solicitudes cada 6 horas alcanzado",
      };
    }

    const [equipo] = await pool.query(
      `SELECT 1 FROM usuario_equipo_proyecto uep
       JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
       WHERE ep.id_proyecto = ? AND uep.id_usuario = ?`,
      [id_proyecto, id_usuario],
    );

    if (equipo.length > 0) {
      logSolicitud("solicitud_rechazada", {
        reason: "usuario_ya_miembro",
        id_usuario,
        id_proyecto,
      });
      return { status: 409, data: null, message: "Ya eres miembro" };
    }

    const [pend] = await pool.query(
      `SELECT 1 FROM solicitud 
       WHERE id_usuario = ? AND id_proyecto = ? AND estado = 'Pendiente'`,
      [id_usuario, id_proyecto],
    );

    if (pend.length > 0) {
      logSolicitud("solicitud_rechazada", {
        reason: "solicitud_duplicada",
        id_usuario,
        id_proyecto,
      });
      return { status: 409, data: null, message: "Solicitud duplicada" };
    }

    const [result] = await pool.query(
      `INSERT INTO solicitud (id_usuario, id_proyecto, id_usuario_creador, estado, mensaje_opcional)
       VALUES (?, ?, ?, 'Pendiente', ?)`,
      [id_usuario, id_proyecto, id_usuario, mensaje_opcional || null],
    );

    // Obtener info del proyecto, del solicitante y el Product Owner actual para la notificación
    const [proy] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [id_proyecto],
    );

    const [solicitante] = await pool.query(
      "SELECT nombre FROM usuario WHERE id_usuario = ?",
      [id_usuario],
    );
    const nombreSolicitante = solicitante.length ? solicitante[0].nombre : "Un usuario";

    // Obtener el Product Owner actual del proyecto (rol id_rol = 1)
    const [poUsers] = await pool.query(
      `SELECT u.id_usuario 
       FROM usuario u
       JOIN usuario_equipo_proyecto uep ON u.id_usuario = uep.id_usuario
       JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
       WHERE ep.id_proyecto = ? AND uep.id_rol = 1 AND uep.activo = 1
       LIMIT 1`,
      [id_proyecto],
    );

    if (proy.length && poUsers.length) {
      const poId = poUsers[0].id_usuario;
      
      // Notificar SOLO al Product Owner actual
      await pool.query(
        `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud)
         VALUES (?, 'prioritaria', 'Nueva solicitud de ingreso', ?, ?)`,
        [
          poId,
          `${nombreSolicitante} ha solicitado unirse al proyecto "${proy[0].nombre}"`,
          result.insertId,
        ],
      );
      logSolicitud("notificacion_creada", {
        tipo: "Nueva solicitud de ingreso",
        id_usuario: poId,
        id_proyecto,
        id_solicitud: result.insertId,
      });
    }

    return {
      status: 201,
      data: { id: result.insertId },
      message: "Solicitud creada",
    };
  },

  // =============================
  // LISTAR TODAS
  // =============================
  async listarTodas({ id_usuario }) {
    const [rows] = await pool.query(
      `SELECT s.*, p.nombre AS nombre_proyecto, p.codigo_proyecto, u.nombre AS nombre_usuario_solicitante
       FROM solicitud s
       JOIN proyecto p ON s.id_proyecto = p.id_proyecto
       JOIN usuario u ON s.id_usuario = u.id_usuario
       WHERE s.id_usuario = ?
       ORDER BY s.fecha_creacion DESC`,
      [id_usuario],
    );

    return { status: 200, data: rows, message: "Listado de solicitudes" };
  },

  // =============================
  // OBTENER POR ID
  // =============================
  async obtenerPorId({ id_usuario, id_solicitud }) {
    const [rows] = await pool.query(
      `SELECT s.*, p.nombre AS nombre_proyecto, p.codigo_proyecto, u.nombre AS nombre_usuario_solicitante
       FROM solicitud s
       JOIN proyecto p ON s.id_proyecto = p.id_proyecto
       JOIN usuario u ON s.id_usuario = u.id_usuario
       WHERE s.id_solicitud = ?`,
      [id_solicitud],
    );

    if (!rows.length) {
      return { status: 404, data: null, message: "No encontrada" };
    }

    return { status: 200, data: rows[0], message: "Solicitud encontrada" };
  },

  // =============================
  // PENDIENTES POR PROYECTO
  // =============================
  async listarPendientes({ id_usuario, proyecto }) {
    if (!(await esMiembroProyecto(id_usuario, proyecto))) {
      return { status: 403, data: null, message: "Sin permisos" };
    }

    const [rows] = await pool.query(
      `SELECT s.*, p.nombre AS nombre_proyecto, p.codigo_proyecto, u.nombre AS nombre_usuario_solicitante
       FROM solicitud s
       JOIN proyecto p ON s.id_proyecto = p.id_proyecto
       JOIN usuario u ON s.id_usuario = u.id_usuario
       WHERE s.id_proyecto = ? AND s.estado = 'Pendiente' AND s.id_usuario_creador != ?
       ORDER BY s.fecha_creacion ASC`,
      [proyecto, id_usuario],
    );

    return { status: 200, data: rows, message: "Solicitudes pendientes" };
  },

  // =============================
  // MIS PENDIENTES
  // =============================
  async listarMisProyectosPendientes({ id_usuario }) {
    const [rows] = await pool.query(
      `SELECT s.*, p.nombre AS nombre_proyecto, p.codigo_proyecto, u.nombre AS nombre_usuario_solicitante
       FROM solicitud s
       JOIN proyecto p ON s.id_proyecto = p.id_proyecto
       JOIN usuario u ON s.id_usuario = u.id_usuario
       WHERE s.id_usuario = ? AND s.estado = 'Pendiente'
       ORDER BY s.fecha_creacion DESC`,
      [id_usuario],
    );

    return { status: 200, data: rows, message: "Mis solicitudes pendientes" };
  },

  // =============================
  // APROBAR (FIXED)
  // =============================
  async aprobarSolicitud({ id_usuario_aprobador, id_solicitud, id_rol }) {
    const [solRows] = await pool.query(
      "SELECT * FROM solicitud WHERE id_solicitud = ?",
      [id_solicitud],
    );

    if (!solRows.length) {
      return { status: 404, data: null, message: "No encontrada" };
    }

    const solicitud = solRows[0];

    if (!(await proyectoActivo(solicitud.id_proyecto))) {
      return {
        status: 400,
        data: null,
        message: "Proyecto inactivo o eliminado",
      };
    }

    if (solicitud.estado !== "Pendiente") {
      return {
        status: 409,
        data: null,
        message: "Solo puedes aprobar solicitudes pendientes",
      };
    }

    // Prevenir que el creador de la invitación la apruebe (a menos que sea también el invitado)
    if (String(solicitud.id_usuario_creador) === String(id_usuario_aprobador) && 
        String(solicitud.id_usuario) !== String(id_usuario_aprobador)) {
      return { status: 403, data: null, message: "No puedes aprobar una solicitud que tú creaste" };
    }

    if (!(await esAprobador(id_usuario_aprobador, solicitud.id_proyecto))) {
      // Permitir que el usuario invitado acepte su propia invitación
      if (String(solicitud.id_usuario) !== String(id_usuario_aprobador)) {
        return { status: 403, data: null, message: "Sin permisos" };
      }
    }

    const [eqRows] = await pool.query(
      "SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = ? LIMIT 1",
      [solicitud.id_proyecto],
    );

    const id_equipo_proyecto = eqRows.length
      ? eqRows[0].id_equipo_proyecto
      : (
          await pool.query(
            "INSERT INTO equipo_proyecto (id_proyecto, nombre) VALUES (?, ?)",
            [solicitud.id_proyecto, "Equipo"],
          )
        )[0].insertId;

    const [exists] = await pool.query(
      `SELECT 1 FROM usuario_equipo_proyecto 
       WHERE id_usuario = ? AND id_equipo_proyecto = ?`,
      [solicitud.id_usuario, id_equipo_proyecto],
    );

    if (!exists.length) {
      // Si no se proporcionó id_rol, usar el rol de la solicitud si existe
      const roleToAssign = id_rol || solicitud.id_rol || 3;
      await pool.query(
        `INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol)
         VALUES (?, ?, ?)`,
        [solicitud.id_usuario, id_equipo_proyecto, Number(roleToAssign)],
      );
      logSolicitud("miembro_agregado", {
        id_usuario: solicitud.id_usuario,
        id_proyecto: solicitud.id_proyecto,
        id_equipo_proyecto,
        id_rol,
        id_solicitud,
        aprobado_por: id_usuario_aprobador,
      });
    } else {
      logSolicitud("miembro_existente", {
        id_usuario: solicitud.id_usuario,
        id_proyecto: solicitud.id_proyecto,
        id_equipo_proyecto,
        id_solicitud,
      });
    }

    await pool.query(
      `UPDATE solicitud SET estado = "Aprobada" WHERE id_solicitud = ?`,
      [id_solicitud],
    );

    // Obtener info del proyecto para la notificación
    const [proyInfo] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [solicitud.id_proyecto],
    );
    const nombreProyecto = proyInfo.length ? proyInfo[0].nombre : "un proyecto";

    const [usuarioInfo] = await pool.query(
      "SELECT nombre FROM usuario WHERE id_usuario = ?",
      [solicitud.id_usuario],
    );
    const nombreSolicitante = usuarioInfo.length ? usuarioInfo[0].nombre : "el usuario";

    // Notificar al usuario que solicitó o aceptó la invitación
    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje)
       VALUES (?, 'informativa', 'Solicitud aprobada', ?)`,
      [
        solicitud.id_usuario,
        `Tu solicitud para unirte a "${nombreProyecto}" ha sido aprobada`,
      ],
    );
    logSolicitud("notificacion_creada", {
      tipo: "Solicitud aprobada",
      id_usuario: solicitud.id_usuario,
      id_proyecto: solicitud.id_proyecto,
      id_solicitud,
    });

    // Si se trata de una invitación, notificar también al creador de la invitación
    if (
      solicitud.id_usuario_creador &&
      String(solicitud.id_usuario_creador) !== String(solicitud.id_usuario)
    ) {
      await pool.query(
        `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud)
         VALUES (?, 'informativa', 'Invitación aceptada', ?, ?)`,
        [
          solicitud.id_usuario_creador,
          `La invitación al proyecto "${nombreProyecto}" fue aceptada por ${nombreSolicitante}`,
          id_solicitud,
        ],
      );
      logSolicitud("notificacion_creada", {
        tipo: "Invitación aceptada",
        id_usuario: solicitud.id_usuario_creador,
        id_proyecto: solicitud.id_proyecto,
        id_solicitud,
      });
    }

    return { status: 200, data: null, message: "Solicitud aprobada" };
  },

  // =============================
  // RECHAZAR (FIXED)
  // =============================
  async rechazarSolicitud({ id_usuario_aprobador, id_solicitud, motivo }) {
    const [solRows] = await pool.query(
      "SELECT * FROM solicitud WHERE id_solicitud = ?",
      [id_solicitud],
    );

    if (!solRows.length) {
      return { status: 404, data: null, message: "No encontrada" };
    }

    const solicitud = solRows[0];

    if (solicitud.estado !== "Pendiente") {
      return {
        status: 409,
        data: null,
        message: "Solo puedes rechazar solicitudes pendientes",
      };
    }

    // Prevenir que el creador de la invitación la rechace (a menos que sea también el solicitante)
    if (String(solicitud.id_usuario_creador) === String(id_usuario_aprobador) && 
        String(solicitud.id_usuario) !== String(id_usuario_aprobador)) {
      return { status: 403, data: null, message: "No puedes rechazar una solicitud que tú creaste" };
    }

    const esAprobadorSolicitud = await esAprobador(id_usuario_aprobador, solicitud.id_proyecto);
    const esSolicitante = String(id_usuario_aprobador) === String(solicitud.id_usuario);

    if (!esAprobadorSolicitud && !esSolicitante) {
      return { status: 403, data: null, message: "Sin permisos" };
    }

    await pool.query(
      `UPDATE solicitud 
       SET estado = "Rechazada", motivo = ? 
       WHERE id_solicitud = ?`,
      [motivo || null, id_solicitud],
    );

    const receptorNotificacion = solicitud.id_usuario_creador && String(solicitud.id_usuario_creador) !== String(solicitud.id_usuario)
      ? solicitud.id_usuario_creador
      : solicitud.id_usuario;

    const [solicitanteInfo] = await pool.query(
      "SELECT nombre FROM usuario WHERE id_usuario = ?",
      [solicitud.id_usuario],
    );
    const nombreSolicitante = solicitanteInfo.length ? solicitanteInfo[0].nombre : "el usuario";

    const [proyInfo] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [solicitud.id_proyecto],
    );
    const nombreProyecto = proyInfo.length ? proyInfo[0].nombre : "el proyecto";

    const titulo = receptorNotificacion !== solicitud.id_usuario
      ? "Invitación rechazada"
      : "Solicitud rechazada";

    const mensaje = receptorNotificacion !== solicitud.id_usuario
      ? `La invitación a "${nombreProyecto}" enviada a ${nombreSolicitante} fue rechazada.`
      : `Tu solicitud fue rechazada. Motivo: ${motivo || "No especificado"}`;

    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud)
       VALUES (?, 'informativa', ?, ?, ?)`,
      [
        receptorNotificacion,
        titulo,
        mensaje,
        id_solicitud,
      ],
    );

    logSolicitud("notificacion_creada", {
      tipo: titulo,
      id_usuario: receptorNotificacion,
      id_proyecto: solicitud.id_proyecto,
      id_solicitud,
    });

    return { status: 200, data: null, message: "Solicitud rechazada" };
  },

  // =============================
  // CANCELAR (MEJORADO)
  // =============================
  async cancelarSolicitud({ id_usuario, id_solicitud, motivo }) {
    const [rows] = await pool.query(
      `SELECT * FROM solicitud WHERE id_solicitud = ?`,
      [id_solicitud],
    );

    if (!rows.length) {
      return { status: 404, data: null, message: "No encontrada" };
    }

    const solicitud = rows[0];

    if (solicitud.id_usuario !== id_usuario) {
      return {
        status: 403,
        data: null,
        message: "No puedes cancelar esta solicitud",
      };
    }

    if (solicitud.estado !== "Pendiente") {
      return {
        status: 409,
        data: null,
        message: "Solo puedes cancelar solicitudes pendientes",
      };
    }

    await pool.query(
      `UPDATE solicitud 
       SET estado = "Cancelada", motivo = ? 
       WHERE id_solicitud = ?`,
      [motivo || null, id_solicitud],
    );

    const receptorNotificacion = solicitud.id_usuario_creador && String(solicitud.id_usuario_creador) !== String(id_usuario)
      ? solicitud.id_usuario_creador
      : id_usuario;

    const [solicitanteInfo] = await pool.query(
      "SELECT nombre FROM usuario WHERE id_usuario = ?",
      [solicitud.id_usuario],
    );
    const nombreSolicitante = solicitanteInfo.length ? solicitanteInfo[0].nombre : "el usuario";

    const [proyInfo] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [solicitud.id_proyecto],
    );
    const nombreProyecto = proyInfo.length ? proyInfo[0].nombre : "el proyecto";

    const titulo = receptorNotificacion !== id_usuario
      ? "Invitación rechazada"
      : "Solicitud cancelada";

    const mensaje = receptorNotificacion !== id_usuario
      ? `La invitación al proyecto "${nombreProyecto}" enviada a ${nombreSolicitante} fue rechazada${motivo ? `. Motivo: ${motivo}` : ''}.`
      : `Has cancelado tu solicitud al proyecto${motivo ? `. Motivo: ${motivo}` : ''}`;

    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud)
       VALUES (?, 'informativa', ?, ?, ?)`,
      [
        receptorNotificacion,
        titulo,
        mensaje,
        id_solicitud,
      ],
    );

    logSolicitud("notificacion_creada", {
      tipo: titulo,
      id_usuario: receptorNotificacion,
      id_proyecto: solicitud.id_proyecto,
      id_solicitud,
    });

    return { status: 200, data: null, message: "Solicitud cancelada" };
  },

  // =============================
  // INVITAR
  // =============================
  async invitarUsuario({
    id_usuario_aprobador,
    id_usuario,
    id_proyecto,
    id_rol,
  }) {
    if (!(await esAprobador(id_usuario_aprobador, id_proyecto))) {
      return { status: 403, data: null, message: "Sin permisos" };
    }

    const [eqRows] = await pool.query(
      "SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = ? LIMIT 1",
      [id_proyecto],
    );

    if (!eqRows.length) {
      return { status: 404, data: null, message: "Proyecto sin equipo" };
    }

    const [exists] = await pool.query(
      `SELECT 1 FROM usuario_equipo_proyecto 
       WHERE id_usuario = ? AND id_equipo_proyecto = ?`,
      [id_usuario, eqRows[0].id_equipo_proyecto],
    );

    if (exists.length) {
      return { status: 409, data: null, message: "Ya pertenece al equipo" };
    }

    await pool.query(
      `INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol)
       VALUES (?, ?, ?)`,
      [id_usuario, eqRows[0].id_equipo_proyecto, id_rol],
    );

    // Obtener info del proyecto para la notificación
    const [proyInfo] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [id_proyecto],
    );
    const nombreProyecto = proyInfo.length ? proyInfo[0].nombre : "un proyecto";

    // Notificar al usuario invitado
    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje)
       VALUES (?, 'prioritaria', 'Invitación a proyecto', ?)`,
      [
        id_usuario,
        `Has sido invitado a unirte al proyecto "${nombreProyecto}"`,
      ],
    );

    return { status: 201, data: null, message: "Usuario invitado" };
  },

  async enviarInvitacionProyecto({
    id_usuario_aprobador,
    id_usuario,
    id_proyecto,
    id_rol,
  }) {
    // Validar que el aprobador tenga permisos
    if (!(await esAprobador(id_usuario_aprobador, id_proyecto))) {
      return { status: 403, data: null, message: "Sin permisos" };
    }

    // Validar que el proyecto existe y está activo
    if (!(await proyectoActivo(id_proyecto))) {
      return { status: 404, data: null, message: "Proyecto no válido" };
    }

    // Verificar si ya existe solicitud pendiente
    const [existingSolicitud] = await pool.query(
      `SELECT 1 FROM solicitud 
       WHERE id_usuario = ? AND id_proyecto = ? AND estado = "Pendiente"`,
      [id_usuario, id_proyecto],
    );

    if (existingSolicitud.length) {
      return { status: 409, data: null, message: "Ya existe solicitud pendiente" };
    }

    // Verificar si ya es miembro
    const [eqRows] = await pool.query(
      "SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = ? LIMIT 1",
      [id_proyecto],
    );

    if (eqRows.length) {
      const [isMember] = await pool.query(
        `SELECT 1 FROM usuario_equipo_proyecto 
         WHERE id_usuario = ? AND id_equipo_proyecto = ?`,
        [id_usuario, eqRows[0].id_equipo_proyecto],
      );

      if (isMember.length) {
        return { status: 409, data: null, message: "Ya pertenece al proyecto" };
      }
    }

    const [rolInfo] = await pool.query(
      "SELECT nombre_rol FROM rol WHERE id_rol = ?",
      [id_rol],
    );
    const nombreRol = rolInfo.length ? rolInfo[0].nombre_rol : "Developer";

    const [aprobadorInfo] = await pool.query(
      "SELECT nombre FROM usuario WHERE id_usuario = ?",
      [id_usuario_aprobador],
    );
    const nombreAprobador = aprobadorInfo.length ? aprobadorInfo[0].nombre : "Admin";

    // Crear solicitud de invitación (tipo de invitación)
    const [result] = await pool.query(
      `INSERT INTO solicitud (id_usuario, id_proyecto, id_usuario_creador, estado, id_rol, mensaje_opcional)
       VALUES (?, ?, ?, "Pendiente", ?, ?)`,
      [
        id_usuario,
        id_proyecto,
        id_usuario_aprobador,
        id_rol,
        `Solicitante: ${nombreAprobador}; Rol: ${nombreRol}`,
      ],
    );

    // Obtener info del proyecto
    const [proyInfo] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [id_proyecto],
    );
    const nombreProyecto = proyInfo.length ? proyInfo[0].nombre : "un proyecto";

    // Crear notificación para el usuario invitado
    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud)
       VALUES (?, 'prioritaria', 'Invitación a proyecto', ?, ?)`,
      [
        id_usuario,
        `Has recibido una invitación al proyecto "${nombreProyecto}"`,
        result.insertId,
      ],
    );

    logSolicitud("invitacion_proyecto_enviada", {
      id_usuario_aprobador,
      id_usuario,
      id_proyecto,
      id_rol,
    });

    return { status: 201, data: null, message: "Invitación enviada" };
  },
};

export default solicitudService;
