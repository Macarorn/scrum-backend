let sprints = [];

export const getAll = () => sprints;

export const create = (data) => {
  const sprint = { id: Date.now(), ...data };
  sprints.push(sprint);
  return sprint;
};

export const getById = (id) => {
  return sprints.find(s => s.id == id);
};

export const update = (id, data) => {
  const index = sprints.findIndex(s => s.id == id);
  if (index === -1) throw new Error("Sprint no encontrado");

  sprints[index] = { ...sprints[index], ...data };
  return sprints[index];
};

export const remove = (id) => {
  sprints = sprints.filter(s => s.id != id);
};

export const updateEstado = (id, estado) => {
  const sprint = sprints.find(s => s.id == id);
  if (!sprint) throw new Error("Sprint no encontrado");

  sprint.estado = estado;
  return sprint;
};