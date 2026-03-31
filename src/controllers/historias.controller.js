// Controlador de historias: gestiona CRUD de historias y criterios
import * as historiasService from '../services/historias.service.js';
import { validarHistoria } from '../models/validations/historias.validations.js';
import { validarCriterio } from '../models/validations/criterios.validations.js';

/**
 * Listar historias por épica
 */
export const listarHistorias = async (req, res, next) => {
   try {
    const epicaId = req.query.epicaId;
    const data = await historiasService.listarHistorias(epicaId);
    res.status(200).json({ success: true, data, message: "Historias listadas" });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear una nueva historia
 */
export const crearHistoria = async (req, res, next) => {
  try {
    const errores = validarHistoria(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await historiasService.crearHistoria(req.body);
    res.status(201).json({ success: true, data, message: "Historia creada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener una historia por ID
 */
export const obtenerHistoria = async (req, res, next) => {
  try {
    const data = await historiasService.obtenerHistoria(req.params.id);
    res.status(200).json({ success: true, data, message: "Historia encontrada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar una historia existente
 */
export const actualizarHistoria = async (req, res, next) => {
  try {
    const errores = validarHistoria(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await historiasService.actualizarHistoria(req.params.id, req.body);
    res.status(200).json({ success: true, data, message: "Historia actualizada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar (soft delete) una historia
 */
export const eliminarHistoria = async (req, res, next) => {
  try {
    const data = await historiasService.eliminarHistoria(req.params.id);
    res.status(200).json({ success: true, data, message: "Historia eliminada" });
  } catch (error) {
    next(error);
  }
};

/**
 * Listar criterios de aceptación de una historia
 */
export const listarCriterios = async (req, res, next) => {
  try {
    const data = await historiasService.listarCriterios(req.params.id);
    res.status(200).json({ success: true, data, message: "Criterios listados" });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un criterio de aceptación para una historia
 */
export const crearCriterio = async (req, res, next) => {
  try {
    const errores = validarCriterio(req.body);
    if (errores.length) return res.status(400).json({ success: false, error: "validation_error", message: "Datos inválidos", details: errores });
    const data = await historiasService.crearCriterio(req.params.id, req.body);
    res.status(201).json({ success: true, data, message: "Criterio creado" });
  } catch (error) {
    next(error);
  }
};
