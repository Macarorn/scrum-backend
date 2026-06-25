import * as documentosService from "../services/documentos.service.js";

export const listarDocumentos = async (req, res, next) => {
  try {
    const data = await documentosService.listarDocumentos(req.params.id_proyecto);
    res.status(200).json({ success: true, data, message: "Documentos listados" });
  } catch (error) {
    next(error);
  }
};

export const crearDocumento = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "No se proporcionó ningún archivo." });
    }

    const { nombre, comentario } = req.body;
    if (!nombre) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "El nombre del documento es obligatorio." });
    }

    const userId = req.user.id_usuario;
    const data = await documentosService.crearDocumento(req.params.id_proyecto, nombre, req.file, comentario, userId);
    
    res.status(201).json({ success: true, data, message: "Documento subido exitosamente" });
  } catch (error) {
    next(error);
  }
};

export const actualizarDocumento = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "No se proporcionó ningún archivo." });
    }

    const { comentario } = req.body;
    if (!comentario) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "El comentario de la nueva versión es obligatorio." });
    }

    const userId = req.user.id_usuario;
    const data = await documentosService.actualizarDocumento(req.params.id_documento, req.file, comentario, userId);

    res.status(200).json({ success: true, data, message: "Nueva versión subida exitosamente" });
  } catch (error) {
    next(error);
  }
};

export const desactivarDocumento = async (req, res, next) => {
  try {
    const userId = req.user.id_usuario;
    const data = await documentosService.desactivarDocumento(req.params.id_documento, userId);
    
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

export const obtenerHistorial = async (req, res, next) => {
  try {
    const data = await documentosService.obtenerHistorial(req.params.id_documento);
    res.status(200).json({ success: true, data, message: "Historial obtenido" });
  } catch (error) {
    next(error);
  }
};

export const descargarDocumento = async (req, res, next) => {
  try {
    const { version } = req.query;
    const data = await documentosService.obtenerUrlDescarga(req.params.id_documento, version);
    
    res.status(200).json({ success: true, data, message: "URL de descarga generada" });
  } catch (error) {
    next(error);
  }
};
