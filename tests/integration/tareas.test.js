import request from 'supertest';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { generateTestToken, mockTarea } from '../utils/test-helpers.js';

process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';

let queryMock;
let app;
let dbState;

const historia = {
  id_historia: 1,
  id_epica: 1,
  id_sprint: 1,
};

const epica = {
  id_epica: 1,
  id_proyecto: 1,
  nombre: 'Epica Test',
};

const usuarios = {
  1: { id_usuario: 1, nombre: 'Scrum Master' },
  2: { id_usuario: 2, nombre: 'Usuario Regular' },
};

const roles = {
  1: { id_rol: 1, nombre_rol: 'admin', descripcion: 'Acceso total al sistema' },
  2: { id_rol: 2, nombre_rol: 'usuario', descripcion: 'Acceso estandar' },
  3: { id_rol: 3, nombre_rol: 'Product Owner', descripcion: 'Gestiona backlog' },
  4: { id_rol: 4, nombre_rol: 'Scrum Master', descripcion: 'Facilita Scrum' },
  5: { id_rol: 5, nombre_rol: 'Developer', descripcion: 'Implementa tareas' },
};

function nuevaTarea(overrides = {}) {
  return {
    ...mockTarea,
    historia_nombre: 'Historia de Prueba',
    asignados: undefined,
    etiquetas: undefined,
    comentarios: undefined,
    historial: undefined,
    ...overrides,
  };
}

function resetDbState() {
  dbState = {
    tarea: nuevaTarea(),
    tareaEliminada: false,
    asignados: [
      { id_usuario: 1, es_responsable: true, nombre: 'Scrum Master' },
    ],
    etiquetas: [1],
    comentarios: [
      {
        id_comentario: 1,
        id_tarea: 1,
        id_usuario: 1,
        comentario: 'Comentario existente',
        fecha: new Date(),
      },
    ],
    historial: [
      {
        id_historial: 1,
        id_tarea: 1,
        id_usuario: 1,
        estado_anterior: null,
        estado_nuevo: 'por_hacer',
        observacion: 'Tarea creada',
        fecha: new Date(),
      },
      {
        id_historial: 2,
        id_tarea: 1,
        id_usuario: 1,
        estado_anterior: 'por_hacer',
        estado_nuevo: 'en_progreso',
        observacion: 'Estado actualizado: por_hacer -> en_progreso',
        fecha: new Date(),
      },
    ],
    nextComentarioId: 2,
    nextHistorialId: 3,
  };
}

function rows(data) {
  return Promise.resolve([data, []]);
}

function result(data) {
  return Promise.resolve([data, []]);
}

function tareaPorId(id) {
  return Number(id) === 1 && !dbState.tareaEliminada ? [dbState.tarea] : [];
}

function rolProyectoParaUsuario(userId) {
  if (Number(userId) === 1) {
    return [{ nombre_rol: 'scrum master' }];
  }

  return [{ nombre_rol: 'developer' }];
}

function registrarHistorial(params) {
  const [idTarea, idUsuario, estadoAnterior, estadoNuevo, observacion] = params;
  dbState.historial.push({
    id_historial: dbState.nextHistorialId++,
    id_tarea: Number(idTarea),
    id_usuario: Number(idUsuario),
    estado_anterior: estadoAnterior,
    estado_nuevo: estadoNuevo,
    observacion,
    fecha: new Date(),
  });
}

function createTareasQueryMock() {
  return vi.fn((sql, params = []) => {
    const normalized = String(sql).replace(/\s+/g, ' ').trim();

    if (normalized.includes('SELECT id_rol, nombre_rol, descripcion FROM rol WHERE id_rol')) {
      const role = roles[Number(params[0])];
      return rows(role ? [role] : []);
    }

    if (normalized.includes('SELECT id_rol, nombre_rol, descripcion FROM rol ORDER BY id_rol')) {
      return rows(Object.values(roles));
    }

    if (normalized.includes('SELECT id_sprint, id_proyecto, nombre FROM sprint WHERE id_sprint')) {
      return rows([{ id_sprint: 1, id_proyecto: 1, nombre: 'Sprint 1' }]);
    }

    if (normalized.includes('SELECT id_proyecto FROM sprint WHERE id_sprint')) {
      return rows([{ id_sprint: 1, id_proyecto: 1 }]);
    }

    if (normalized.includes('SELECT id_tarea, id_historia FROM tarea WHERE id_tarea')) {
      return rows(tareaPorId(params[0]).map(({ id_tarea, id_historia }) => ({ id_tarea, id_historia })));
    }

    if (normalized.includes('SELECT id_historia, id_epica FROM historia_usuario WHERE id_historia')) {
      return rows(Number(params[0]) === 1 ? [{ id_historia: 1, id_epica: 1 }] : []);
    }

    if (normalized.includes('SELECT id_epica, id_proyecto, nombre FROM epica WHERE id_epica')) {
      return rows(Number(params[0]) === 1 ? [epica] : []);
    }

    if (normalized.includes('SELECT id_proyecto FROM epica WHERE id_epica')) {
      return rows(Number(params[0]) === 1 ? [{ id_proyecto: 1 }] : []);
    }

    if (normalized.includes('SELECT r.nombre_rol FROM usuario_equipo_proyecto')) {
      return rows(rolProyectoParaUsuario(params[1]));
    }

    if (normalized.includes('SELECT ep.id_proyecto, r.nombre_rol FROM usuario_equipo_proyecto')) {
      return rows([{ id_proyecto: 1, ...rolProyectoParaUsuario(params[0])[0] }]);
    }

    if (normalized.includes('SELECT p.nombre FROM rol_permiso')) {
      return rows([]);
    }

    if (normalized.includes('FROM historia_usuario h INNER JOIN epica e')) {
      return rows([{ ...historia, id_proyecto: 1 }]);
    }

    if (normalized.includes('SELECT id_historia FROM historia_usuario')) {
      return rows(Number(params[0]) === 1 ? [{ id_historia: 1 }] : []);
    }

    if (normalized.includes('SELECT id_usuario FROM usuario')) {
      const usuario = usuarios[Number(params[0])];
      return rows(usuario ? [{ id_usuario: usuario.id_usuario }] : []);
    }

    if (normalized.includes('SELECT id_sprint FROM sprint WHERE id_sprint')) {
      return rows([{ id_sprint: 1 }]);
    }

    if (normalized.includes('SELECT id_sprint FROM sprint WHERE id_proyecto')) {
      return rows([{ id_sprint: 1 }]);
    }

    if (normalized.includes('INSERT INTO tarea (')) {
      const [
        idHistoria,
        nombre,
        descripcion,
        tipo,
        estado,
        prioridad,
        storyPoints,
        estimacionDias,
        tiempoReal,
        ordenColumna,
      ] = params;

      dbState.tareaEliminada = false;
      dbState.tarea = nuevaTarea({
        id_tarea: 1,
        id_historia: idHistoria,
        nombre,
        descripcion,
        tipo,
        estado,
        prioridad,
        story_points: storyPoints,
        estimacion_dias: estimacionDias,
        tiempo_real: tiempoReal,
        orden_columna: ordenColumna,
      });

      return result({ insertId: 1, affectedRows: 1 });
    }

    if (normalized.includes('INSERT IGNORE INTO tarea_usuario')) {
      const [idTarea, idUsuario, esResponsable = 0] = params;
      const existe = dbState.asignados.some(
        (asignado) => Number(asignado.id_usuario) === Number(idUsuario),
      );

      if (!existe && Number(idTarea) === 1 && !dbState.tareaEliminada) {
        dbState.asignados.push({
          id_usuario: Number(idUsuario),
          es_responsable: Boolean(esResponsable),
          nombre: usuarios[Number(idUsuario)]?.nombre || null,
        });
        return result({ affectedRows: 1 });
      }

      return result({ affectedRows: 0 });
    }

    if (normalized.includes('INSERT IGNORE INTO sprint_historia')) {
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('UPDATE historia_usuario SET id_sprint')) {
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('SELECT t.*, h.nombre AS historia_nombre FROM tarea t LEFT JOIN historia_usuario h ON h.id_historia = t.id_historia WHERE t.id_tarea = ?')) {
      return rows(tareaPorId(params[0]));
    }

    if (normalized.includes('SELECT t.*, h.nombre AS historia_nombre FROM tarea t LEFT JOIN historia_usuario h ON h.id_historia = t.id_historia')) {
      return rows(dbState.tareaEliminada ? [] : [{ ...dbState.tarea }]);
    }

    if (normalized.includes('SELECT tu.id_usuario, tu.es_responsable, u.nombre')) {
      return rows(tareaPorId(params[0]).length ? dbState.asignados : []);
    }

    if (normalized.includes('SELECT id_etiqueta FROM tarea_etiqueta')) {
      return rows(tareaPorId(params[0]).length ? dbState.etiquetas.map((id_etiqueta) => ({ id_etiqueta })) : []);
    }

    if (normalized.includes('SELECT id_comentario, comentario, id_usuario, fecha FROM comentario_tarea')) {
      return rows(
        tareaPorId(params[0]).length
          ? dbState.comentarios.filter((comentario) => comentario.id_tarea === Number(params[0]))
          : [],
      );
    }

    if (normalized.includes('SELECT id_historial, id_usuario, estado_anterior, estado_nuevo, observacion, fecha FROM historial_tarea')) {
      return rows(
        tareaPorId(params[0]).length
          ? dbState.historial.filter((historial) => historial.id_tarea === Number(params[0]))
          : [],
      );
    }

    if (normalized.includes('UPDATE tarea SET nombre = ?')) {
      const [
        nombre,
        descripcion,
        tipo,
        estado,
        idHistoria,
        prioridad,
        storyPoints,
        estimacionDias,
        tiempoReal,
        ordenColumna,
        idUsuarioResponsable,
        idTarea,
      ] = params;

      if (!tareaPorId(idTarea).length) {
        return result({ affectedRows: 0 });
      }

      dbState.tarea = {
        ...dbState.tarea,
        nombre,
        descripcion,
        tipo,
        estado,
        id_historia: idHistoria,
        prioridad,
        story_points: storyPoints,
        estimacion_dias: estimacionDias,
        tiempo_real: tiempoReal,
        orden_columna: ordenColumna,
        id_usuario_responsable: idUsuarioResponsable,
      };
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('UPDATE tarea SET estado = ?')) {
      if (!tareaPorId(params[1]).length) {
        return result({ affectedRows: 0 });
      }

      dbState.tarea = { ...dbState.tarea, estado: params[0] };
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('UPDATE tarea SET orden_columna = ?')) {
      if (!tareaPorId(params[1]).length) {
        return result({ affectedRows: 0 });
      }

      dbState.tarea = { ...dbState.tarea, orden_columna: Number(params[0]) };
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('UPDATE tarea SET tiempo_real = ?')) {
      if (!tareaPorId(params[1]).length) {
        return result({ affectedRows: 0 });
      }

      dbState.tarea = { ...dbState.tarea, tiempo_real: Number(params[0]) };
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('DELETE FROM tarea WHERE id_tarea')) {
      const existe = tareaPorId(params[0]).length > 0;
      dbState.tareaEliminada = existe;
      return result({ affectedRows: existe ? 1 : 0 });
    }

    if (normalized.includes('DELETE FROM tarea_usuario')) {
      dbState.asignados = dbState.asignados.filter(
        (asignado) => Number(asignado.id_usuario) !== Number(params[1]),
      );
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('INSERT INTO comentario_tarea')) {
      const [idTarea, idUsuario, comentario] = params;
      const idComentario = dbState.nextComentarioId++;
      dbState.comentarios.push({
        id_comentario: idComentario,
        id_tarea: Number(idTarea),
        id_usuario: Number(idUsuario),
        comentario,
        fecha: new Date(),
      });
      return result({ insertId: idComentario, affectedRows: 1 });
    }

    if (normalized.includes('SELECT id_tarea FROM comentario_tarea WHERE id_comentario')) {
      const comentario = dbState.comentarios.find(
        (item) => Number(item.id_comentario) === Number(params[0]),
      );
      return rows(comentario ? [{ id_tarea: comentario.id_tarea }] : []);
    }

    if (normalized.includes('DELETE FROM comentario_tarea WHERE id_comentario')) {
      const before = dbState.comentarios.length;
      dbState.comentarios = dbState.comentarios.filter(
        (item) => Number(item.id_comentario) !== Number(params[0]),
      );
      return result({ affectedRows: before === dbState.comentarios.length ? 0 : 1 });
    }

    if (normalized.includes('INSERT IGNORE INTO tarea_etiqueta')) {
      const idEtiqueta = Number(params[1]);
      if (!dbState.etiquetas.includes(idEtiqueta)) {
        dbState.etiquetas.push(idEtiqueta);
      }
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('DELETE FROM tarea_etiqueta')) {
      dbState.etiquetas = dbState.etiquetas.filter(
        (idEtiqueta) => Number(idEtiqueta) !== Number(params[1]),
      );
      return result({ affectedRows: 1 });
    }

    if (normalized.includes('INSERT INTO historial_tarea')) {
      registrarHistorial(params);
      return result({ insertId: dbState.nextHistorialId - 1, affectedRows: 1 });
    }

    return rows([]);
  });
}

beforeAll(async () => {
  resetDbState();
  queryMock = createTareasQueryMock();

  vi.doMock('../../src/utils/database.js', () => ({
    default: {
      query: queryMock,
      getConnection: vi.fn(),
      end: vi.fn(),
    },
  }));

  const { default: appModule } = await import('../../src/app.js');
  app = appModule;
});

beforeEach(() => {
  resetDbState();
  queryMock.mockClear();
});

describe('Tareas - Tasks API CRUD', () => {
  const smToken = generateTestToken(1, 'sm@scrum.local', 'scrum_master');

  describe('POST /api/tareas - Crear Tarea', () => {
    it('crea nueva tarea', async () => {
      const response = await request(app)
        .post('/api/tareas')
        .set('Authorization', `Bearer ${smToken}`)
        .send({
          nombre: 'Tarea de prueba',
          id_historia: 1,
          id_usuario_responsable: 1,
          prioridad: 'alta',
          tipo: 'RF',
          estado: 'por_hacer',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id_tarea', 1);
    });
  });

  describe('GET /api/tareas - Listar Tareas', () => {
    it('lista todas las tareas', async () => {
      const response = await request(app)
        .get('/api/tareas')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/tareas/:id - Obtener Tarea', () => {
    it('obtiene tarea por ID', async () => {
      const response = await request(app)
        .get('/api/tareas/1')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id_tarea).toBe(1);
    });
  });

  describe('PUT /api/tareas/:id - Actualizar Tarea', () => {
    it('actualiza datos de tarea', async () => {
      const response = await request(app)
        .put('/api/tareas/1')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ prioridad: 'media' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.prioridad).toBe('media');
    });
  });

  describe('PATCH /api/tareas/:id/estado - Cambiar Estado', () => {
    it('cambia estado de tarea', async () => {
      const response = await request(app)
        .patch('/api/tareas/1/estado')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ estado: 'en_progreso' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estado).toBe('en_progreso');
    });
  });

  describe('DELETE /api/tareas/:id - Eliminar Tarea', () => {
    it('elimina tarea', async () => {
      const response = await request(app)
        .delete('/api/tareas/1')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ id_tarea: 1, eliminado: true });
    });
  });

  describe('Asignacion de Usuarios', () => {
    it('POST /api/tareas/:id/asignar asigna usuario', async () => {
      const response = await request(app)
        .post('/api/tareas/1/asignar')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ id_usuario: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.asignados).toEqual(
        expect.arrayContaining([expect.objectContaining({ id_usuario: 2 })]),
      );
    });

    it('GET /api/tareas/:id/usuarios lista usuarios asignados', async () => {
      const response = await request(app)
        .get('/api/tareas/1/usuarios')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Comentarios', () => {
    it('POST /api/tareas/:id/comentarios crea comentario', async () => {
      const response = await request(app)
        .post('/api/tareas/1/comentarios')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ comentario: 'Comentario de prueba' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id_tarea: 1,
        id_usuario: 1,
        comentario: 'Comentario de prueba',
      });
    });

    it('GET /api/tareas/:id/comentarios lista comentarios', async () => {
      const response = await request(app)
        .get('/api/tareas/1/comentarios')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

describe('Tareas - Tasks API CRUD', () => {
  const smToken = generateTestToken(1, 'sm@scrum.local', 'scrum_master');
  const userToken = generateTestToken(2, 'user@scrum.local', 'usuario');
  let tareaId = 1;
  let comentarioId = 1;

  describe('POST /api/tareas - Crear Tarea', () => {
    it('crea nueva tarea', async () => {
      const response = await request(app)
        .post('/api/tareas')
        .set('Authorization', `Bearer ${smToken}`)
        .send({
          nombre: 'Tarea de prueba',
          descripcion: 'Descripcion',
          id_historia: 1,
          id_usuario_responsable: 1,
          prioridad: 'alta',
          tipo: 'RF',
          story_points: 5,
          estado: 'por_hacer',
          estimacion_dias: 2,
          orden_columna: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id_tarea');
      tareaId = response.body.data.id_tarea;
    });

    it('rechaza sin permiso editar_backlog', async () => {
      const response = await request(app)
        .post('/api/tareas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Tarea sin permiso',
          id_historia: 1,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('rechaza tarea sin datos requeridos', async () => {
      const response = await request(app)
        .post('/api/tareas')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ id_proyecto: 1, nombre: 'Solo nombre' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tareas - Listar Tareas', () => {
    it('lista todas las tareas', async () => {
      const response = await request(app)
        .get('/api/tareas')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('filtra tareas por historia', async () => {
      const response = await request(app)
        .get('/api/tareas?id_historia=1')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('filtra tareas por estado', async () => {
      const response = await request(app)
        .get('/api/tareas?estado=por_hacer')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/tareas/:id - Obtener Tarea', () => {
    it('obtiene tarea por ID', async () => {
      const response = await request(app)
        .get(`/api/tareas/${tareaId}`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id_tarea).toBe(mockTarea.id_tarea);
    });

    it('devuelve 404 si tarea no existe', async () => {
      const response = await request(app)
        .get('/api/tareas/999')
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tareas/:id - Actualizar Tarea', () => {
    it('actualiza datos de tarea', async () => {
      const response = await request(app)
        .put(`/api/tareas/${tareaId}`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ prioridad: 'media', story_points: 8 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.prioridad).toBe('media');
      expect(response.body.data.story_points).toBe(8);
    });

    it('rechaza sin permiso editar_backlog', async () => {
      const response = await request(app)
        .put(`/api/tareas/${tareaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ prioridad: 'media' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/tareas/:id/estado - Cambiar Estado', () => {
    it('cambia estado a en_progreso', async () => {
      const response = await request(app)
        .patch(`/api/tareas/${tareaId}/estado`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ estado: 'en_progreso' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estado).toBe('en_progreso');
    });

    it('valida estados permitidos', async () => {
      const response = await request(app)
        .patch(`/api/tareas/${tareaId}/estado`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ estado: 'estado_invalido' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tareas/:id/orden - Cambiar Orden', () => {
    it('cambia orden de tarea en columna', async () => {
      const response = await request(app)
        .put(`/api/tareas/${tareaId}/orden`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ orden_columna: 4 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orden_columna).toBe(4);
    });
  });

  describe('PATCH /api/tareas/:id/tiempo-real - Registrar Tiempo Real', () => {
    it('registra tiempo real invertido', async () => {
      const response = await request(app)
        .patch(`/api/tareas/${tareaId}/tiempo-real`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ tiempo_real: 6 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tiempo_real).toBe(6);
    });
  });

  describe('DELETE /api/tareas/:id - Eliminar Tarea', () => {
    it('elimina tarea con soft delete', async () => {
      const response = await request(app)
        .delete(`/api/tareas/${tareaId}`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('rechaza sin permiso editar_backlog', async () => {
      const response = await request(app)
        .delete(`/api/tareas/${tareaId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Asignacion de Usuarios', () => {
    it('POST /api/tareas/:id/asignar asigna usuario', async () => {
      const response = await request(app)
        .post(`/api/tareas/${tareaId}/asignar`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ id_usuario: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.asignados.length).toBeGreaterThan(0);
      expect(response.body.data.asignados).toEqual(
        expect.arrayContaining([expect.objectContaining({ id_usuario: 2 })]),
      );
    });

    it('GET /api/tareas/:id/usuarios lista usuarios asignados', async () => {
      const response = await request(app)
        .get(`/api/tareas/${tareaId}/usuarios`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('DELETE /api/tareas/:id/asignar/:userId desasigna usuario', async () => {
      dbState.asignados.push({
        id_usuario: 2,
        es_responsable: false,
        nombre: 'Usuario Regular',
      });

      const response = await request(app)
        .delete(`/api/tareas/${tareaId}/asignar/2`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.asignados).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id_usuario: 2 })]),
      );
    });
  });

  describe('Comentarios', () => {
    it('POST /api/tareas/:id/comentarios crea comentario', async () => {
      const response = await request(app)
        .post(`/api/tareas/${tareaId}/comentarios`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ comentario: 'Comentario de prueba' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id_tarea).toBe(tareaId);
      comentarioId = response.body.data.id_comentario;
    });

    it('GET /api/tareas/:id/comentarios lista comentarios', async () => {
      const response = await request(app)
        .get(`/api/tareas/${tareaId}/comentarios`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('DELETE /api/tareas/comentarios/:id elimina comentario', async () => {
      const comentarioExistenteId = 1;

      const response = await request(app)
        .delete(`/api/tareas/comentarios/${comentarioExistenteId}`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ id_comentario: comentarioExistenteId, eliminado: true });
    });
  });

  describe('Etiquetas', () => {
    it('POST /api/tareas/:id/etiquetas asigna etiqueta', async () => {
      const response = await request(app)
        .post(`/api/tareas/${tareaId}/etiquetas`)
        .set('Authorization', `Bearer ${smToken}`)
        .send({ id_etiqueta: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.etiquetas)).toBe(true);
      expect(response.body.data.etiquetas).toContain(2);
    });

    it('DELETE /api/tareas/:id/etiquetas/:idEtiqueta remueve etiqueta', async () => {
      dbState.etiquetas = [1, 2, 3];

      const response = await request(app)
        .delete(`/api/tareas/${tareaId}/etiquetas/1`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.etiquetas).not.toContain(1);
    });
  });

  describe('GET /api/tareas/:id/historial - Historial de Cambios', () => {
    it('obtiene historial de cambios', async () => {
      const response = await request(app)
        .get(`/api/tareas/${tareaId}/historial`)
        .set('Authorization', `Bearer ${smToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });
});
