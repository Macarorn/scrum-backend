// Listar tareas por sprint/estado
export const listarTareas = async (req, res, next) => {
    try {
    res.status(200).json({
        success: true,
        data: [],
        message: "Operación exitosa",
    });
    } catch (error) {
    next(error);
    }
};

// Crear tarea
export const crearTarea = async (req, res, next) => {
    try {
    res.status(201).json({
        success: true,
        data: {},
        message: "Tarea creada exitosamente",
    });
    } catch (error) {
    next(error);
    }
};

// Obtener tarea por ID
export const obtenerTarea = async (req, res, next) => {
    try {
    res.status(200).json({
        success: true,
        data: {},
        message: "Operación exitosa",
    });
    } catch (error) {
    next(error);
    }
};

// Actualizar tarea por ID
export const actualizarTarea = async (req, res, next) => {
    try {
    res.status(200).json({
        success: true,
        data: {},
        message: "Tarea actualizada exitosamente",
    });
    } catch (error) {
    next(error);
    }
};

// Eliminar tarea por ID
export const eliminarTarea = async (req, res, next) => {
        try {
        res.status(200).json({
                success: true,
                data: {},
                message: "Tarea eliminada exitosamente",
        });
        } catch (error) {
        next(error);
        }
};


// Cambiar estado de tarea
export const cambiarEstadoTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Estado de tarea actualizado" });
    } catch (error) { next(error); }
};

// Actualizar orden de tarea
export const actualizarOrdenTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Orden de tarea actualizado" });
    } catch (error) { next(error); }
};

// Registrar tiempo real invertido
export const registrarTiempoReal = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Tiempo real registrado" });
    } catch (error) { next(error); }
};

// Asignar usuario a tarea
export const asignarUsuarioTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Usuario asignado a tarea" });
    } catch (error) { next(error); }
};

// Desasignar usuario de tarea
export const desasignarUsuarioTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Usuario desasignado de tarea" });
    } catch (error) { next(error); }
};

// Listar usuarios asignados
export const listarUsuariosAsignados = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: [], message: "Usuarios asignados listados" });
    } catch (error) { next(error); }
};

// Obtener historial de cambios
export const obtenerHistorialTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: [], message: "Historial de tarea obtenido" });
    } catch (error) { next(error); }
};

// Listar comentarios de tarea
export const listarComentariosTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: [], message: "Comentarios listados" });
    } catch (error) { next(error); }
};

// Agregar comentario a tarea
export const agregarComentarioTarea = async (req, res, next) => {
    try {
        res.status(201).json({ success: true, message: "Comentario agregado" });
    } catch (error) { next(error); }
};

// Eliminar comentario
export const eliminarComentario = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Comentario eliminado" });
    } catch (error) { next(error); }
};

// Asignar etiqueta a tarea
export const asignarEtiquetaTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Etiqueta asignada a tarea" });
    } catch (error) { next(error); }
};

// Remover etiqueta de tarea
export const removerEtiquetaTarea = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: "Etiqueta removida de tarea" });
    } catch (error) { next(error); }
};

