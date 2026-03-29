// Simulación de base de datos (temporal)
// 🔥 Cuando conectes MySQL, esto se reemplaza por consultas SQL
let sprints = [];

// Crear Sprint
export const createSprint = (req, res) => {
  try {
    // 🔥 VALIDACIÓN EXTRA (evita req.body undefined)
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Body requerido",
      });
    }

    const { nombre, fechaInicio, fechaFin, velocidad } = req.body;

    // Validación básica
    if (!nombre || !fechaInicio || !fechaFin || !velocidad) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios",
      });
    }

    const newSprint = {
      id: Date.now(),
      nombre,
      fechaInicio,
      fechaFin,
      velocidad,
      estado: "pendiente",
    };

    sprints.push(newSprint);

    return res.status(201).json({
      success: true,
      data: newSprint,
      message: "Sprint creado correctamente",
    });

  } catch (error) {
    console.error("Error createSprint:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Obtener todos
export const getSprints = (req, res) => {
  try {
    return res.json({
      success: true,
      data: sprints,
      message: "Sprints obtenidos",
    });
  } catch (error) {
    console.error("Error getSprints:", error);
    res.status(500).json({
      success: false,
      message: "Error interno",
    });
  }
};

// Obtener por ID
export const getSprintById = (req, res) => {
  try {
    const { id } = req.params;

    const sprint = sprints.find(s => s.id == id);

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    return res.json({
      success: true,
      data: sprint,
    });

  } catch (error) {
    console.error("Error getSprintById:", error);
    res.status(500).json({
      success: false,
      message: "Error interno",
    });
  }
};

// 🔥 UPDATE ROBUSTO (NO SE CAE)
export const updateSprint = (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 VALIDAR BODY
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Body requerido",
      });
    }

    const { nombre, fechaInicio, fechaFin, velocidad } = req.body;

    const index = sprints.findIndex(s => s.id == id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    // Actualización segura
    if (nombre !== undefined) sprints[index].nombre = nombre;
    if (fechaInicio !== undefined) sprints[index].fechaInicio = fechaInicio;
    if (fechaFin !== undefined) sprints[index].fechaFin = fechaFin;
    if (velocidad !== undefined) sprints[index].velocidad = velocidad;

    return res.json({
      success: true,
      data: sprints[index],
      message: "Sprint actualizado correctamente",
    });

  } catch (error) {
    console.error("Error updateSprint:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar sprint",
    });
  }
};

// Eliminar
export const deleteSprint = (req, res) => {
  try {
    const { id } = req.params;

    const index = sprints.findIndex(s => s.id == id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    const deleted = sprints.splice(index, 1);

    return res.json({
      success: true,
      data: deleted[0],
      message: "Sprint eliminado correctamente",
    });

  } catch (error) {
    console.error("Error deleteSprint:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar",
    });
  }
};

// Cambiar estado
export const updateEstado = (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 VALIDAR BODY
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Body requerido",
      });
    }

    const { estado } = req.body;

    const sprint = sprints.find(s => s.id == id);

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint no encontrado",
      });
    }

    // 🔥 VALIDACIÓN DE ESTADO (PRO)
    const estadosValidos = ["pendiente", "en_curso", "finalizado"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "Estado inválido",
      });
    }

    sprint.estado = estado;

    return res.json({
      success: true,
      data: sprint,
      message: "Estado actualizado",
    });

  } catch (error) {
    console.error("Error updateEstado:", error);
    res.status(500).json({
      success: false,
      message: "Error interno",
    });
  }
};