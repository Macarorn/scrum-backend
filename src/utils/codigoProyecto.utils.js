import crypto from 'crypto';

/**
 * Genera un código único de proyecto de 8 caracteres alfanuméricos
 * @returns {string} Código único generado
 */
function generarCodigoProyecto() {
  // Genera un código aleatorio de 8 caracteres usando letras mayúsculas y números
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';

  for (let i = 0; i < 8; i++) {
    const indiceAleatorio = crypto.randomInt(0, caracteres.length);
    codigo += caracteres[indiceAleatorio];
  }

  return codigo;
}

/**
 * Verifica si un código de proyecto ya existe en la base de datos
 * @param {string} codigo - Código a verificar
 * @param {Object} connection - Conexión a la base de datos
 * @returns {Promise<boolean>} true si existe, false si no
 */
async function verificarCodigoExistente(codigo, connection) {
  try {
    const [rows] = await connection.execute(
      'SELECT id_proyecto FROM proyecto WHERE codigo_proyecto = ?',
      [codigo]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error verificando código existente:', error);
    return false;
  }
}

/**
 * Genera un código único que no existe en la base de datos
 * @param {Object} connection - Conexión a la base de datos
 * @returns {Promise<string>} Código único generado
 */
async function generarCodigoUnicoProyecto(connection) {
  let codigo;
  let existe = true;
  let intentos = 0;
  const maxIntentos = 10;

  do {
    codigo = generarCodigoProyecto();
    existe = await verificarCodigoExistente(codigo, connection);
    intentos++;

    if (intentos >= maxIntentos) {
      // Si después de varios intentos no encontramos un código único,
      // agregamos un timestamp para garantizar unicidad
      const timestamp = Date.now().toString().slice(-4);
      codigo = generarCodigoProyecto().slice(0, 4) + timestamp;
      existe = await verificarCodigoExistente(codigo, connection);
    }
  } while (existe && intentos < maxIntentos + 1);

  if (existe) {
    throw new Error('No se pudo generar un código único después de múltiples intentos');
  }

  return codigo;
}

export {
  generarCodigoProyecto,
  verificarCodigoExistente,
  generarCodigoUnicoProyecto
};