import {
  obtenerMetricasProyecto,
} from "../services/metricas.service.js";

export const obtenerMetricas = async (req, res, next) => {
  try {
    console.log("[metricas][controller] Proyecto seleccionado:", req.params.id);
    console.log("[metricas][controller] ID recibido:", req.params.id);
    const rawSprint = req.query.id_sprint ?? req.query.sprint;
    const sprintId = rawSprint !== undefined && rawSprint !== null && rawSprint !== "" ? Number(rawSprint) : null;
    console.log("[metricas][controller] Sprint opcional:", sprintId);
    const data = await obtenerMetricasProyecto(req.params.id, sprintId);
    res.status(200).json({
      success: true,
      data,
      message: "Metricas del proyecto obtenidas",
    });
  } catch (error) {
    next(error);
  }
};
