// src/models/validations/epicas.validations.js

export const validarEpica = (data) => {
  const errores = [];
  if (!data.nombre) errores.push("El nombre es obligatorio");
  if (!data.proyectoId) errores.push("El proyectoId es obligatorio");
  // ...otros checks
  return errores;
};
