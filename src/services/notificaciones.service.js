import pool from '../utils/database.js';

const notificacionesService = {
  async listarNotificaciones({ id_usuario }) {
    const [rows] = await pool.query(
      `SELECT n.*, u.nombre AS nombre_usuario_solicitante
       FROM notificacion n
       LEFT JOIN solicitud s ON n.id_solicitud = s.id_solicitud
       LEFT JOIN usuario u ON s.id_usuario = u.id_usuario
       WHERE n.id_usuario = ?
       ORDER BY n.fecha_creacion DESC`,
      [id_usuario]
    );
    return { status: 200, data: rows, message: "Notificaciones del usuario" };
  },

  async marcarComoLeida({ id_usuario, id_notificacion }) {
    const [result] = await pool.query(
      `UPDATE notificacion SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?`,
      [id_notificacion, id_usuario]
    );

    if (result.affectedRows === 0) {
      return {
        status: 404,
        data: null,
        message: "Notificación no encontrada o no autorizada",
      };
    }
    return { status: 200, data: null, message: 'Notificación marcada como leída' };
  }
};


export const sendNotificationToTeam = async ({ teamId, message, type }) => {
  if (!teamId || !message || !type) {
    throw new Error("Datos incompletos");
  }

  console.log(` [${type}] Equipo ${teamId}: ${message}`);

  await pool.query(
    `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje)
     SELECT uep.id_usuario, ?, ?, ?
     FROM usuario_equipo_proyecto uep
     WHERE uep.id_equipo_proyecto = ?`,
    [type, "Notificación del sistema", message, teamId]
  );

  return {
    success: true,
    message: "Notificación enviada correctamente",
    data: { teamId, message, type }
  };
};

export default notificacionesService;