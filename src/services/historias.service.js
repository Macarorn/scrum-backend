// Stores temporales para historias y criterios en pruebas.
const historias = [];
const criterios = [];
let nextHistoriaId = 1;
let nextCriterioId = 1;

function notFoundError(entity = "Historia") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrada`,
  };
}

export const listarHistorias = async (epicaId) => {
  // Filtra por épica cuando viene en query y excluye inactivos.
  return historias.filter((historia) => {
    if (!historia.activo) {
      return false;
    }

    if (epicaId !== undefined) {
      return historia.epicaId === Number(epicaId);
    }

    return true;
  });
};

export const crearHistoria = async (data) => {
  const nuevaHistoria = {
    id: nextHistoriaId++,
    nombre: data.nombre,
    epicaId: Number(data.epicaId),
    descripcion: data.descripcion || "",
    prioridad: Number(data.prioridad),
    storyPoints: Number(data.storyPoints),
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  historias.push(nuevaHistoria);
  return nuevaHistoria;
};

export const obtenerHistoria = async (id) => {
  const historia = historias.find((item) => item.id === Number(id) && item.activo);
  if (!historia) {
    throw notFoundError();
  }

  return historia;
};

export const actualizarHistoria = async (id, data) => {
  const index = historias.findIndex((item) => item.id === Number(id) && item.activo);
  if (index < 0) {
    throw notFoundError();
  }

  historias[index] = {
    ...historias[index],
    ...data,
    epicaId: data.epicaId !== undefined ? Number(data.epicaId) : historias[index].epicaId,
    prioridad:
      data.prioridad !== undefined ? Number(data.prioridad) : historias[index].prioridad,
    storyPoints:
      data.storyPoints !== undefined
        ? Number(data.storyPoints)
        : historias[index].storyPoints,
    updatedAt: new Date().toISOString(),
  };

  return historias[index];
};

export const eliminarHistoria = async (id) => {
  const index = historias.findIndex((item) => item.id === Number(id) && item.activo);
  if (index < 0) {
    throw notFoundError();
  }

  // Soft delete para conservar consistencia del backlog.
  historias[index].activo = false;
  historias[index].updatedAt = new Date().toISOString();

  return {
    id: Number(id),
    eliminado: true,
    softDelete: true,
  };
};

export const listarCriterios = async (historiaId) => {
  // Solo lista criterios activos asociados a una historia activa.
  const historia = historias.find((item) => item.id === Number(historiaId) && item.activo);
  if (!historia) {
    throw notFoundError();
  }

  return criterios.filter(
    (criterio) => criterio.historiaId === Number(historiaId) && criterio.activo,
  );
};

export const crearCriterio = async (historiaId, data) => {
  const historia = historias.find((item) => item.id === Number(historiaId) && item.activo);
  if (!historia) {
    throw notFoundError();
  }

  const nuevoCriterio = {
    id: nextCriterioId++,
    historiaId: Number(historiaId),
    descripcion: data.descripcion,
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  criterios.push(nuevoCriterio);
  return nuevoCriterio;
};

export const obtenerCriterioPorId = (id) => {
  return criterios.find((criterio) => criterio.id === Number(id) && criterio.activo) || null;
};

export const actualizarCriterioPorId = (id, data) => {
  const index = criterios.findIndex(
    (criterio) => criterio.id === Number(id) && criterio.activo,
  );

  if (index < 0) {
    return null;
  }

  criterios[index] = {
    ...criterios[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  return criterios[index];
};

export const eliminarCriterioPorId = (id) => {
  const index = criterios.findIndex(
    (criterio) => criterio.id === Number(id) && criterio.activo,
  );

  if (index < 0) {
    return null;
  }

  criterios[index].activo = false;
  criterios[index].updatedAt = new Date().toISOString();

  return {
    id: Number(id),
    eliminado: true,
    softDelete: true,
  };
};
