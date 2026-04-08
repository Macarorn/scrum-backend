// Store temporal de etiquetas para pruebas del módulo.
const etiquetas = [];
let nextEtiquetaId = 1;

function notFoundError() {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: "Etiqueta no encontrada",
  };
}

export const listarEtiquetas = async () => {
  // Solo retorna etiquetas activas.
  return etiquetas.filter((etiqueta) => etiqueta.activo);
};

export const crearEtiqueta = async (data) => {
  const nuevaEtiqueta = {
    id: nextEtiquetaId++,
    nombre: data.nombre,
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  etiquetas.push(nuevaEtiqueta);
  return nuevaEtiqueta;
};

export const actualizarEtiqueta = async (id, data) => {
  const index = etiquetas.findIndex((item) => item.id === Number(id) && item.activo);
  if (index < 0) {
    throw notFoundError();
  }

  etiquetas[index] = {
    ...etiquetas[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  return etiquetas[index];
};

export const eliminarEtiqueta = async (id) => {
  const index = etiquetas.findIndex((item) => item.id === Number(id) && item.activo);
  if (index < 0) {
    throw notFoundError();
  }

  // Soft delete: marca la etiqueta como inactiva.
  etiquetas[index].activo = false;
  etiquetas[index].updatedAt = new Date().toISOString();

  return {
    id: Number(id),
    eliminado: true,
    softDelete: true,
  };
};
