// src/models/validations/proyectos.validations.js

export const validarProyecto = (data) => {
  const errores = [];
  if (!data.nombre) errores.push("El nombre es obligatorio");
  if (data.nombre && data.nombre.length < 3) errores.push("El nombre debe tener al menos 3 caracteres");
  // ...otros checks si es necesario
  return errores;
};