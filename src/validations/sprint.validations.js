exports.validateSprint = (data) => {
  if (!data.nombre) {
    throw new Error("El nombre es obligatorio");
  }

  if (data.fechaFin <= data.fechaInicio) {
    throw new Error("Fecha fin debe ser mayor a inicio");
  }

  if (data.velocidad <= 0) {
    throw new Error("Velocidad debe ser mayor a 0");
  }
};