// Controlador de etiquetas: gestiona CRUD de etiquetas
import * as etiquetasService from '../services/etiquetas.service.js';
import { validarEtiqueta } from '../models/validations/etiquetas.validations.js';

/**
 * Listar etiquetas
 */
export const listarEtiquetas = async (req, res, next) => {
  try {
    const data = await etiquetasService.listarEtiquetas();
    res.status(200).json({ success: true, data, message: "Etiquetas listadas" });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear una nueva etiqueta
 */
export const crearEtiqueta = async (req, res, next) => {
  try {
    const errores = validarEtiqueta(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await etiquetasService.crearEtiqueta(req.body);
    res.status(201).json({ success: true, data, message: "Etiqueta creada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar una etiqueta existente
 */
export const actualizarEtiqueta = async (req, res, next) => {
  try {
    const errores = validarEtiqueta(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await etiquetasService.actualizarEtiqueta(req.params.id, req.body);
    res.status(200).json({ success: true, data, message: "Etiqueta actualizada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar (soft delete) una etiqueta
 */
export const eliminarEtiqueta = async (req, res, next) => {
  try {
    const data = await etiquetasService.eliminarEtiqueta(req.params.id);
    res.status(200).json({ success: true, data, message: "Etiqueta eliminada" });
  } catch (error) {
    next(error);
  }
};
