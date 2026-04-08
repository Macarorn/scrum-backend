// Controlador de criterios: gestiona actualización y borrado de criterios
import * as criteriosService from '../services/criterios.service.js';
import { validarCriterio } from '../models/validations/criterios.validations.js';

/**
 * Actualizar un criterio de aceptación
 */
export const actualizarCriterio = async (req, res, next) => {
  try {
    const errores = validarCriterio(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await criteriosService.actualizarCriterio(req.params.id, req.body);
    res.status(200).json({ success: true, data, message: "Criterio actualizado" });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar (soft delete) un criterio de aceptación
 */
export const eliminarCriterio = async (req, res, next) => {
  try {
    const data = await criteriosService.eliminarCriterio(req.params.id);
    res.status(200).json({ success: true, data, message: "Criterio eliminado" });
  } catch (error) {
    next(error);
  }
};
