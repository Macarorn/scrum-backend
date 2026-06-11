import { GoogleGenAI } from '@google/genai';
import config from '../config/config.js';

// Inicializar la IA con la configuración del proyecto o la variable de entorno
const ai = new GoogleGenAI({ 
  apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY 
});

/**
 * Genera un análisis utilizando el modelo gemini-2.5-flash.
 * @param {string} prompt - El texto de instrucción y datos a analizar.
 * @returns {Promise<string>} - Respuesta generada por la IA.
 */
export const generarAnalisisIA = async (prompt) => {
  if (!config.geminiApiKey && !process.env.GEMINI_API_KEY) {
    throw new Error("La clave de API de Gemini (GEMINI_API_KEY) no está configurada.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error en el servicio de IA:", error);
    throw new Error("No se pudo conectar con la IA para generar el análisis.");
  }
};
