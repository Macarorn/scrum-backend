import pool from './database.js';
import notificacionesService from '../services/notificaciones.service.js';
import { generarAnalisisIA } from '../services/ai.service.js';
import { generarPromptAlertasProyecto } from './ai-alertas-prompt.js';

/**
 * Scheduler que revisa periódicamente las métricas de todos los proyectos activos
 * usando la IA, y envía notificaciones al Scrum Master, responsable y asignados
 * cuando detecta cuellos de botella, estancamientos o retrasos.
 */
export const iniciarSchedulerIA = () => {
  console.log('[IA] Scheduler de análisis con IA iniciado');

  // Primera ejecución a los 30 segundos de arrancar el servidor (para no saturar al inicio)
  setTimeout(() => {
    analizarTodosLosProyectos();
  }, 30000);

  // Luego ejecutar cada 6 horas
  setInterval(() => {
    analizarTodosLosProyectos();
  }, 6 * 60 * 60 * 1000);
};

/**
 * Obtiene todos los proyectos activos y lanza el análisis de IA en cada uno.
 */
async function analizarTodosLosProyectos() {
  try {
    console.log('[IA Scheduler] Iniciando análisis de proyectos...');

    const [proyectos] = await pool.query(
      `SELECT id_proyecto, nombre FROM proyecto WHERE estado = 'activo'`
    );

    if (proyectos.length === 0) {
      console.log('[IA Scheduler] No hay proyectos activos para analizar.');
      return;
    }

    for (const proyecto of proyectos) {
      try {
        await analizarProyecto(proyecto);
      } catch (err) {
        console.error(`[IA Scheduler] Error analizando proyecto ${proyecto.nombre}:`, err.message);
      }
    }

    console.log('[IA Scheduler] Análisis completado.');
  } catch (error) {
    console.error('[IA Scheduler] Error general:', error.message);
  }
}

/**
 * Analiza un proyecto individual: obtiene métricas, consulta a Gemini,
 * y envía notificaciones si hay alertas.
 */
async function analizarProyecto(proyecto) {
  // 1. Obtener métricas del proyecto
  const metricas = await obtenerMetricasCompletas(proyecto.id_proyecto);

  if (!metricas || metricas.length === 0) {
    return; // Sin tareas, nada que analizar
  }

  // 2. Generar el prompt y consultar a la IA
  const prompt = generarPromptAlertasProyecto(metricas, proyecto.nombre);
  const respuestaIA = await generarAnalisisIA(prompt);

  // 3. Parsear la respuesta JSON de la IA
  let resultado;
  try {
    // Limpiar posibles backticks o texto extra que la IA pueda añadir
    const jsonLimpio = respuestaIA.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    resultado = JSON.parse(jsonLimpio);
  } catch (e) {
    console.warn(`[IA Scheduler] La IA no devolvió JSON válido para "${proyecto.nombre}". Respuesta:`, respuestaIA.substring(0, 200));
    return;
  }

  // 4. Si hay alertas, enviar notificaciones
  if (!resultado.alertas || resultado.alertas.length === 0) {
    console.log(`[IA Scheduler] "${proyecto.nombre}": Sin problemas detectados`);
    return;
  }

  console.log(`[IA Scheduler] "${proyecto.nombre}": ${resultado.alertas.length} alerta(s) detectada(s)`);

  // 5. Obtener Scrum Master y personas involucradas del proyecto
  const scrumMasters = await obtenerScrumMasters(proyecto.id_proyecto);
  
  for (const alerta of resultado.alertas) {
    const tipoNotif = 'alerta_ia';
    const titulo = formatearTipoAlerta(alerta.tipo);
    const mensaje = `Proyecto ${proyecto.nombre} — La tarea ${alerta.tarea} presenta un problema: ${alerta.mensaje}. Responsable asignado: ${alerta.responsable}`;

    // Notificar al Scrum Master
    for (const sm of scrumMasters) {
      await notificacionesService.crearNotificacion({
        id_usuario: sm.id_usuario,
        tipo: tipoNotif,
        titulo,
        mensaje,
        id_proyecto: proyecto.id_proyecto,
        accion: 'alerta_ia'
      });
    }

    // Notificar al responsable de la tarea (si existe en el sistema)
    if (alerta.responsable && alerta.responsable !== 'Sin asignar') {
      const responsables = await buscarUsuarioPorNombre(alerta.responsable, proyecto.id_proyecto);
      for (const resp of responsables) {
        // Evitar duplicar si ya es Scrum Master
        const yaNotificado = scrumMasters.some(sm => sm.id_usuario === resp.id_usuario);
        if (!yaNotificado) {
          await notificacionesService.crearNotificacion({
            id_usuario: resp.id_usuario,
            tipo: tipoNotif,
            titulo,
            mensaje,
            id_proyecto: proyecto.id_proyecto,
            accion: 'alerta_ia'
          });
        }
      }
    }
  }
}

// ─── Funciones auxiliares ───

async function obtenerMetricasCompletas(idProyecto) {
  const [rows] = await pool.query(`
    SELECT 
      t.nombre AS tarea,
      t.estimacion_dias AS diasPlanificados,
      t.tiempo_real AS diasReales,
      t.estado,
      t.prioridad,
      u.nombre AS responsable
    FROM tarea t
    JOIN historia_usuario h ON t.id_historia = h.id_historia
    JOIN epica e ON h.id_epica = e.id_epica
    LEFT JOIN tarea_usuario tu ON t.id_tarea = tu.id_tarea AND tu.es_responsable = 1
    LEFT JOIN usuario u ON tu.id_usuario = u.id_usuario
    WHERE e.id_proyecto = ?
  `, [idProyecto]);

  return rows.map(r => ({
    tarea: r.tarea,
    diasPlanificados: Number(r.diasPlanificados) || 0,
    diasReales: Number(r.diasReales) || 0,
    estado: r.estado,
    prioridad: r.prioridad,
    responsable: r.responsable || 'Sin asignar'
  }));
}

async function obtenerScrumMasters(idProyecto) {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.nombre
    FROM usuario u
    JOIN usuario_equipo_proyecto uep ON u.id_usuario = uep.id_usuario
    JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
    JOIN rol r ON uep.id_rol = r.id_rol
    WHERE ep.id_proyecto = ? 
      AND uep.activo = 1
      AND LOWER(r.nombre_rol) IN ('scrum master', 'product owner')
  `, [idProyecto]);
  return rows;
}

async function buscarUsuarioPorNombre(nombre, idProyecto) {
  const [rows] = await pool.query(`
    SELECT u.id_usuario
    FROM usuario u
    JOIN usuario_equipo_proyecto uep ON u.id_usuario = uep.id_usuario
    JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
    WHERE ep.id_proyecto = ? AND u.nombre = ? AND uep.activo = 1
  `, [idProyecto, nombre]);
  return rows;
}

function formatearTipoAlerta(tipo) {
  const map = {
    cuello_de_botella: 'Cuello de Botella detectado',
    estancamiento: 'Tarea estancada',
    sobrecarga: 'Sobrecarga de trabajo',
    retraso_critico: 'Retraso crítico',
  };
  return map[tipo] || 'Alerta detectada';
}

export default { iniciarSchedulerIA };
