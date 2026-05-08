import pool from "../utils/database.js";

async function esAprobador(userId, idProyecto) {
  const [proy] = await pool.query(
    "SELECT creado_por FROM proyecto WHERE id_proyecto = ?",
    [idProyecto]
  );

  if (proy.length && proy[0].creado_por === userId) return true;

  const [rows] = await pool.query(
    `
    SELECT 1 FROM usuario_equipo_proyecto uep
    JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
    WHERE ep.id_proyecto = ? AND uep.id_usuario = ? AND uep.id_rol IN (1,2)
  `,
    [idProyecto, userId]
  );

  return rows.length > 0;
}

// =============================
// VALIDAR PROYECTO ACTIVO
// =============================
async function proyectoActivo(idProyecto) {
  const [rows] = await pool.query(
    "SELECT estado FROM proyecto WHERE id_proyecto = ?",
    [idProyecto]
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
      [id_usuario, id_proyecto]
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
      [id_proyecto, id_usuario]
    );

    if (equipo.length > 0) {
      return { status: 409, data: null, message: "Ya eres miembro" };
    }

    const [pend] = await pool.query(
      `SELECT 1 FROM solicitud 
       WHERE id_usuario = ? AND id_proyecto = ? AND estado = 'Pendiente'`,
      [id_usuario, id_proyecto]
    );

    if (pend.length > 0) {
      return { status: 409, data: null, message: "Solicitud duplicada" };
    }

    const [result] = await pool.query(
      `INSERT INTO solicitud (id_usuario, id_proyecto, estado, mensaje_opcional)
       VALUES (?, ?, 'Pendiente', ?)`,
      [id_usuario, id_proyecto, mensaje_opcional || null]
    );

    // Obtener info del proyecto para la notificación
    const [proy] = await pool.query(
      "SELECT nombre, creado_por FROM proyecto WHERE id_proyecto = ?",
      [id_proyecto]
    );

    if (proy.length) {
      // Notificar al Product Owner (creador del proyecto)
      await pool.query(
        `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud)
         VALUES (?, 'prioritaria', 'Nueva solicitud de ingreso', ?, ?)`,
        [
          proy[0].creado_por,
          `Un usuario ha solicitado unirse al proyecto "${proy[0].nombre}"`,
          result.insertId
        ]
      );
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
      [id_usuario]
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
      [id_solicitud]
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
    if (!(await esAprobador(id_usuario, proyecto))) {
      return { status: 403, data: null, message: "Sin permisos" };
    }

    const [rows] = await pool.query(
      `SELECT s.*, p.nombre AS nombre_proyecto, p.codigo_proyecto, u.nombre AS nombre_usuario_solicitante
       FROM solicitud s
       JOIN proyecto p ON s.id_proyecto = p.id_proyecto
       JOIN usuario u ON s.id_usuario = u.id_usuario
       WHERE s.id_proyecto = ? AND s.estado = 'Pendiente'
       ORDER BY s.fecha_creacion ASC`,
      [proyecto]
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
      [id_usuario]
    );

    return { status: 200, data: rows, message: "Mis solicitudes pendientes" };
  },

  // =============================
  // APROBAR (FIXED)
  // =============================
  async aprobarSolicitud({ id_usuario_aprobador, id_solicitud, id_rol }) {
    const [solRows] = await pool.query(
      "SELECT * FROM solicitud WHERE id_solicitud = ?",
      [id_solicitud]
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

    if (!(await esAprobador(id_usuario_aprobador, solicitud.id_proyecto))) {
      return { status: 403, data: null, message: "Sin permisos" };
    }

    const [eqRows] = await pool.query(
      "SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = ? LIMIT 1",
      [solicitud.id_proyecto]
    );

    const id_equipo_proyecto = eqRows.length
      ? eqRows[0].id_equipo_proyecto
      : (
          await pool.query(
            "INSERT INTO equipo_proyecto (id_proyecto, nombre) VALUES (?, ?)",
            [solicitud.id_proyecto, "Equipo"]
          )
        )[0].insertId;

    const [exists] = await pool.query(
      `SELECT 1 FROM usuario_equipo_proyecto 
       WHERE id_usuario = ? AND id_equipo_proyecto = ?`,
      [solicitud.id_usuario, id_equipo_proyecto]
    );

    if (!exists.length) {
      await pool.query(
        `INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol)
         VALUES (?, ?, ?)`,
        [solicitud.id_usuario, id_equipo_proyecto, id_rol]
      );
    }

    await pool.query(
      `UPDATE solicitud SET estado = "Aprobada" WHERE id_solicitud = ?`,
      [id_solicitud]
    );

    // Obtener info del proyecto para la notificación
    const [proyInfo] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [solicitud.id_proyecto]
    );
    const nombreProyecto = proyInfo.length ? proyInfo[0].nombre : "un proyecto";

    // Notificar al usuario que solicitó
    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje)
       VALUES (?, 'informativa', 'Solicitud aprobada', ?)`,
      [
        solicitud.id_usuario,
        `Tu solicitud para unirte a "${nombreProyecto}" ha sido aprobada`,
      ]
    );

    return { status: 200, data: null, message: "Solicitud aprobada" };
  },

  // =============================
  // RECHAZAR (FIXED)
  // =============================
  async rechazarSolicitud({ id_usuario_aprobador, id_solicitud, motivo }) {
    const [solRows] = await pool.query(
      "SELECT * FROM solicitud WHERE id_solicitud = ?",
      [id_solicitud]
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

    if (!(await esAprobador(id_usuario_aprobador, solicitud.id_proyecto))) {
      return { status: 403, data: null, message: "Sin permisos" };
    }

    await pool.query(
      `UPDATE solicitud 
       SET estado = "Rechazada", motivo = ? 
       WHERE id_solicitud = ?`,
      [motivo || null, id_solicitud]
    );

    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje)
       VALUES (?, 'informativa', 'Solicitud rechazada', ?)`,
      [
        solicitud.id_usuario,
        `Tu solicitud fue rechazada. Motivo: ${motivo || "No especificado"}`,
      ]
    );

    return { status: 200, data: null, message: "Solicitud rechazada" };
  },

  // =============================
  // CANCELAR (MEJORADO)
  // =============================
  async cancelarSolicitud({ id_usuario, id_solicitud }) {
    const [rows] = await pool.query(
      `SELECT * FROM solicitud WHERE id_solicitud = ?`,
      [id_solicitud]
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
       SET estado = "Cancelada" 
       WHERE id_solicitud = ?`,
      [id_solicitud]
    );

    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje)
       VALUES (?, 'informativa', 'Solicitud cancelada',
       'Has cancelado tu solicitud al proyecto')`,
      [id_usuario]
    );

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
      [id_proyecto]
    );

    if (!eqRows.length) {
      return { status: 404, data: null, message: "Proyecto sin equipo" };
    }

    const [exists] = await pool.query(
      `SELECT 1 FROM usuario_equipo_proyecto 
       WHERE id_usuario = ? AND id_equipo_proyecto = ?`,
      [id_usuario, eqRows[0].id_equipo_proyecto]
    );

    if (exists.length) {
      return { status: 409, data: null, message: "Ya pertenece al equipo" };
    }

    await pool.query(
      `INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol)
       VALUES (?, ?, ?)`,
      [id_usuario, eqRows[0].id_equipo_proyecto, id_rol]
    );

    // Obtener info del proyecto para la notificación
    const [proyInfo] = await pool.query(
      "SELECT nombre FROM proyecto WHERE id_proyecto = ?",
      [id_proyecto]
    );
    const nombreProyecto = proyInfo.length ? proyInfo[0].nombre : "un proyecto";

    // Notificar al usuario invitado
    await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje)
       VALUES (?, 'prioritaria', 'Invitación a proyecto', ?)`,
      [
        id_usuario,
        `Has sido invitado a unirte al proyecto "${nombreProyecto}"`,
      ]
    );

    return { status: 201, data: null, message: "Usuario invitado" };
  },
};

export default solicitudService;
