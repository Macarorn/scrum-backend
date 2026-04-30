import pool from '../utils/database.js';

const notificacionesService = {
  // Obtener miembros de un proyecto
  async obtenerMiembrosProyecto(id_proyecto) {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email
       FROM usuario u
       JOIN usuario_equipo_proyecto uep ON u.id_usuario = uep.id_usuario
       JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
       WHERE ep.id_proyecto = ? AND uep.activo = 1`,
      [id_proyecto]
    );
    return rows;
  },

  // Crear notificación para un usuario
  async crearNotificacion({ id_usuario, tipo, titulo, mensaje, id_solicitud = null }) {
    const [result] = await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, id_solicitud)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, tipo, titulo, mensaje, id_solicitud]
    );
    return result.insertId;
  },

  // Notificar a todos los miembros de un proyecto
  async notificarMiembrosProyecto(id_proyecto, tipo, titulo, mensaje, excluir_usuario = null) {
    const miembros = await this.obtenerMiembrosProyecto(id_proyecto);
    const resultados = [];
    
    for (const miembro of miembros) {
      // Excluir al usuario que originó la acción si se especifica
      if (excluir_usuario && miembro.id_usuario === excluir_usuario) {
        continue;
      }
      const id_notificacion = await this.crearNotificacion({
        id_usuario: miembro.id_usuario,
        tipo,
        titulo,
        mensaje
      });
      resultados.push({ id_usuario: miembro.id_usuario, id_notificacion });
    }
    return resultados;
  },

  // Notificar cambio de estado de proyecto
  async notificarCambioEstadoProyecto(id_proyecto, nombre_proyecto, nuevo_estado, excluir_usuario = null) {
    const titulo = 'Cambio de estado del proyecto';
    const mensaje = `El proyecto "${nombre_proyecto}" ha cambiado a estado: ${nuevo_estado}`;
    return this.notificarMiembrosProyecto(id_proyecto, 'informativa', titulo, mensaje, excluir_usuario);
  },

  // Notificar nuevo sprint creado
  async notificarNuevoSprint(id_proyecto, nombre_proyecto, nombre_sprint, excluir_usuario = null) {
    const titulo = 'Nuevo Sprint creado';
    const mensaje = `Se ha creado el Sprint "${nombre_sprint}" en el proyecto "${nombre_proyecto}"`;
    return this.notificarMiembrosProyecto(id_proyecto, 'informativa', titulo, mensaje, excluir_usuario);
  },

  // Notificar inicio de sprint
  async notificarInicioSprint(id_proyecto, nombre_proyecto, nombre_sprint, dias_restantes, excluir_usuario = null) {
    const titulo = 'Sprint iniciado';
    const mensaje = `El Sprint "${nombre_sprint}" ha comenzado. Tienes ${dias_restantes} días para completarlo`;
    return this.notificarMiembrosProyecto(id_proyecto, 'recordatorio', titulo, mensaje, excluir_usuario);
  },

  // Notificar que sprint finaliza mañana
  async notificarSprintFinalizaManana(id_proyecto, nombre_proyecto, nombre_sprint, excluir_usuario = null) {
    const titulo = 'Sprint por finalizar';
    const mensaje = `El Sprint "${nombre_sprint}" finaliza mañana. Revisa tus tareas pendientes`;
    return this.notificarMiembrosProyecto(id_proyecto, 'urgente', titulo, mensaje, excluir_usuario);
  },

  // Notificar sprint completado
  async notificarSprintCompletado(id_proyecto, nombre_proyecto, nombre_sprint, excluir_usuario = null) {
    const titulo = 'Sprint completado';
    const mensaje = `El Sprint "${nombre_sprint}" del proyecto "${nombre_proyecto}" ha sido completado`;
    return this.notificarMiembrosProyecto(id_proyecto, 'informativa', titulo, mensaje, excluir_usuario);
  },

  // Notificar nuevo miembro en proyecto
  async notificarNuevoMiembro(id_proyecto, nombre_proyecto, nombre_usuario, excluir_usuario = null) {
    const titulo = 'Nuevo miembro en el proyecto';
    const mensaje = `El usuario "${nombre_usuario}" se ha unido al proyecto "${nombre_proyecto}"`;
    return this.notificarMiembrosProyecto(id_proyecto, 'informativa', titulo, mensaje, excluir_usuario);
  },

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
    return { status: 200, data: rows, message: 'Notificaciones del usuario' };
  },

  async marcarComoLeida({ id_usuario, id_notificacion }) {
    const [result] = await pool.query(
      `UPDATE notificacion SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?`,
      [id_notificacion, id_usuario]
    );
    if (result.affectedRows === 0) {
      return { status: 404, data: null, message: 'Notificación no encontrada o no autorizada' };
    }
    return { status: 200, data: null, message: 'Notificación marcada como leída' };
  }
};

export default notificacionesService;
