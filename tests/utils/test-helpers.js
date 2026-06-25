/**
 * Test Utilities & Helpers
 * Funciones comunes para todos los tests
 */

import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';

/**
 * Genera un token JWT válido para testing
 * @param {number} idUsuario - ID del usuario
 * @param {string} email - Email del usuario
 * @param {string|Array} rol - Rol(es) del usuario
 * @returns {string} Token JWT válido
 */
export const generateTestToken = (idUsuario = 1, email = 'test@scrum.local', rol = 'admin') => {
  const roles = Array.isArray(rol) ? rol : [{ nombre_rol: rol }];
  const payload = {
    id_usuario: idUsuario,
    email,
    roles,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

/**
 * Usuario de prueba estándar
 */
export const mockUser = {
  id_usuario: 1,
  email: 'admin@scrum.local',
  nombre: 'Admin User',
  telefono: '1234567890',
  ciudad: 'Bogotá',
  estado: 'activo',
  fecha_creacion: new Date(),
  roles: [{ id_rol: 1, nombre_rol: 'admin' }],
};

/**
 * Usuarios de prueba adicionales
 */
export const mockUsers = [
  mockUser,
  {
    id_usuario: 2,
    email: 'po@scrum.local',
    nombre: 'Product Owner',
    telefono: '1234567891',
    ciudad: 'Medellín',
    estado: 'activo',
    roles: [{ id_rol: 2, nombre_rol: 'product_owner' }],
  },
  {
    id_usuario: 3,
    email: 'sm@scrum.local',
    nombre: 'Scrum Master',
    telefono: '1234567892',
    ciudad: 'Cali',
    estado: 'activo',
    roles: [{ id_rol: 3, nombre_rol: 'scrum_master' }],
  },
];

/**
 * Proyecto de prueba estándar
 */
export const mockProject = {
  id_proyecto: 1,
  nombre: 'Proyecto de Prueba',
  descripcion: 'Descripción del proyecto',
  tipo: 'Desarrollo',
  codigo_proyecto: 'PRUEBA-001',
  creado_por: 1,
  estado: 'activo',
  fecha_creacion: new Date(),
};

/**
 * Sprint de prueba estándar
 */
export const mockSprint = {
  id_sprint: 1,
  id_proyecto: 1,
  nombre: 'Sprint 1',
  meta: 'Meta del sprint',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-01-15',
  estado: 'planeado',
  velocidad_estimada: 20,
};

/**
 * Épica de prueba estándar
 */
export const mockEpica = {
  id: 1,
  nombre: 'Épica de Prueba',
  proyectoId: 1,
  descripcion: 'Descripción épica',
  estado: 'activa',
};

/**
 * Historia de prueba estándar
 */
export const mockHistoria = {
  id: 1,
  nombre: 'Historia de Prueba',
  epicaId: 1,
  descripcion: 'Descripción historia',
  prioridad: 3,
  storyPoints: 5,
  estado: 'por_hacer',
};

/**
 * Tarea de prueba estándar
 */
export const mockTarea = {
  id_tarea: 1,
  nombre: 'Tarea de Prueba',
  descripcion: 'Descripción tarea',
  id_historia: 1,
  id_usuario_responsable: 1,
  prioridad: 'alta',
  tipo: 'RF',
  story_points: 5,
  estado: 'por_hacer',
  estimacion_dias: 2,
  orden_columna: 1,
};

/**
 * Notificación de prueba estándar
 */
export const mockNotificacion = {
  id_notificacion: 1,
  id_usuario: 1,
  titulo: 'Notificación de Prueba',
  mensaje: 'Este es un mensaje de prueba',
  tipo: 'info',
  leida: false,
  fecha_creacion: new Date(),
};

/**
 * Etiqueta de prueba estándar
 */
export const mockEtiqueta = {
  id: 1,
  nombre: 'frontend',
  color: '#FF0000',
  proyecto_id: 1,
};

/**
 * Crea mocks para la base de datos de MySQL
 * @param {Object} queryResponses - Objeto con respuestas personalizadas
 * @returns {Object} Pool mock
 */
export const createPoolMock = (queryResponses = {}) => {
  const defaultResponses = {
    'SELECT id_rol': [[{ id_rol: 1, nombre_rol: 'admin' }]],
    'SELECT nombre_rol': [[{ nombre_rol: 'admin' }]],
    'SELECT * FROM usuario': [[mockUser]],
    'SELECT * FROM proyecto': [[mockProject]],
    'SELECT * FROM sprint': [[mockSprint]],
  };

  const queryMock = vi.fn(async (sql) => {
    for (const [key, value] of Object.entries({ ...defaultResponses, ...queryResponses })) {
      if (sql.includes(key)) {
        return value;
      }
    }
    return [[]];
  });

  return { query: queryMock };
};

/**
 * Crea mocks para request/response
 */
export const createReqResMocks = (user = mockUser, body = {}, query = {}) => {
  const req = {
    user: { ...user },
    body: { ...body },
    query: { ...query },
    params: {},
  };

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };

  const next = vi.fn();

  return { req, res, next };
};

/**
 * Espera a que se cumplan las aserciones
 */
export const waitFor = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper para verificar estructura de respuesta
 */
export const expectSuccessResponse = (body) => {
  return (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    'data' in body &&
    body.success === true
  );
};

/**
 * Helper para verificar estructura de error
 */
export const expectErrorResponse = (body) => {
  return (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    'error' in body &&
    body.success === false
  );
};

/**
 * Crea un mock de base de datos completo para tests de integración
 * Retorna siempre en formato [rows, fields] que espera mysql2/promise
 * @param {Object} customResponses - Respuestas personalizadas (opcional)
 * @returns {Function} Mock queryMock listo para usar
 */
export const createDatabaseMock = (customResponses = {}) => {
  const roles = {
    1: { id_rol: 1, nombre_rol: 'admin', descripcion: 'Administrator' },
    2: { id_rol: 2, nombre_rol: 'usuario', descripcion: 'Regular User' },
    3: { id_rol: 3, nombre_rol: 'Product Owner', descripcion: 'Product Owner' },
    4: { id_rol: 4, nombre_rol: 'Scrum Master', descripcion: 'Scrum Master' },
    5: { id_rol: 5, nombre_rol: 'Developer', descripcion: 'Developer' },
  };

  const users = {
    1: {
      id_usuario: 1,
      email: 'admin@scrum.local',
      nombre: 'Admin',
      password: '$2b$10$7UPxF6Q7yH.A.eI1.2.EuOpNvGUTiMGwTJq/n9gZNHo7vAQvNR3i2',
      activo: 1,
      telefono: null,
      ciudad: 'Bogotá',
      fecha_registro: new Date(),
      rol_principal: 'admin',
      permisos: [],
    },
    2: {
      id_usuario: 2,
      email: 'po@scrum.local',
      nombre: 'Product Owner',
      password: '$2b$10$7UPxF6Q7yH.A.eI1.2.EuOpNvGUTiMGwTJq/n9gZNHo7vAQvNR3i2',
      activo: 1,
      telefono: null,
      ciudad: 'Medellín',
      fecha_registro: new Date(),
      rol_principal: 'product_owner',
      permisos: [],
    },
    3: {
      id_usuario: 3,
      email: 'user@scrum.local',
      nombre: 'Usuario Regular',
      password: '$2b$10$7UPxF6Q7yH.A.eI1.2.EuOpNvGUTiMGwTJq/n9gZNHo7vAQvNR3i2',
      activo: 1,
      telefono: null,
      ciudad: 'Cali',
      fecha_registro: new Date(),
      rol_principal: 'usuario',
      permisos: [],
    },
  };

  const queryMock = vi.fn((sql, params) => {
    // Primero chequear respuestas personalizadas
    for (const [pattern, response] of Object.entries(customResponses)) {
      if (sql.includes(pattern)) {
        return Promise.resolve(response);
      }
    }

    // Mocks para legal terms
    if (sql.includes('SELECT version, title, content FROM legal_terms_versions')) {
      return Promise.resolve([[{
        version: 'v1.0',
        title: 'Términos y Condiciones',
        content: 'Terms and Conditions v1.0',
      }], []]);
    }

    // Mocks para roles por ID
    if (sql.includes('SELECT id_rol, nombre_rol, descripcion FROM rol WHERE id_rol')) {
      const roleId = params?.[0];
      const role = roles[roleId];
      return Promise.resolve([role ? [role] : [], []]);
    }

    if (sql.includes('SELECT id_rol, nombre_rol, descripcion FROM rol ORDER BY id_rol')) {
      return Promise.resolve([Object.values(roles), []]);
    }

    // Mocks para roles de proyecto usados por requireRole/checkPermission.
    if (sql.includes('SELECT r.nombre_rol FROM usuario_equipo_proyecto')) {
      const userId = Number(params?.[1]);
      const roleByUser = {
        1: 'Scrum Master',
        2: 'Developer',
        3: 'Developer',
        4: 'Developer',
      };
      return Promise.resolve([[{ nombre_rol: roleByUser[userId] || 'Developer' }], []]);
    }

    if (sql.includes('SELECT ep.id_proyecto, r.nombre_rol FROM usuario_equipo_proyecto')) {
      const userId = Number(params?.[0]);
      const roleByUser = {
        1: 'Scrum Master',
        2: 'Developer',
        3: 'Developer',
        4: 'Developer',
      };
      return Promise.resolve([[{ id_proyecto: 1, nombre_rol: roleByUser[userId] || 'Developer' }], []]);
    }

    // Mocks para búsqueda de usuario por email
    if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('email') && sql.includes('WHERE')) {
      const email = params?.[0];
      const user = Object.values(users).find(u => u.email === email);
      return Promise.resolve([user ? [user] : [], []]);
    }

    // Mocks para búsqueda de usuario por ID
    if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('id_usuario') && sql.includes('WHERE')) {
      const userId = params?.[0];
      const user = users[userId];
      return Promise.resolve([user ? [user] : [], []]);
    }

    // Mocks para permisos
    if (sql.includes('SELECT') && sql.includes('permiso') && sql.includes('rol_permiso')) {
      return Promise.resolve([[], []]);
    }

    // Mocks para conteos usados al generar identificadores por proyecto
    if (sql.includes('SELECT COUNT(*) as count')) {
      return Promise.resolve([[{ count: 0 }], []]);
    }

    // Mocks para inserts de usuario
    if (sql.includes('INSERT INTO usuario')) {
      return Promise.resolve([{ insertId: 10, affectedRows: 1 }, []]);
    }

    // Mocks para inserts de consent
    if (sql.includes('INSERT INTO') && sql.includes('consent')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    // Mocks para asignación de roles
    if (sql.includes('INSERT INTO usuario_rol')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    // Mocks para refresh token
    if (sql.includes('INSERT INTO refresh_tokens')) {
      return Promise.resolve([{ insertId: 1 }, []]);
    }

    // Mocks para búsqueda de refresh token
    if (sql.includes('SELECT') && sql.includes('refresh_tokens')) {
      return Promise.resolve([[{ id_token: 1, id_usuario: 1, token_hash: 'hash' }], []]);
    }

    // Mocks para proyectos
    if (sql.includes('SELECT nombre FROM proyecto WHERE id_proyecto')) {
      return Promise.resolve([[{ nombre: 'Proyecto Test' }], []]);
    }

    if (sql.includes('SELECT') && sql.includes('proyecto') && !sql.includes('WHERE')) {
      return Promise.resolve([[
        {
          id_proyecto: 1,
          nombre: 'Proyecto Test',
          descripcion: 'Test',
          estado: 'activo',
        },
      ], []]);
    }

    // Mocks para sprints
    if (sql.includes('SELECT id_sprint, id_proyecto FROM sprint WHERE id_sprint')) {
      return Promise.resolve([[
        {
          id_sprint: 1,
          id_proyecto: 1,
        },
      ], []]);
    }

    if (sql.includes('SELECT s.*, p.nombre as nombre_proyecto')) {
      return Promise.resolve([[
        {
          ...mockSprint,
          nombre_proyecto: 'Proyecto Test',
        },
      ], []]);
    }

    if (sql.includes('SELECT * FROM sprint WHERE id_sprint')) {
      const sprintId = Number(params?.[0]);
      return Promise.resolve([sprintId === 999 ? [] : [mockSprint], []]);
    }

    if (sql.includes("SELECT id_sprint FROM sprint WHERE id_proyecto = ? AND estado = 'en_curso'")) {
      return Promise.resolve([[], []]);
    }

    if (sql.includes("SELECT id_sprint, nombre FROM sprint WHERE id_proyecto = ? AND estado = 'en_curso'")) {
      return Promise.resolve([[], []]);
    }

    if (sql.includes('SELECT') && sql.includes('sprint') && !sql.includes('WHERE')) {
      return Promise.resolve([[
        {
          id_sprint: 1,
          id_proyecto: 1,
          nombre: 'Sprint 1',
          estado: 'planeado',
        },
      ], []]);
    }

    if (sql.includes('INSERT INTO sprint')) {
      return Promise.resolve([{ insertId: 1, affectedRows: 1 }, []]);
    }

    if (sql.includes('UPDATE sprint')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    if (sql.includes('DELETE FROM sprint WHERE id_sprint')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    if (sql.includes('SELECT e.*, se.fecha_asignacion')) {
      return Promise.resolve([[
        {
          id_epica: 1,
          id_proyecto: 1,
          nombre: 'Epica 1',
          descripcion: 'Descripcion',
          categoria: null,
          prioridad: 3,
          estado: 'por_hacer',
          fecha_asignacion: new Date(),
        },
      ], []]);
    }

    if (sql.includes('SELECT id_epica FROM epica WHERE id_epica IN')) {
      const epicas = Array.isArray(params?.[0]) ? params[0] : [];
      return Promise.resolve([epicas.map((id_epica) => ({ id_epica })), []]);
    }

    if (sql.includes('SELECT id_epica, id_sprint FROM sprint_epica')) {
      return Promise.resolve([[], []]);
    }

    if (sql.includes('INSERT IGNORE INTO sprint_epica')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    if (sql.includes('DELETE FROM sprint_epica')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    // Mocks para backlog
    if (sql.includes('SELECT e.*') && sql.includes('FROM epica e')) {
      return Promise.resolve([[
        {
          id_epica: 1,
          id_proyecto: 1,
          nombre: 'Epica de Prueba',
          descripcion: 'Descripcion epica',
          categoria: null,
          prioridad: 3,
          estado: 'por_hacer',
          total_historias: 0,
        },
      ], []]);
    }

    if (sql.includes('SELECT * FROM epica WHERE id_epica')) {
      const epicaId = Number(params?.[0]);
      return Promise.resolve([epicaId === 999 ? [] : [{
        id_epica: epicaId || 1,
        id_proyecto: 1,
        nombre: 'Epica de Prueba',
        descripcion: 'Descripcion epica',
        categoria: null,
        prioridad: 3,
        estado: 'por_hacer',
      }], []]);
    }

    if (sql.includes('INSERT INTO epica')) {
      return Promise.resolve([{ insertId: 1, affectedRows: 1 }, []]);
    }

    if (sql.includes('UPDATE epica')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    if (sql.includes('DELETE FROM epica')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    if (sql.includes('SELECT * FROM historia_usuario') && sql.includes('id_historia')) {
      const historiaId = Number(params?.[0]);
      return Promise.resolve([historiaId === 999 ? [] : [{
        id_historia: historiaId || 1,
        id_epica: 1,
        id_sprint: 1,
        nombre: 'Historia de Prueba',
        descripcion: 'Descripcion historia',
        prioridad: 3,
        story_points: 5,
        estado: 'por_hacer',
      }], []]);
    }

    if (sql.includes('SELECT * FROM historia_usuario')) {
      return Promise.resolve([[
        {
          id_historia: 1,
          id_epica: 1,
          id_sprint: 1,
          nombre: 'Historia de Prueba',
          descripcion: 'Descripcion historia',
          prioridad: 3,
          story_points: 5,
          estado: 'por_hacer',
        },
      ], []]);
    }

    if (sql.includes('SELECT id_historia, id_epica FROM historia_usuario WHERE id_historia')) {
      return Promise.resolve([[{ id_historia: 1, id_epica: 1 }], []]);
    }

    if (sql.includes('SELECT id_epica, id_proyecto, nombre FROM epica WHERE id_epica')) {
      return Promise.resolve([[{ id_epica: 1, id_proyecto: 1, nombre: 'Epica de Prueba' }], []]);
    }

    if (sql.includes('SELECT id_proyecto FROM epica WHERE id_epica')) {
      return Promise.resolve([[{ id_proyecto: 1 }], []]);
    }

    if (sql.includes('INSERT INTO historia_usuario')) {
      return Promise.resolve([{ insertId: 1, affectedRows: 1 }, []]);
    }

    if (sql.includes('UPDATE historia_usuario')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    if (sql.includes('SELECT * FROM criterio_aceptacion WHERE id_criterio')) {
      return Promise.resolve([[{
        id_criterio: Number(params?.[0]) || 1,
        id_historia: 1,
        descripcion: 'Criterio de prueba',
        cumplido: 0,
      }], []]);
    }

    if (sql.includes('SELECT * FROM criterio_aceptacion')) {
      return Promise.resolve([[
        { id_criterio: 1, id_historia: 1, descripcion: 'Criterio 1', cumplido: 0 },
      ], []]);
    }

    if (sql.includes('SELECT id_historia FROM criterio_aceptacion')) {
      return Promise.resolve([[{ id_historia: 1 }], []]);
    }

    if (sql.includes('INSERT INTO criterio_aceptacion')) {
      return Promise.resolve([{ insertId: 1, affectedRows: 1 }, []]);
    }

    if (sql.includes('UPDATE criterio_aceptacion')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    if (sql.includes('DELETE FROM criterio_aceptacion')) {
      return Promise.resolve([{ affectedRows: 1 }, []]);
    }

    // Mocks para tareas
    if (sql.includes('SELECT') && sql.includes('tarea') && !sql.includes('WHERE')) {
      return Promise.resolve([[
        {
          id_tarea: 1,
          nombre: 'Tarea Test',
          estado: 'por_hacer',
        },
      ], []]);
    }

    // Por defecto, devolver array vacío en formato correcto
    return Promise.resolve([[], []]);
  });

  return queryMock;
};
