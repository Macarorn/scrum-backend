import pool from './database.js';
import notificacionesService from '../services/notificaciones.service.js';

/**
 * Scheduler que verifica diariamente los sprints que finalizan al día siguiente
 * y envía notificaciones a los miembros del proyecto
 */
export const iniciarSchedulerSprint = () => {
  console.log('📅 Scheduler de notificaciones de sprint iniciado');
  
  // Verificar inmediatamente al iniciar
  verificarSprintsPorFinalizar();
  
  // Luego verificar cada hora
  setInterval(() => {
    verificarSprintsPorFinalizar();
  }, 60 * 60 * 1000); // Cada hora
};

/**
 * Verifica los sprints que finalizan mañana y envía notificaciones
 */
async function verificarSprintsPorFinalizar() {
  try {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const mananaStr = manana.toISOString().split('T')[0];

    // Buscar sprints que finalizan mañana y están en curso
    const [sprints] = await pool.query(
      `SELECT s.id_sprint, s.nombre, s.fecha_fin, s.estado, p.id_proyecto, p.nombre as nombre_proyecto
       FROM sprint s
       JOIN proyecto p ON s.id_proyecto = p.id_proyecto
       WHERE DATE(s.fecha_fin) = ? AND s.estado = 'en_curso'`,
      [mananaStr]
    );

    if (sprints.length > 0) {
      console.log(`📅 Encontrados ${sprints.length} sprint(s) por finalizar mañana`);
    }

    for (const sprint of sprints) {
      await notificacionesService.notificarSprintFinalizaManana(
        sprint.id_proyecto,
        sprint.nombre_proyecto,
        sprint.nombre
      );
      console.log(`✅ Notificación enviada para sprint: ${sprint.nombre}`);
    }
  } catch (error) {
    console.error('❌ Error en scheduler de notificaciones de sprint:', error);
  }
}

export default { iniciarSchedulerSprint };