import {
  actualizarCriterioPorId,
  eliminarCriterioPorId,
} from "./historias.service.js";

function notFoundError() {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: "Criterio no encontrado",
  };
}

export const actualizarCriterio = async (id, data) => {
  // Reutiliza el store de historias para mantener una sola fuente de datos.
  const criterio = actualizarCriterioPorId(id, data);
  if (!criterio) {
    throw notFoundError();
  }

  return criterio;
};

export const eliminarCriterio = async (id) => {
  // Aplica soft delete del criterio dentro del mismo store compartido.
  const result = eliminarCriterioPorId(id);
  if (!result) {
    throw notFoundError();
  }

  return result;
};
