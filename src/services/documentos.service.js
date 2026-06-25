import pool from "../utils/database.js";
import { uploadFile, getSignedDownloadUrl, isR2Configured } from "../utils/r2.utils.js";
import path from "path";

function notFoundError(entity = "Documento") {
  return {
    statusCode: 404,
    error: "NOT_FOUND",
    message: `${entity} no encontrado`,
  };
}

export const listarDocumentos = async (idProyecto) => {
  const [rows] = await pool.query(
    `SELECT dp.*, 
            uc.nombre as creador_nombre,
            um.nombre as modificador_nombre,
            (SELECT COUNT(*) FROM documento_version dv WHERE dv.id_documento = dp.id_documento) as total_versiones
     FROM documento_proyecto dp
     LEFT JOIN usuario uc ON dp.id_usuario_creador = uc.id_usuario
     LEFT JOIN usuario um ON dp.id_usuario_modificacion = um.id_usuario
     WHERE dp.id_proyecto = ? AND dp.estado = 'activo'
     ORDER BY dp.fecha_modificacion DESC, dp.fecha_creacion DESC`,
    [idProyecto]
  );
  return rows;
};

export const obtenerDocumento = async (idDocumento) => {
  const [rows] = await pool.query(
    `SELECT dp.*, 
            uc.nombre as creador_nombre,
            um.nombre as modificador_nombre
     FROM documento_proyecto dp
     LEFT JOIN usuario uc ON dp.id_usuario_creador = uc.id_usuario
     LEFT JOIN usuario um ON dp.id_usuario_modificacion = um.id_usuario
     WHERE dp.id_documento = ?`,
    [idDocumento]
  );
  
  if (rows.length === 0) {
    throw notFoundError();
  }
  return rows[0];
};

export const crearDocumento = async (idProyecto, nombre, file, comentario, userId) => {
  if (!isR2Configured()) {
    throw { statusCode: 500, message: "El almacenamiento en la nube no está configurado." };
  }

  const extension = path.extname(file.originalname).toLowerCase().replace('.', '');
  // Extract proper extension from mime if needed, but the originalname extension is usually fine.
  // The middleware already validated the allowed extensions.

  // Iniciar transacción
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Crear registro principal
    const [resultDoc] = await connection.query(
      `INSERT INTO documento_proyecto (id_proyecto, nombre, tipo_archivo, id_usuario_creador)
       VALUES (?, ?, ?, ?)`,
      [idProyecto, nombre, extension, userId]
    );
    const idDocumento = resultDoc.insertId;

    // 2. Generar R2 key y subir
    const version = 1;
    const r2Key = `proyectos/${idProyecto}/documentos/${idDocumento}/v${version}/${Date.now()}-${file.originalname}`;
    
    await uploadFile(r2Key, file.buffer, file.mimetype);

    // 3. Crear primera versión
    await connection.query(
      `INSERT INTO documento_version (id_documento, numero_version, nombre_archivo, r2_key, mime_type, tamano_bytes, comentario, id_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idDocumento, version, file.originalname, r2Key, file.mimetype, file.size, comentario || "Versión inicial", userId]
    );

    await connection.commit();
    connection.release();

    return await obtenerDocumento(idDocumento);
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

export const actualizarDocumento = async (idDocumento, file, comentario, userId) => {
  if (!isR2Configured()) {
    throw { statusCode: 500, message: "El almacenamiento en la nube no está configurado." };
  }

  const documento = await obtenerDocumento(idDocumento);
  if (documento.estado === 'inactivo') {
    throw { statusCode: 400, message: "No se puede actualizar un documento inactivo." };
  }

  const idProyecto = documento.id_proyecto;
  const nuevaVersion = documento.version_actual + 1;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Generar R2 key y subir
    const r2Key = `proyectos/${idProyecto}/documentos/${idDocumento}/v${nuevaVersion}/${Date.now()}-${file.originalname}`;
    
    await uploadFile(r2Key, file.buffer, file.mimetype);

    // 2. Insertar nueva versión
    await connection.query(
      `INSERT INTO documento_version (id_documento, numero_version, nombre_archivo, r2_key, mime_type, tamano_bytes, comentario, id_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idDocumento, nuevaVersion, file.originalname, r2Key, file.mimetype, file.size, comentario || `Actualización a versión ${nuevaVersion}`, userId]
    );

    // 3. Actualizar registro principal
    const extension = path.extname(file.originalname).toLowerCase().replace('.', '');
    await connection.query(
      `UPDATE documento_proyecto 
       SET version_actual = ?, tipo_archivo = ?, id_usuario_modificacion = ?
       WHERE id_documento = ?`,
      [nuevaVersion, extension, userId, idDocumento]
    );

    await connection.commit();
    connection.release();

    return await obtenerDocumento(idDocumento);
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

export const desactivarDocumento = async (idDocumento, userId) => {
  const [result] = await pool.query(
    `UPDATE documento_proyecto 
     SET estado = 'inactivo', id_usuario_modificacion = ?
     WHERE id_documento = ?`,
    [userId, idDocumento]
  );

  if (result.affectedRows === 0) {
    throw notFoundError();
  }

  return { success: true, message: "Documento desactivado correctamente" };
};

export const obtenerHistorial = async (idDocumento) => {
  const [rows] = await pool.query(
    `SELECT dv.*, u.nombre as usuario_nombre
     FROM documento_version dv
     LEFT JOIN usuario u ON dv.id_usuario = u.id_usuario
     WHERE dv.id_documento = ?
     ORDER BY dv.numero_version DESC`,
    [idDocumento]
  );
  return rows;
};

export const obtenerUrlDescarga = async (idDocumento, version = null) => {
  let query = `SELECT r2_key, mime_type, nombre_archivo FROM documento_version WHERE id_documento = ?`;
  const params = [idDocumento];

  if (version) {
    query += ` AND numero_version = ?`;
    params.push(version);
  } else {
    // Si no se especifica versión, obtener la más reciente (mayor)
    query += ` ORDER BY numero_version DESC LIMIT 1`;
  }

  const [rows] = await pool.query(query, params);

  if (rows.length === 0) {
    throw notFoundError(version ? "Versión del documento" : "Documento");
  }

  const url = await getSignedDownloadUrl(rows[0].r2_key);
  return { 
    url, 
    nombre_archivo: rows[0].nombre_archivo,
    mime_type: rows[0].mime_type
  };
};
