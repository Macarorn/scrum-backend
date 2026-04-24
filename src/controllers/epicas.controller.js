// Controlador de épicas: gestiona CRUD de épicas
import * as epicasService from '../services/epicas.service.js';
import { validarEpica } from '../models/validations/epicas.validations.js';

/**
 * Listar épicas por proyecto
 */
export const listarEpicas = async (req, res, next) => {
  try {
    const proyectoId = req.query.proyectoId ?? req.query.id_proyecto;
    const data = await epicasService.listarEpicas(proyectoId);
    res.status(200).json({ success: true, data, message: "Épicas listadas" });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear una nueva épica
 */
export const crearEpica = async (req, res, next) => {
  try {
    const errores = validarEpica(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await epicasService.crearEpica(req.body);
    res.status(201).json({ success: true, data, message: "Épica creada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener una épica por ID
 */
export const obtenerEpica = async (req, res, next) => {
  try {
    const data = await epicasService.obtenerEpica(req.params.id);
    res.status(200).json({ success: true, data, message: "Épica encontrada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar una épica existente
 */
export const actualizarEpica = async (req, res, next) => {
  try {
    const errores = validarEpica(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await epicasService.actualizarEpica(req.params.id, req.body);
    res.status(200).json({ success: true, data, message: "Épica actualizada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar (soft delete) una épica
 */
export const eliminarEpica = async (req, res, next) => {
  try {
    const data = await epicasService.eliminarEpica(req.params.id);
    res.status(200).json({ success: true, data, message: "Épica eliminada" });
  } catch (error) {
    next(error);
  }
};
