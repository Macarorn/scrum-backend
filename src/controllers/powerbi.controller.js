import pool from "../utils/database.js";

/**
 * Obtener todos los proyectos.
 */
export const obtenerProyectos = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_proyecto, nombre, descripcion, tipo, estado, 
        fecha_inicio, fecha_fin_est, codigo_proyecto, 
        team_size, creado_por, fecha_creacion 
      FROM proyecto
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los sprints.
 */
export const obtenerSprints = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_sprint, id_proyecto, nombre, meta, 
        fecha_inicio, fecha_fin, estado, 
        velocidad_estimada, velocidad_real, fecha_creacion
      FROM sprint
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las épicas.
 */
export const obtenerEpicas = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_epica, id_proyecto, nombre, descripcion, 
        categoria, prioridad, estado, fecha_creacion
      FROM epica
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las historias de usuario.
 */
export const obtenerHistorias = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_historia, id_epica, id_sprint, nombre, 
        prioridad, story_points, estimacion_dias, 
        estado, fecha_creacion
      FROM historia_usuario
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las tareas.
 */
export const obtenerTareas = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_tarea, id_historia, nombre, tipo, estado, 
        prioridad, story_points, estimacion_dias, 
        tiempo_real, id_usuario_responsable, 
        fecha_inicio, fecha_fin_est, fecha_fin_real, fecha_creacion
      FROM tarea
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los usuarios (información básica para cruzar datos).
 */
export const obtenerUsuarios = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_usuario, nombre, email, activo, ciudad, fecha_registro
      FROM usuario
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};
