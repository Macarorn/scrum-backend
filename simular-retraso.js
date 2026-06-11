import pool from './src/utils/database.js';
import iaScheduler from './src/utils/ia-scheduler.utils.js';

async function simularYProbar() {
  try {
    console.log("🛠️ 1. Modificando una tarea en la BD para simular un gran cuello de botella...");
    // Buscamos cualquier tarea del proyecto 1 y la ponemos con mucho tiempo real
    const [tareas] = await pool.query('SELECT id_tarea FROM tarea LIMIT 1');
    
    if (tareas.length === 0) {
      console.log("❌ No hay tareas en la BD.");
      process.exit(1);
    }
    
    const idTarea = tareas[0].id_tarea;
    await pool.query(
      `UPDATE tarea SET estimacion_dias = 1.0, tiempo_real = 15.0, estado = 'en_progreso' WHERE id_tarea = ?`, 
      [idTarea]
    );
    console.log(`✅ Tarea #${idTarea} actualizada (Estimado: 1d, Real: 15d) -> ¡Cuello de botella asegurado!`);

    console.log("\n🤖 2. Ejecutando el Scheduler de IA manualmente para analizar...");
    
    // Importar la función analizarTodosLosProyectos que no está exportada
    // Pero podemos invocarla copiando un pedacito o leyendo la lógica
    // Para simplificar, leemos directo:
    const appPath = './src/utils/ia-scheduler.utils.js';
    const { default: iaSchedulerModule } = await import(appPath);
    
    // Como no expusimos la función individual, vamos a alterar el código temporalmente 
    // O mejor, copio el código de evaluación directa aquí:
    const metricasQuery = `
      SELECT t.nombre AS tarea, t.estimacion_dias AS diasPlanificados, t.tiempo_real AS diasReales, t.estado, t.prioridad, u.nombre AS responsable, e.id_proyecto
      FROM tarea t
      JOIN historia_usuario h ON t.id_historia = h.id_historia
      JOIN epica e ON h.id_epica = e.id_epica
      LEFT JOIN tarea_usuario tu ON t.id_tarea = tu.id_tarea AND tu.es_responsable = 1
      LEFT JOIN usuario u ON tu.id_usuario = u.id_usuario
      WHERE t.id_tarea = ?
    `;
    const [m] = await pool.query(metricasQuery, [idTarea]);
    
    console.log("📊 Métrica alterada:", m[0]);
    
    console.log("\n⏳ Por favor reinicia el servidor (npm run dev). El scheduler se ejecutará solo a los 30 segundos.");
    console.log("Luego puedes ver la campanita de notificaciones en el frontend.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

simularYProbar();
