import { generarAnalisisIA } from './src/services/ai.service.js';
import { obtenerMetricasProyecto } from './src/services/metricas.service.js';

// ID del proyecto por defecto para la demostración (puedes cambiarlo aquí)
const ID_PROYECTO_DEMO = 1; 

async function ejecutarDemo() {
  try {
    // 1. Obtener el prompt que escribiste en la terminal
    // process.argv[2] contiene lo que va después de "node analizar-cli.js"
    const customPrompt = process.argv.slice(2).join(" ");
    
    if (!customPrompt) {
      console.log("❌ Debes escribir un prompt.");
      console.log('Ejemplo: node analizar-cli.js "Dime qué tareas están más atrasadas"');
      process.exit(1);
    }

    console.log(`\n⏳ Obteniendo métricas reales del proyecto #${ID_PROYECTO_DEMO} de la base de datos...`);
    const metricas = await obtenerMetricasProyecto(ID_PROYECTO_DEMO);
    
    if (!metricas || metricas.length === 0) {
      console.log("❌ No se encontraron tareas para este proyecto.");
      process.exit(1);
    }
    
    console.log(`✅ Se obtuvieron ${metricas.length} tareas. Conectando con Gemini...\n`);

    // 2. Unir tu prompt con los datos de la base de datos
    const promptCompleto = `${customPrompt}\n\n=== DATOS DEL PROYECTO (MÉTRICAS) ===\n${JSON.stringify(metricas, null, 2)}`;

    // 3. Generar la respuesta usando nuestro servicio (que ya tiene tu API key configurada)
    const analisis = await generarAnalisisIA(promptCompleto);

    // 4. Mostrar el resultado
    console.log("==========================================");
    console.log("🤖 RESPUESTA DE LA IA:");
    console.log("==========================================\n");
    console.log(analisis);
    console.log("\n==========================================");

    // Salir para que la terminal no se quede pegada por la conexión a la base de datos
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Hubo un error:", error.message);
    process.exit(1);
  }
}

// Ejecutar
ejecutarDemo();
