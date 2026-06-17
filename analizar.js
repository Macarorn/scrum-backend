import { GoogleGenAI } from '@google/genai';
import { createInterface } from 'readline';
import pool from './src/utils/database.js';

// ─── Configuración ───
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ID_PROYECTO = 1; // Cambia este número si quieres analizar otro proyecto

// ─── Obtener métricas reales de la BD ───
async function obtenerMetricas() {
  const query = `
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
  `;
  const [rows] = await pool.query(query, [ID_PROYECTO]);
  return rows.map(r => ({
    tarea: r.tarea,
    diasPlanificados: r.diasPlanificados || 0,
    diasReales: r.diasReales || 0,
    estado: r.estado,
    prioridad: r.prioridad,
    responsable: r.responsable || 'Sin asignar'
  }));
}

// ─── Chat interactivo ───
async function iniciarChat() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║         CHAT DE ANÁLISIS CON IA (Gemini)               ║");
  console.log("║   Escribe tu pregunta y presiona Enter.                ║");
  console.log("║   Escribe 'salir' para terminar.                       ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // 1. Cargar las métricas una sola vez al iniciar
  console.log(" Cargando métricas del proyecto desde la base de datos...");
  let metricas;
  try {
    metricas = await obtenerMetricas();
  } catch (err) {
    console.error(" Error al conectar con la base de datos:", err.message);
    process.exit(1);
  }
  console.log(` ${metricas.length} tareas cargadas. ¡Listo para conversar!\n`);

  // 2. Preparar la interfaz de lectura (el "chat")
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const contexto = `
Eres un asistente experto en gestión de proyectos Scrum y metodologías ágiles.
Tienes acceso a los datos reales de un proyecto. Responde siempre en español.
Usa formato Markdown con negritas y listas para que sea fácil de leer.

=== DATOS DEL PROYECTO (MÉTRICAS REALES) ===
${JSON.stringify(metricas, null, 2)}
  `;

  // 3. Bucle de preguntas
  const preguntar = () => {
    rl.question(" Tú: ", async (input) => {
      const pregunta = input.trim();

      if (!pregunta) {
        preguntar();
        return;
      }

      if (pregunta.toLowerCase() === "salir") {
        console.log("\n ¡Hasta luego! Cerrando el chat...");
        rl.close();
        await pool.end();
        process.exit(0);
      }

      try {
        console.log("\n Pensando...\n");

        const prompt = `${contexto}\n\n=== PREGUNTA DEL USUARIO ===\n${pregunta}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        console.log(" IA:");
        console.log("─────────────────────────────────────────");
        console.log(response.text);
        console.log("─────────────────────────────────────────\n");

      } catch (error) {
        console.error(" Error al conectar con la IA:", error.message, "\n");
      }

      // Siguiente pregunta
      preguntar();
    });
  };

  preguntar();
}

// Ejecutar
iniciarChat();
