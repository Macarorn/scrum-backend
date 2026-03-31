// src/services/historias.service.js

export const listarHistorias = async (epicaId) => {
  // TODO: Implementar lógica de obtención desde base de datos
  return [];
};

export const crearHistoria = async (data) => {
  // TODO: Implementar lógica de creación en base de datos
  return { id: 1, ...data };
};

export const obtenerHistoria = async (id) => {
  // TODO: Implementar lógica de obtención por id
  return { id };
};

export const actualizarHistoria = async (id, data) => {
  // TODO: Implementar lógica de actualización
  return { id, ...data };
};

export const eliminarHistoria = async (id) => {
  // TODO: Implementar lógica de soft delete
  return { id };
};

// Criterios de aceptación
export const listarCriterios = async (historiaId) => {
  // TODO: Implementar lógica de obtención de criterios
  return [];
};

export const crearCriterio = async (historiaId, data) => {
  // TODO: Implementar lógica de creación de criterio
  return { id: 1, ...data };
};
