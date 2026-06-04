// Controlador de proyectos: gestiona CRUD de proyectos
import { validarProyecto } from "../models/validations/proyectos.validations.js";
import * as proyectosService from "../services/proyectos.service.js";
import notificacionesService from "../services/notificaciones.service.js";

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

    // Notificar a los demás miembros del proyecto sobre el nuevo miembro
    const usuarioActual = req.user;
    await notificacionesService.notificarNuevoMiembro(
      req.params.id,
      data.nombre,
      usuarioActual.nombre || usuarioActual.email || 'Un usuario',
      userId
    );

    res.status(200).json({ success: true, data, message: "Te has unido al proyecto" });
  } catch (error) {
    next(error);
  }
};

export const listarMiembrosProyecto = async (req, res, next) => {
  try {
    const data = await proyectosService.listarMiembrosProyecto(req.params.id);
    res.status(200).json({ success: true, data, message: "Miembros del proyecto listados" });
  } catch (error) {
    next(error);
  }
};

export const obtenerMiRolEnProyecto = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    const projectId = req.params.id;
    const data = await proyectosService.obtenerMiRolEnProyecto(projectId, userId);
    res.status(200).json({ success: true, data, message: "Rol en proyecto obtenido" });
  } catch (error) {
    next(error);
  }
};

export const listarRolesProyecto = async (req, res, next) => {
  try {
    const data = await proyectosService.listarRolesProyecto(req.params.id);
    res.status(200).json({ success: true, data, message: "Roles del proyecto listados" });
  } catch (error) {
    next(error);
  }
};

export const crearRolProyecto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre_rol, descripcion } = req.body;

    if (!nombre_rol || !String(nombre_rol).trim()) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "El nombre del rol es requerido",
        details: { nombre_rol: "nombre_rol es requerido" },
      });
    }

    if (!descripcion || !String(descripcion).trim()) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "La descripción del rol es requerida",
        details: { descripcion: "descripcion es requerida" },
      });
    }

    const data = await proyectosService.crearRolProyecto(
      id,
      nombre_rol,
      descripcion,
      req.user,
    );

    res.status(201).json({ success: true, data, message: "Rol creado en el proyecto" });
  } catch (error) {
    next(error);
  }
};

export const eliminarMiembroProyecto = async (req, res, next) => {
  try {
    const data = await proyectosService.eliminarMiembroProyecto(
      req.params.id,
      req.params.id_usuario,
    );
    res.status(200).json({ success: true, data, message: "Miembro eliminado del proyecto" });
  } catch (error) {
    next(error);
  }
};

export const actualizarRolMiembroProyecto = async (req, res, next) => {
  try {
    const { id, id_usuario } = req.params;
    const { id_rol } = req.body;

    if (!id_rol) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "El id_rol es requerido",
        details: { id_rol: "id_rol es requerido" },
      });
    }

    const data = await proyectosService.actualizarRolMiembroProyecto(
      id,
      id_usuario,
      id_rol,
      req.user,
    );

    res.status(200).json({ success: true, data, message: "Rol del miembro actualizado" });
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoMiembroProyecto = async (req, res, next) => {
  try {
    const { id, id_usuario } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "El campo activo es requerido",
        details: { activo: "activo es requerido" },
      });
    }

    const data = await proyectosService.actualizarEstadoMiembroProyecto(
      id,
      id_usuario,
      Boolean(activo),
      req.user,
    );

    res.status(200).json({
      success: true,
      data,
      message: `Miembro ${activo ? "habilitado" : "inhabilitado"} correctamente`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transferir rol de Product Owner a otro miembro
 * El PO actual se inactiva automáticamente
 */
export const transferirProductOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id_usuario_nuevo_po } = req.body;

    if (!id_usuario_nuevo_po) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "El id del nuevo Product Owner es requerido",
        details: { id_usuario_nuevo_po: "id_usuario_nuevo_po es requerido" },
      });
    }

    const result = await proyectosService.transferirProductOwner(
      id,
      id_usuario_nuevo_po,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Product Owner transferido exitosamente",
    });
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

    // Obtener el proyecto actual para comparar el estado
    const proyectoActual = await proyectosService.obtenerProyecto(req.params.id);
    const estadoAnterior = proyectoActual.estado;

    const data = await proyectosService.actualizarProyecto(
      req.params.id,
      req.body,
    );

    // Notificar cambio de estado si el estado cambió
    if (req.body.estado && req.body.estado !== estadoAnterior) {
      const userId = req.user?.id_usuario;
      await notificacionesService.notificarCambioEstadoProyecto(
        req.params.id,
        data.nombre,
        req.body.estado,
        userId
      );
    }

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
