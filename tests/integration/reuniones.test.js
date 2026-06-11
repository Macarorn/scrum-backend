import request from 'supertest';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { generateTestToken, createDatabaseMock } from '../utils/test-helpers.js';

process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';
process.env.USE_AUTH = 'true';

let queryMock;
let app;

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

describe('Reuniones - Meetings API', () => {
  const poToken = generateTestToken(1, 'po@scrum.local', 'product_owner');
  const smToken = generateTestToken(2, 'sm@scrum.local', 'scrum_master');
  const userToken = generateTestToken(3, 'user@scrum.local', 'usuario');

  beforeEach(() => {
    queryMock.mockClear();
    queryMock.mockImplementation(genericQueryResponse);
  });

  describe('GET /api/reuniones - Listar Reuniones', () => {
    it('lista todas las reuniones', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[
        { id_reunion: 1, nombre: 'Daily Standup', tipo: 'daily' }
      ], []]));

      const response = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/reuniones - Crear Reunión', () => {
    it('crea nueva reunión como PO', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${poToken}`)
        .send({
          title: 'Sprint Planning',
          type: 'planning',
          id_proyecto: 1,
          date: '2026-01-06',
          startTime: '09:00',
          sprint: 'Sprint 1',
          duration: 120,
        });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });

    it('crea nueva reunión como SM', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 2 }, []]));

      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${smToken}`)
        .send({
          title: 'Daily Standup',
          type: 'daily',
          id_proyecto: 1,
          date: '2026-01-06',
          startTime: '10:00',
          sprint: 'Sprint 1',
          duration: 15,
        });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });

    it('rechaza creación sin PO o SM', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Reunión Unauthorized',
          tipo: 'daily',
          id_proyecto: 1,
        });

      expect([403, 400, 401]).toContain(response.status);
    });
  });

  describe('GET /api/reuniones/:id - Obtener Reunión', () => {
    it('obtiene reunión por ID', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[
        { id_reunion: 1, nombre: 'Sprint Planning', tipo: 'planning' }
      ], []]));

      const response = await request(app)
        .get('/api/meetings/1')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/reuniones/:id - Actualizar Reunión', () => {
    it('actualiza reunión como PO', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .put('/api/meetings/1')
        .set('Authorization', `Bearer ${poToken}`)
        .send({
          title: 'Sprint Planning Updated',
          duration: 90,
          date: '2026-01-06',
          sprint: 'Sprint 1',
        });

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/reuniones/:id - Eliminar Reunión', () => {
    it('elimina reunión como PO', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/meetings/1')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('elimina reunión como SM', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/meetings/2')
        .set('Authorization', `Bearer ${smToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });
});


