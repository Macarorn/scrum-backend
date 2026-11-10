import { generateAIResponse } from "../services/ai.service.js";

export const askAI = async (req, res) => {
  try {
    const userId = req.user.id_usuario; // Extraído del token JWT por el middleware auth
    const { question, history = [] } = req.body;

    if (!question) {
      return res.status(400).json({ message: "La pregunta es requerida." });
    }

    await generateAIResponse(userId, question, history, res);
  } catch (error) {
    console.error("Error en askAI controller:", error);
    res.status(500).json({ message: error.message || "Error interno del servidor al procesar la IA." });
  }
};
