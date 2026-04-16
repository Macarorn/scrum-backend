// Controlador de proyectos: gestiona CRUD de proyectos
import { validarProyecto } from "../models/validations/proyectos.validations.js";
import * as proyectosService from "../services/proyectos.service.js";

/**
 * Listar proyectos
 */
export const listarProyectos = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    const data = await proyectosService.listarProyectos(userId);
    res.status(200).json({ success: true, data, message: "Proyectos listados" });
  } catch (error) {
    next(error);
  }
};

export const listarTodosProyectos = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    const data = await proyectosService.listarTodosProyectos(userId);
    res.status(200).json({ success: true, data, message: "Todos los proyectos listados" });
  } catch (error) {
    next(error);
  }
};

export const unirseAProyecto = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    const data = await proyectosService.unirseAProyecto(userId, req.params.id);
    res.status(200).json({ success: true, data, message: "Te has unido al proyecto" });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo proyecto
 */
export const crearProyecto = async (req, res, next) => {
  try {
    const errores = validarProyecto(req.body);
    if (errores.length)
      return res
        .status(400)
        .json({
          success: false,
          error: "validation_error",
          message: "Datos inválidos",
          details: errores,
        });
    const payload = {
      ...req.body,
      creado_por: req.user.id_usuario,
    };

    const data = await proyectosService.crearProyecto(payload);
    res.status(201).json({ success: true, data, message: "Proyecto creado" });
  } catch (error) {
    next(error);
  }
};

/**
 * Buscar proyecto por código
 */
export const buscarProyectoPorCodigo = async (req, res, next) => {
  try {
    const data = await proyectosService.buscarProyectoPorCodigo(req.params.codigo);
    res.status(200).json({ success: true, data, message: "Proyecto encontrado" });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un proyecto por ID
 */
export const obtenerProyecto = async (req, res, next) => {
  try {
    const data = await proyectosService.obtenerProyecto(req.params.id);
    res
      .status(200)
      .json({ success: true, data, message: "Proyecto encontrado" });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar un proyecto existente
 */
export const actualizarProyecto = async (req, res, next) => {
  try {
    const errores = validarProyecto(req.body);
    if (errores.length)
      return res
        .status(400)
        .json({
          success: false,
          error: "validation_error",
          message: "Datos inválidos",
          details: errores,
        });
    const data = await proyectosService.actualizarProyecto(
      req.params.id,
      req.body,
    );
    res
      .status(200)
      .json({ success: true, data, message: "Proyecto actualizado" });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar (soft delete) un proyecto
 */
export const eliminarProyecto = async (req, res, next) => {
  try {
    const data = await proyectosService.eliminarProyecto(req.params.id);
    res
      .status(200)
      .json({ success: true, data, message: "Proyecto eliminado" });
  } catch (error) {
    next(error);
  }
};
