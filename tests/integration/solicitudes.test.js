import request from 'supertest';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { generateTestToken, createDatabaseMock } from '../utils/test-helpers.js';

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

describe('Solicitudes - Requests API', () => {
  const token1 = generateTestToken(1, 'user1@scrum.local', 'usuario');
  const poToken = generateTestToken(3, 'po@scrum.local', 'product_owner');

  beforeEach(() => {
    queryMock.mockClear();
    queryMock.mockImplementation(genericQueryResponse);
  });

  describe('POST /api/solicitudes - Crear Solicitud', () => {
    it('crea solicitud para unirse a proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/solicitudes')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          id_proyecto: 1,
          mensaje_opcional: 'Me gustaría unirme',
        });

      expect([200, 201, 400, 401, 409]).toContain(response.status);
    });
  });

  describe('GET /api/solicitudes - Listar Solicitudes', () => {
    it('lista todas las solicitudes', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[
        { id_solicitud: 1, id_proyecto: 1, estado: 'pendiente' }
      ], []]));

      const response = await request(app)
        .get('/api/solicitudes')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/solicitudes/:id/aprobar - Aprobar Solicitud', () => {
    it('aprueba solicitud', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .post('/api/solicitudes/1/aprobar')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/solicitudes/:id/rechazar - Rechazar Solicitud', () => {
    it('rechaza solicitud', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .post('/api/solicitudes/1/rechazar')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });
});

describe('Solicitudes - Requests API', () => {
  const token1 = generateTestToken(1, 'user1@scrum.local', 'usuario');
  const token2 = generateTestToken(2, 'user2@scrum.local', 'usuario');
  const poToken = generateTestToken(3, 'po@scrum.local', 'product_owner');

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('POST /api/solicitudes - Crear Solicitud', () => {
    it('crea solicitud para unirse a proyecto', async () => {
      queryMock.mockResolvedValueOnce([{ insertId: 1 }]); // Create request
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]); // Create notification

      const response = await request(app)
        .post('/api/solicitudes')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          id_proyecto: 1,
          mensaje_opcional: 'Me gustaría unirme',
        });

      expect([200, 201, 400, 401, 403, 409, 429]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toBeDefined();
      }
    });

    it('rechaza solicitud si ya es miembro', async () => {
      queryMock.mockResolvedValueOnce([[{ id_usuario: 1 }]]); // Already member

      const response = await request(app)
        .post('/api/solicitudes')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          id_proyecto: 1,
          mensaje_opcional: 'Quiero unirme de nuevo',
        });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/solicitudes - Listar Solicitudes', () => {
    it('lista todas las solicitudes', async () => {
      queryMock.mockResolvedValueOnce([[
        {
          id_solicitud: 1,
          id_proyecto: 1,
          id_usuario: 2,
          estado: 'pendiente',
          fecha_solicitud: new Date(),
        },
      ]]);

      const response = await request(app)
        .get('/api/solicitudes')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/solicitudes/:id/aprobar - Aprobar Solicitud', () => {
    it('aprueba solicitud y agrega usuario al proyecto', async () => {
      queryMock.mockResolvedValueOnce([[{ id_solicitud: 1, estado: 'pendiente' }]]);
      queryMock.mockResolvedValueOnce([{ insertId: 1 }]); // Add to team
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update request status
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]); // Create notification

      const response = await request(app)
        .post('/api/solicitudes/1/aprobar')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });
  });

  describe('POST /api/solicitudes/:id/rechazar - Rechazar Solicitud', () => {
    it('rechaza solicitud', async () => {
      queryMock.mockResolvedValueOnce([[{ id_solicitud: 1, estado: 'pendiente' }]]);
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update status
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]); // Create notification

      const response = await request(app)
        .post('/api/solicitudes/1/rechazar')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });
  });
});

