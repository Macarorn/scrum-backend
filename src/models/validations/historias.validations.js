// src/models/validations/historias.validations.js

export const validarHistoria = (data) => {
  const errores = [];
  if (!data.nombre) errores.push("El nombre es obligatorio");
  if (!data.epicaId) errores.push("El epicaId es obligatorio");
  if (!data.prioridad || data.prioridad < 1 || data.prioridad > 5) errores.push("Prioridad debe ser 1-5");
  // Validación de story points (Fibonacci)
  const fibonacci = [1,2,3,5,8,13,21,34];
  if (!fibonacci.includes(data.storyPoints)) errores.push("Story points debe ser Fibonacci");
  return errores;
};
