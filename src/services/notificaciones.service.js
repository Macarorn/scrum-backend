import pool from "../utils/database.js";

const notificacionesService = {
  async listarNotificaciones({ id_usuario }) {
    const [rows] = await pool.query(
      `SELECT n.*, u.nombre AS nombre_usuario_solicitante, p.nombre AS nombre_proyecto, s.estado AS estado_solicitud
       FROM notificacion n
       LEFT JOIN solicitud s ON n.id_solicitud = s.id_solicitud
       LEFT JOIN usuario u ON s.id_usuario = u.id_usuario
       LEFT JOIN proyecto p ON s.id_proyecto = p.id_proyecto
       WHERE n.id_usuario = ?
       ORDER BY n.fecha_creacion DESC`,
      [id_usuario],
    );
    return { status: 200, data: rows, message: "Notificaciones del usuario" };
  },

  async marcarComoLeida({ id_usuario, id_notificacion }) {
    const [result] = await pool.query(
      `UPDATE notificacion SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?`,
      [id_notificacion, id_usuario],
    );
    if (result.affectedRows === 0) {
      return {
        status: 404,
        data: null,
        message: "Notificación no encontrada o no autorizada",
      };
    }
    return {
      status: 200,
      data: null,
      message: "Notificación marcada como leída",
    };
  },
};

export default notificacionesService;
