// src/services/epicas.service.js

export const listarEpicas = async (proyectoId) => {
  // TODO: Implementar lógica de obtención desde base de datos
  return [];
};

export const crearEpica = async (data) => {
  // TODO: Implementar lógica de creación en base de datos
  return { id: 1, ...data };
};

export const obtenerEpica = async (id) => {
  // TODO: Implementar lógica de obtención por id
  return { id };
};

export const actualizarEpica = async (id, data) => {
  // TODO: Implementar lógica de actualización
  return { id, ...data };
};

export const eliminarEpica = async (id) => {
  // TODO: Implementar lógica de soft delete
  return { id };
};
