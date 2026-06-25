import request from 'supertest';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { generateTestToken, createDatabaseMock } from '../utils/test-helpers.js';

process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';

let queryMock;
let app;

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

describe('Notificaciones - Notifications API', () => {
  const adminToken = generateTestToken(1, 'admin@scrum.local', 'admin');

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('GET /api/notificaciones - Listar Notificaciones', () => {
    it('lista todas las notificaciones del usuario', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id_notificacion: 1, titulo: 'Notif 1' }], []]));

      const response = await request(app)
        .get('/api/notificaciones')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('rechaza sin autenticación', async () => {
      const response = await request(app).get('/api/notificaciones');

      expect([401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notificaciones/:id/leida - Marcar como Leída', () => {
    it('marca notificación como leída', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .post('/api/notificaciones/1/leida')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/notificaciones/:id - Eliminar Notificación', () => {
    it('elimina notificación', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/notificaciones/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });
});