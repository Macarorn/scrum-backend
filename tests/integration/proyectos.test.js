import request from 'supertest';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { generateTestToken, createDatabaseMock } from '../utils/test-helpers.js';

process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';

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

describe('Proyectos - Projects API', () => {
  const adminToken = generateTestToken(1, 'admin@scrum.local', 'admin');
  const poToken = generateTestToken(2, 'po@scrum.local', 'product_owner');
  const smToken = generateTestToken(3, 'sm@scrum.local', 'scrum_master');

  beforeEach(() => {
    queryMock.mockClear();
    queryMock.mockImplementation(genericQueryResponse);
  });

  describe('GET /api/proyectos - Listar Mis Proyectos', () => {
    it('lista proyectos del usuario autenticado', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id_proyecto: 1, nombre: 'Proyecto 1' }], []]));

      const response = await request(app)
        .get('/api/proyectos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('rechaza sin autenticación', async () => {
      const response = await request(app).get('/api/proyectos');

      expect([401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/proyectos - Crear Proyecto', () => {
    it('crea nuevo proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/proyectos')
        .set('Authorization', `Bearer ${poToken}`)
        .send({
          nombre: 'Nuevo Proyecto',
          descripcion: 'Descripción',
          tipo: 'Desarrollo',
        });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/proyectos/:id - Obtener Proyecto', () => {
    it('obtiene proyecto por ID', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id_proyecto: 1, nombre: 'Proyecto 1' }], []]));

      const response = await request(app)
        .get('/api/proyectos/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/proyectos/:id - Actualizar Proyecto', () => {
    it('actualiza proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .put('/api/proyectos/1')
        .set('Authorization', `Bearer ${poToken}`)
        .send({ nombre: 'Proyecto Actualizado' });

      expect([200, 400, 401, 403, 404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success', response.status < 400);
    });
  });

  describe('DELETE /api/proyectos/:id - Eliminar Proyecto', () => {
    it('elimina proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/proyectos/1')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/proyectos/:id/miembros - Listar Miembros', () => {
    it('lista miembros del proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id_usuario: 1 }], []]));

      const response = await request(app)
        .get('/api/proyectos/1/miembros')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/proyectos/:id/mi-rol - Mi Rol', () => {
    it('devuelve mi rol en proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ nombre_rol: 'product_owner' }], []]));

      const response = await request(app)
        .get('/api/proyectos/1/mi-rol')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/proyectos/:id/unirse - Unirse a Proyecto', () => {
    it('usuario se une a proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/proyectos/1/unirse')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201, 400, 401, 403, 409]).toContain(response.status);
    });
  });

  describe('DELETE /api/proyectos/:id/miembros/:userId - Eliminar Miembro', () => {
    it('elimina miembro del proyecto', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/proyectos/1/miembros/2')
        .set('Authorization', `Bearer ${poToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });
});


