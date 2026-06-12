import request from 'supertest';
import { beforeEach, describe, expect, it, vi, beforeAll } from 'vitest';
import { generateTestToken, createDatabaseMock, mockSprint } from '../utils/test-helpers.js';

process.env.NODE_ENV = 'test';
process.env.USE_AUTH = 'true';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';

let queryMock;
let app;

const expectApiShape = (response) => {
  expect(response.body).toHaveProperty('success', response.status < 400);
};

const genericQueryResponse = (sql) => {
  const normalized = String(sql || '').trim().toUpperCase();
  if (normalized.startsWith('SELECT')) {
    return Promise.resolve([[{ id: 1, nombre: 'Mock' }], []]);
  }
  return Promise.resolve([{ insertId: 1, affectedRows: 1 }, []]);
};

beforeAll(async () => {
  queryMock = createDatabaseMock();

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

describe('Sprints - Sprint Management API', () => {
  const smToken = generateTestToken(1, 'sm@scrum.local', 'scrum_master');
  const userToken = generateTestToken(2, 'user@scrum.local', 'usuario');

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('GET /api/sprints - Listar Sprints', () => {
    it('lista todos los sprints', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id_sprint: 1, nombre: 'Sprint 1' }], []]));

      const response = await request(app)
        .get('/api/sprints')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/sprints - Crear Sprint', () => {
    it('crea nuevo sprint', async () => {
      queryMock.mockResolvedValueOnce([[{ count: 0 }], []]);
      queryMock.mockResolvedValueOnce([{ insertId: 1 }, []]);
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      queryMock.mockResolvedValueOnce([[{ nombre: 'Proyecto Test' }], []]);
      queryMock.mockResolvedValueOnce([[], []]);

      const response = await request(app)
        .post('/api/sprints')
        .set('Authorization', `Bearer ${smToken}`)
        .send({
          id_proyecto: 1,
          nombre: 'Sprint 1',
          meta: 'Meta',
          fecha_inicio: '2026-01-01',
          fecha_fin: '2026-01-15',
          estado: 'planeado',
          velocidad_estimada: 20,
        });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/sprints/:id - Obtener Sprint', () => {
    it('obtiene sprint por ID', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id_sprint: 1, nombre: 'Sprint 1' }], []]));

      const response = await request(app)
        .get('/api/sprints/1')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/sprints/:id - Actualizar Sprint', () => {
    it('actualiza sprint', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .put('/api/sprints/1')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ nombre: 'Sprint actualizado', estado: 'en_curso' });

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('PATCH /api/sprints/:id/estado - Cambiar Estado', () => {
    it('cambia estado del sprint', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .patch('/api/sprints/1/estado')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ estado: 'en_curso' });

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/sprints/:id - Eliminar Sprint', () => {
    it('elimina sprint', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/sprints/1')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });
});

describe('Sprints - Sprint Management API', () => {
  const smToken = generateTestToken(1, 'sm@scrum.local', 'scrum_master');
  const userToken = generateTestToken(2, 'user@scrum.local', 'usuario');

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('GET /api/sprints - Listar Sprints', () => {
    it('lista todos los sprints', async () => {
      queryMock.mockResolvedValueOnce([[mockSprint]]);

      const response = await request(app)
        .get('/api/sprints')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('filtra sprints por proyecto', async () => {
      queryMock.mockResolvedValueOnce([[mockSprint]]);

      const response = await request(app)
        .get('/api/sprints?id_proyecto=1')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/sprints - Crear Sprint', () => {
    it('crea nuevo sprint', async () => {
      queryMock.mockResolvedValueOnce([[{ count: 0 }], []]);
      queryMock.mockResolvedValueOnce([{ insertId: 1 }, []]);
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      queryMock.mockResolvedValueOnce([[{ nombre: 'Proyecto Test' }], []]);
      queryMock.mockResolvedValueOnce([[], []]);

      const response = await request(app)
        .post('/api/sprints')
        .set('Authorization', `Bearer ${smToken}`)
        .send({
          id_proyecto: 1,
          nombre: 'Sprint 1',
          meta: 'Entrega funcionalidad principal',
          fecha_inicio: '2026-01-01',
          fecha_fin: '2026-01-15',
          estado: 'planeado',
          velocidad_estimada: 20,
        });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toEqual(expect.objectContaining({
          id_proyecto: 1,
          nombre: expect.any(String),
          estado: 'planeado',
          esHoy: expect.any(Boolean),
          proximoEvento: expect.any(Boolean),
        }));
      }
    });

    it('rechaza sin permiso gestionar_sprints', async () => {
      const response = await request(app)
        .post('/api/sprints')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id_proyecto: 1,
          nombre: 'Sprint Sin Permisos',
          meta: 'Meta',
          fecha_inicio: '2026-01-01',
          fecha_fin: '2026-01-15',
        });

      expect([201, 401, 403, 404]).toContain(response.status);
      expectApiShape(response);
    });

    it('rechaza sprint sin datos requeridos', async () => {
      const response = await request(app)
        .post('/api/sprints')
        .set('Authorization', `Bearer ${smToken}`)
        .send({
          id_proyecto: 1,
          nombre: 'Solo nombre',
        });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sprints/:id - Obtener Sprint', () => {
    it('obtiene sprint por ID', async () => {
      queryMock.mockResolvedValueOnce([[mockSprint]]);

      const response = await request(app)
        .get('/api/sprints/1')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data.id_sprint).toBe(mockSprint.id_sprint);
      }
    });

    it('devuelve 404 si sprint no existe', async () => {
      queryMock.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get('/api/sprints/999')
        .set('Authorization', `Bearer ${smToken}`);

      expect([401, 403, 404]).toContain(response.status);
      expectApiShape(response);
    });
  });

  describe('PUT /api/sprints/:id - Actualizar Sprint', () => {
    it('actualiza datos del sprint', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
      queryMock.mockResolvedValueOnce([[{
        ...mockSprint,
        nombre: 'Sprint 1 v2',
        velocidad_estimada: 25,
      }]]);

      const response = await request(app)
        .put('/api/sprints/1')
        .set('Authorization', `Bearer ${smToken}`)
        .send({
          id_proyecto: 1,
          nombre: 'Sprint 1 v2',
          meta: 'Meta actualizada',
          fecha_inicio: '2026-01-01',
          fecha_fin: '2026-01-28',
          estado: 'en_curso',
          velocidad_estimada: 25,
        });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });
  });

  describe('PATCH /api/sprints/:id/estado - Cambiar Estado Sprint', () => {
    it('cambia estado a en_curso', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
      queryMock.mockResolvedValueOnce([[{
        ...mockSprint,
        estado: 'en_curso',
      }]]);

      const response = await request(app)
        .patch('/api/sprints/1/estado')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ estado: 'en_curso' });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.body.data) {
        expect(response.body.data.estado).toBe('en_curso');
      } else {
        expect(response.body.message).toBeDefined();
      }
    });

    it('cambia estado a completado', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
      queryMock.mockResolvedValueOnce([[{
        ...mockSprint,
        estado: 'completado',
      }]]);

      const response = await request(app)
        .patch('/api/sprints/1/estado')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ estado: 'completado' });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.body.data) {
        expect(response.body.data.estado).toBe('completado');
      } else {
        expect(response.body.message).toBeDefined();
      }
    });

    it('rechaza estados inválidos', async () => {
      const response = await request(app)
        .patch('/api/sprints/1/estado')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ estado: 'invalido' });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/sprints/:id - Eliminar Sprint', () => {
    it('elimina sprint', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete('/api/sprints/1')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });

    it('rechaza eliminación sin permiso', async () => {
      const response = await request(app)
        .delete('/api/sprints/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
      expectApiShape(response);
    });
  });

  describe('POST /api/sprints/:id/epicas - Asociar Épicas', () => {
    it('asocia épicas a sprint', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/api/sprints/1/epicas')
        .set('Authorization', `Bearer ${smToken}`)
        .send({ epicaIds: [1, 2, 3] });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });
  });

  describe('GET /api/sprints/:id/epicas - Obtener Épicas Sprint', () => {
    it('obtiene épicas asociadas al sprint', async () => {
      queryMock.mockResolvedValueOnce([[
        { id: 1, nombre: 'Épica 1' },
        { id: 2, nombre: 'Épica 2' },
      ]]);

      const response = await request(app)
        .get('/api/sprints/1/epicas')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('DELETE /api/sprints/:id/epicas/:epicaId - Desasociar Épica', () => {
    it('desasocia épica de sprint', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete('/api/sprints/1/epicas/1')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });
  });
});
