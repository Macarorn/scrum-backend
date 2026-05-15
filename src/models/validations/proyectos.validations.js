// src/models/validations/proyectos.validations.js

export const validarProyecto = (data) => {
  const errores = [];
  if (!data.nombre) errores.push("El nombre es obligatorio");
  if (data.nombre && data.nombre.length < 3) errores.push("El nombre debe tener al menos 3 caracteres");
  
  if (data.team_size !== undefined && data.team_size !== null && data.team_size !== "") {
    if (!Number.isInteger(Number(data.team_size)) || Number(data.team_size) < 1) {
      errores.push("El número de integrantes requeridos debe ser un entero positivo (>= 1)");
    }
  }

  // ...otros checks si es necesario
  return errores;
};