// src/services/etiquetas.service.js

export const listarEtiquetas = async () => {
  // TODO: Implementar lógica de obtención desde base de datos
  return [];
};

export const crearEtiqueta = async (data) => {
  // TODO: Implementar lógica de creación en base de datos
  return { id: 1, ...data };
};

export const actualizarEtiqueta = async (id, data) => {
  // TODO: Implementar lógica de actualización
  return { id, ...data };
};

export const eliminarEtiqueta = async (id) => {
  // TODO: Implementar lógica de soft delete
  return { id };
};
