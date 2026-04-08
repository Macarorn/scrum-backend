// src/models/validations/etiquetas.validations.js

export const validarEtiqueta = (data) => {
  const errores = [];
  if (!data.nombre) errores.push("El nombre es obligatorio");
  return errores;
};
