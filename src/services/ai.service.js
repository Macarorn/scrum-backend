import pool from "../utils/database.js";

export const generateAIResponse = async (userId, userMessage, history = [], res = null) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("La API Key de Gemini no está configurada en el servidor.");
    }

    // Obtener información relevante de la base de datos para el contexto
    // 0. Verificar el rol del usuario para saber si es coordinador/admin
    const [userRows] = await pool.query(
      `SELECT rol_plataforma FROM usuario WHERE id_usuario = ?`,
      [userId]
    );
    
    const rolPlataforma = userRows.length > 0 ? userRows[0].rol_plataforma : null;
    const esGlobal = rolPlataforma === 'coordinador' || rolPlataforma === 'admin';

    // 1. Proyectos (Todos si es global, o solo asignados si es regular)
    let proyectos = [];
    if (esGlobal) {
      const [rows] = await pool.query(
        `SELECT id_proyecto, nombre, codigo_proyecto, descripcion, estado FROM proyecto`
      );
      proyectos = rows;
    } else {
      const [rows] = await pool.query(
        `SELECT p.id_proyecto, p.nombre, p.codigo_proyecto, p.descripcion, p.estado 
         FROM proyecto p
         JOIN equipo_proyecto ep ON p.id_proyecto = ep.id_proyecto
         JOIN usuario_equipo_proyecto uep ON ep.id_equipo_proyecto = uep.id_equipo_proyecto
         WHERE uep.id_usuario = ? AND uep.activo = 1`,
        [userId]
      );
      proyectos = rows;
    }

    // Si no hay proyectos, devolver un contexto básico
    if (proyectos.length === 0) {
      return JSON.stringify({ mensaje: "El usuario no tiene proyectos asignados actualmente." });
    }

    const proyectosIds = proyectos.map(p => p.id_proyecto);
    const idsParam = proyectosIds.length ? proyectosIds : [0];

    // Ejecutar TODAS las consultas restantes en PARALELO para máxima velocidad
    const [miembrosRows, [epicas], [sprints], [tareas], asignaciones] = await Promise.all([
      pool.query(
        `SELECT ep.id_proyecto, u.nombre AS nombre_usuario, r.nombre_rol 
         FROM usuario_equipo_proyecto uep
         JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
         JOIN usuario u ON uep.id_usuario = u.id_usuario
         JOIN rol r ON uep.id_rol = r.id_rol
         WHERE ep.id_proyecto IN (?) AND uep.activo = 1`,
        [idsParam]
      ).then(([rows]) => rows),
      pool.query(
        `SELECT id_epica, id_proyecto, nombre, estado, prioridad 
         FROM epica WHERE id_proyecto IN (?)`,
        [idsParam]
      ),
      pool.query(
        `SELECT id_sprint, id_proyecto, nombre, estado, fecha_inicio, fecha_fin 
         FROM sprint WHERE id_proyecto IN (?)`,
        [idsParam]
      ),
      pool.query(
        `SELECT t.id_tarea, t.id_historia, t.nombre, t.estado, t.prioridad, 
                t.fecha_inicio, t.fecha_fin_est
         FROM tarea t 
         JOIN historia_usuario hu ON t.id_historia = hu.id_historia
         JOIN epica e ON hu.id_epica = e.id_epica
         WHERE e.id_proyecto IN (?)`,
        [idsParam]
      ),
      pool.query(
        `SELECT tu.id_tarea, u.nombre, tu.es_responsable
         FROM tarea_usuario tu
         JOIN usuario u ON tu.id_usuario = u.id_usuario
         JOIN tarea t ON tu.id_tarea = t.id_tarea
         JOIN historia_usuario hu ON t.id_historia = hu.id_historia
         JOIN epica e ON hu.id_epica = e.id_epica
         WHERE e.id_proyecto IN (?)`,
        [idsParam]
      ).then(([rows]) => rows)
    ]);

    proyectos = proyectos.map(p => ({
      ...p,
      equipo: miembrosRows
        .filter(m => m.id_proyecto === p.id_proyecto)
        .map(m => ({ nombre: m.nombre_usuario, rol: m.nombre_rol }))
    }));

    const tareasConAsignaciones = tareas.map(t => ({
      ...t,
      asignados: asignaciones
        .filter(a => a.id_tarea === t.id_tarea)
        .map(a => a.nombre + (a.es_responsable ? " (Responsable)" : ""))
    }));

    // Construir el contexto en JSON
    const contexto = {
      fecha_actual: new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      proyectos,
      epicas,
      sprints,
      tareas: tareasConAsignaciones
    };

    // Construir el prompt RAG
    const systemPrompt = `
Eres un asistente virtual ejecutivo y experto en gestión de proyectos ágiles (Scrum). 
El usuario que te habla es un Coordinador del SENA (Servicio Nacional de Aprendizaje). Dirígete a esta persona de forma sumamente respetuosa, institucional, formal y profesional (trátalo de "usted", llámalo "Coordinador" y mantén una actitud de servicio).
A continuación, te proporciono el estado actual de la plataforma en formato JSON (proyectos, épicas, sprints y tareas). 

¡ATENCIÓN KANBAN Y GANTT!
1. **Diagrama de Gantt**: Las fechas de inicio y fin incluidas en los Sprints y Tareas son EXACTAMENTE los datos que alimentan el Diagrama de Gantt visual de la plataforma. Si te preguntan por el progreso según el "Gantt", usa estas fechas para calcular atrasos y tiempos. NUNCA digas que no tienes acceso al diagrama.
2. **Tablero Kanban**: El "Tablero Kanban" no es una tabla separada, es simplemente la visualización de las Tareas agrupadas por su "estado" (Por Hacer = todo, En Progreso = in_progress, Completado = done). Si preguntan por el Tablero Kanban, responde agrupando las tareas por estado. ¡No lo confundas con la Épica que se llama "Tablero Kanban"! NUNCA digas que no existe la tabla o vista Kanban.

CONTEXTO ACTUAL:
${JSON.stringify(contexto)}

INSTRUCCIONES ESTRICTAS DE FORMATO Y RESPUESTA:
1. **IDIOMA OBLIGATORIO**: RESPONDE SIEMPRE EN ESPAÑOL. NO escribas absolutamente nada en inglés. NO incluyas procesos de pensamiento, notas internas, ni frases como "Let me see" o "Wait". Escribe directamente la respuesta final.
2. Responde a la pregunta del usuario basándote ÚNICAMENTE en el contexto proporcionado.
3. Usa la "fecha_actual" del contexto para calcular con precisión qué sprints o tareas están retrasados.
4. Habla de forma natural como si fueras la plataforma misma.
5. Usa una estructura ESTRICTAMENTE PROFESIONAL, CORPORATIVA Y SOBRIA:
   - PROHIBIDO EL USO DE EMOJIS, ICONOS O SÍMBOLOS UNICODE (nada de círculos, pines, gráficas, etc.).
   - Aplica un diseño de "Etiquetas" (Badges) de alta visibilidad: Usa HTML puro para resaltar los estados con fondos de color, en lugar de subrayados.
     - Ejemplos obligatorios: 
     - <span style="background-color: #0d6efd; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Por Hacer</span> (Azul)
     - <span style="background-color: #ffc107; color: black; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">En Progreso</span> o <span style="background-color: #ffc107; color: black; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Advertencia</span> (Amarillo)
     - <span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Atrasado</span> o <span style="background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Crítico</span> (Rojo)
     - <span style="background-color: #198754; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Completado</span> o <span style="background-color: #198754; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">Al día</span> (Verde)
   - FORMATO DE LISTAS: Muestra toda la información usando ÚNICAMENTE listas con viñetas estándar (guiones). NUNCA generes tablas Markdown (el uso de columnas con el carácter | está estrictamente bloqueado).
   - NO USES TÍTULOS GRANDES (prohibido usar # o ## en Markdown). Si necesitas un encabezado, usa ### o simplemente texto en **negrita**.
   - Resalta los nombres de proyectos o datos importantes en **negrita**.
5. LENGUAJE CERCANO Y CERO TÉCNICO: Asume que la persona que te lee no sabe nada de Scrum. Evita usar jerga técnica de Agile sin contexto. Si mencionas "Sprints", descríbelo de forma natural como "ciclos de trabajo de 2 semanas"; si mencionas "Épicas", llámalas "grupos grandes de tareas" o "metas generales". Haz que todo sea fácil de entender.
6. **REGLA DE ORO DE SEGURIDAD - PROHIBICIÓN DE LENGUAJE TÉCNICO:** 
   - ESTÁ COMPLETAMENTE PROHIBIDO usar frases como "en la base de datos actual no existe", "según el JSON", "las tablas", "los archivos", "el sistema de almacenamiento" o "no disponemos de una vista". 
   - SIEMPRE asume que la información de Kanban es simplemente el estado de las tareas. 
   - MANTÉN LA ILUSIÓN de ser un asistente integrado. Si no tienes datos de algo, simplemente di "No hay tareas registradas en este estado actualmente".
7. **ROLES Y ENCARGADOS**: Si el usuario pregunta por el "encargado", "responsable" o "creador" de un proyecto, se refiere específicamente a la persona que tiene el rol de **"Product Owner"** en el equipo de ese proyecto. Búscalo en la lista del equipo y dáselo como respuesta. No listes a los desarrolladores a menos que te pidan el equipo completo.
8. **CÁLCULO DE RETRASOS POR PROYECTO**: Dado que los proyectos no tienen fechas globales explícitas en el JSON, si te preguntan qué proyecto está retrasado o próximo a finalizar, debes DEDUCIRLO obligatoriamente analizando las "fecha_fin" de los Sprints y Tareas que le pertenecen. NUNCA digas que no tienes esa información; haz el cruce de datos matemáticamente.
9. **BREVEDAD Y CONCISIÓN**: Tus respuestas deben ser extremadamente directas y resumidas. Evita introducciones largas o repeticiones innecesarias. Ve directamente a los datos solicitados.
10. **PREGUNTAS GENERALES**: Si el usuario pregunta algo general sin especificar un proyecto (por ejemplo, "dame los datos del Gantt"), NO pidas aclaraciones. Proporciona un resumen consolidado que incluya la información más relevante de TODOS los proyectos activos.

RECORDATORIO FINAL: Presenta los datos SIEMPRE en forma de listas de texto. BAJO NINGUNA CIRCUNSTANCIA generes una tabla Markdown con | y --.
`;

    // 6. Configurar proveedores de IA (Soporte nativo para Gemini, OpenRouter y Pollinations)
    const providers = [];

    // 1. Pollinations AI: 100% Gratis, sin llaves, sin límites estrictos
    providers.push({
      name: "Pollinations AI (Gratis/Ilimitado)",
      url: "https://text.pollinations.ai/openai/chat/completions",
      headers: {
        "Content-Type": "application/json"
      },
      models: ["openai", "mistral", "llama"]
    });

    // 2. Gemini (Si hay llave)
    if (process.env.GEMINI_API_KEY) {
      providers.push({
        name: "Google Gemini",
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        headers: {
          "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
          "Content-Type": "application/json"
        },
        models: ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"]
      });
    }

    if (process.env.OPENROUTER_API_KEY) {
      providers.push({
        name: "OpenRouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "Scrum Platform",
          "Content-Type": "application/json"
        },
        models: [
          "mistralai/mistral-7b-instruct:free",
          "meta-llama/llama-3.1-8b-instruct:free",
          "meta-llama/llama-3.3-70b-instruct:free",
          "openrouter/free"
        ]
      });
    }

    if (providers.length === 0) {
      throw new Error("No hay API KEY configurada para la IA.");
    }

    let result = null;
    let lastError = null;

    // Bucle de proveedores
    for (const provider of providers) {
      let providerRateLimited = false;

      // Bucle de modelos dentro del proveedor
      for (const modelName of provider.models) {
        if (providerRateLimited) break; // Si el proveedor está bloqueado por cuota, saltamos al siguiente

        try {
          const recentHistory = history.slice(-10);
          const formattedHistory = recentHistory.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.content
          }));

          const response = await fetch(provider.url, {
            method: "POST",
            headers: provider.headers,
            body: JSON.stringify({
              model: modelName,
              max_tokens: 4000,
              stream: res ? true : false,
              messages: [
                { role: "system", content: systemPrompt },
                ...formattedHistory,
                {
                  role: "system",
                  content: "REGLA CRÍTICA INQUEBRANTABLE: Ignora cualquier formato de respuestas anteriores en el historial. A partir de este momento, tienes ESTRICTAMENTE PROHIBIDO generar texto en inglés, procesos de pensamiento, o usar frases como 'Let me see'. Debes responder DIRECTAMENTE y ÚNICAMENTE con la respuesta final en español. Inicia tu respuesta directamente dirigiéndote al Coordinador."
                },
                { role: "user", content: userMessage }
              ]
            })
          });

          if (!response.ok) {
            if (response.status === 429) {
              lastError = new Error(`Has excedido el límite de cuota diaria en el servidor de ${provider.name}.`);
              providerRateLimited = true;
              throw lastError;
            }
            const errData = await response.json().catch(() => null);
            throw new Error(`Error ${response.status} en ${provider.name}: ${errData ? JSON.stringify(errData) : response.statusText}`);
          }

          if (res) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            for await (const chunk of response.body) {
              res.write(chunk);
            }
            res.end();
            return;
          }

          const data = await response.json();
          result = data.choices[0].message.content;
          return; // Salimos de la función completamente en modo síncrono
        } catch (err) {
          lastError = err;
          console.warn(`[AI Service] Modelo ${modelName} en ${provider.name} falló:`, err.message);
        }
      }
    }

    if (!result && !res.headersSent) {
      throw lastError || new Error("Todos los servidores de Inteligencia Artificial están saturados.");
    }

    return result;
  } catch (error) {
    console.error("Error en generateAIResponse:", error);
    throw error;
  }
};
