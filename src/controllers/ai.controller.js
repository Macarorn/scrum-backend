import { generarAnalisisIA } from "../services/ai.service.js";
import { obtenerMetricasProyecto } from "../services/metricas.service.js";
import { generarPromptAnalisisProyecto } from "../utils/ai-prompts.js";

/**
 * Genera un análisis de rendimiento del proyecto usando la IA.
 * Requiere el id_proyecto en req.params.id
 */
export const analizarProyecto = async (req, res, next) => {
  try {
    const idProyecto = req.params.id;

    if (!idProyecto) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "El ID del proyecto es requerido",
      });
    }

    // 1. Obtener los datos reales de la base de datos
    const metricas = await obtenerMetricasProyecto(idProyecto);

    if (!metricas || metricas.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "No se encontraron tareas para generar métricas en este proyecto.",
      });
    }

    // 2. Construir el prompt usando nuestra plantilla separada
    // También permitimos recibir un custom prompt desde el body si en un futuro el frontend quiere sobreescribirlo
    let prompt;
    if (req.body.customPrompt) {
      prompt = `${req.body.customPrompt}\n\n=== DATOS DEL PROYECTO (MÉTRICAS) ===\n${JSON.stringify(metricas, null, 2)}`;
    } else {
      prompt = generarPromptAnalisisProyecto(metricas);
    }

    // 3. Generar la respuesta usando el servicio de IA
    const analisis = await generarAnalisisIA(prompt);

    // 4. Devolver la respuesta al cliente
    res.status(200).json({
      success: true,
      data: {
        analisis,
        metricas_evaluadas: metricas.length
      },
      message: "Análisis de IA generado exitosamente",
    });

  } catch (error) {
    next(error);
  }
};
