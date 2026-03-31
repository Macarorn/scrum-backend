// src/models/validations/criterios.validations.js

export const validarCriterio = (data) => {
  const errores = [];
  if (!data.descripcion) errores.push("La descripción es obligatoria");
  return errores;
};
