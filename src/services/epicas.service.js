// Store temporal en memoria para pruebas del módulo backlog.
const epicas = [];
let nextEpicaId = 1;

function notFoundError(entity = "Épica") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrada`,
  };
}

export const listarEpicas = async (proyectoId) => {
  // Permite filtrar por proyecto y retorna solo registros activos.
  return epicas.filter((epica) => {
    if (!epica.activo) {
      return false;
    }

    if (proyectoId !== undefined) {
      return epica.proyectoId === Number(proyectoId);
    }

    return true;
  });
};

export const crearEpica = async (data) => {
  const nuevaEpica = {
    id: nextEpicaId++,
    nombre: data.nombre,
    proyectoId: Number(data.proyectoId),
    descripcion: data.descripcion || "",
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  epicas.push(nuevaEpica);
  return nuevaEpica;
};

export const obtenerEpica = async (id) => {
  const epica = epicas.find((item) => item.id === Number(id) && item.activo);
  if (!epica) {
    throw notFoundError();
  }

  return epica;
};

export const actualizarEpica = async (id, data) => {
  const index = epicas.findIndex((item) => item.id === Number(id) && item.activo);
  if (index < 0) {
    throw notFoundError();
  }

  epicas[index] = {
    ...epicas[index],
    ...data,
    proyectoId:
      data.proyectoId !== undefined ? Number(data.proyectoId) : epicas[index].proyectoId,
    updatedAt: new Date().toISOString(),
  };

  return epicas[index];
};

export const eliminarEpica = async (id) => {
  const index = epicas.findIndex((item) => item.id === Number(id) && item.activo);
  if (index < 0) {
    throw notFoundError();
  }

  // Soft delete: no elimina físicamente, solo marca inactivo.
  epicas[index].activo = false;
  epicas[index].updatedAt = new Date().toISOString();

  return {
    id: Number(id),
    eliminado: true,
    softDelete: true,
  };
};
