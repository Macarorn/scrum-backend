// Middleware específico para tareas

// Middleware: Solo asignados pueden cambiar estado
export async function soloAsignadosPuedenCambiarEstado(req, res, next) {
  const tareaId = req.params.id;
  const userId = req.user.id;
  // TODO: Consulta SQL para verificar si userId está asignado a la tareaId
  // Ejemplo:
  // const [rows] = await pool.query('SELECT * FROM asignaciones WHERE tarea_id = ? AND user_id = ?', [tareaId, userId]);
  // if (!rows.length) return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Solo usuarios asignados pueden cambiar el estado.' });
  next();
}

// Middleware: Solo responsable puede actualizar tiempo real
export async function soloResponsablePuedeActualizarTiempo(req, res, next) {
  const tareaId = req.params.id;
  const userId = req.user.id;
  // TODO: Consulta SQL para verificar si userId es responsable de la tareaId
  // Ejemplo:
  // const [rows] = await pool.query('SELECT * FROM tareas WHERE id = ? AND responsable_id = ?', [tareaId, userId]);
  // if (!rows.length) return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Solo el responsable puede actualizar el tiempo real.' });
  next();
}

// Middleware: Validar transiciones de estado
import { esTransicionValida } from '../utils/estado-transicion.utils.js';
export async function validarTransicionEstado(req, res, next) {
  const tareaId = req.params.id;
  const nuevoEstado = req.body.estado;
  // TODO: Consulta SQL para obtener el estado actual de la tarea
  // Ejemplo:
  // const [rows] = await pool.query('SELECT estado FROM tareas WHERE id = ?', [tareaId]);
  // const estadoActual = rows[0]?.estado;
  // if (!esTransicionValida(estadoActual, nuevoEstado)) {
  //   return res.status(400).json({ success: false, error: 'INVALID_TRANSITION', message: 'Transición de estado no permitida.' });
  // }
  next();
}
