import {
  obtenerMetricasProyecto,
} from "../services/metricas.service.js";

export const obtenerMetricas = async (req, res, next) => {
  try {
    console.log("[metricas][controller] Proyecto seleccionado:", req.params.id);
    console.log("[metricas][controller] ID recibido:", req.params.id);
    console.log("[metricas][controller] Sprint opcional:", req.query.id_sprint);
    const data = await obtenerMetricasProyecto(req.params.id, req.query.id_sprint);
    res.status(200).json({
      success: true,
      data,
      message: "Metricas del proyecto obtenidas",
    });
  } catch (error) {
    next(error);
  }
};
