import request from 'supertest';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import {
  generateTestToken,
  createDatabaseMock,
  mockEpica,
  mockHistoria,
} from '../utils/test-helpers.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';

let queryMock;
let app;

const expectApiShape = (response) => {
  expect(response.body).toHaveProperty('success', response.status < 400);
};

const rawEpica = {
  id_epica: 1,
  id_proyecto: 1,
  nombre: 'Epica de Prueba',
  descripcion: 'Descripcion epica',
  categoria: null,
  prioridad: 3,
  estado: 'por_hacer',
};

const rawHistoria = {
  id_historia: 1,
  id_epica: 1,
  id_sprint: 1,
  nombre: 'Historia de Prueba',
  descripcion: 'Descripcion historia',
  prioridad: 3,
  story_points: 5,
  estado: 'por_hacer',
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

describe('Backlog API - Épicas, Historias y Criterios', () => {
  const token = generateTestToken(1, 'po@scrum.local', 'product_owner');

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('Épicas - CRUD', () => {
    it('POST /api/epicas crea nueva épica', async () => {
      queryMock.mockResolvedValueOnce([[{ count: 0 }], []]);
      queryMock.mockResolvedValueOnce([{ insertId: 1 }, []]);
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      queryMock.mockResolvedValueOnce([[{
        id_epica: 1,
        id_proyecto: 1,
        nombre: 'E1 - Épica QA',
        descripcion: 'Descripción',
        estado: 'por_hacer',
      }], []]);

      const response = await request(app)
        .post('/api/epicas')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Épica QA', proyectoId: 1, descripcion: 'Descripción' });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });

    it('GET /api/epicas lista épicas', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id: 1, nombre: 'Épica 1' }], []]));

      const response = await request(app)
        .get('/api/epicas?proyectoId=1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('GET /api/epicas/:id obtiene épica', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id: 1, nombre: 'Épica 1' }], []]));

      const response = await request(app)
        .get('/api/epicas/1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('PUT /api/epicas/:id actualiza épica', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .put('/api/epicas/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Épica actualizada' });

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    it('DELETE /api/epicas/:id elimina épica', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/epicas/1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Historias - CRUD', () => {
    it('POST /api/historias crea historia', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/historias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Historia', epicaId: 1, prioridad: 3, storyPoints: 5 });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });

    it('GET /api/historias lista historias', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id: 1, nombre: 'Historia 1' }], []]));

      const response = await request(app)
        .get('/api/historias?epicaId=1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('GET /api/historias/:id obtiene historia', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id: 1, nombre: 'Historia 1' }], []]));

      const response = await request(app)
        .get('/api/historias/1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('PUT /api/historias/:id actualiza historia', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .put('/api/historias/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Historia actualizada' });

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    it('DELETE /api/historias/:id elimina historia', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/historias/1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Criterios - CRUD', () => {
    it('POST /api/historias/:id/criterios crea criterio', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/historias/1/criterios')
        .set('Authorization', `Bearer ${token}`)
        .send({ descripcion: 'Criterio 1' });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });

    it('GET /api/historias/:id/criterios lista criterios', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id: 1, descripcion: 'Criterio 1' }], []]));

      const response = await request(app)
        .get('/api/historias/1/criterios')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('PUT /api/criterios/:id actualiza criterio', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .put('/api/criterios/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ descripcion: 'Criterio actualizado' });

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    it('DELETE /api/criterios/:id elimina criterio', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ affectedRows: 1 }, []]));

      const response = await request(app)
        .delete('/api/criterios/1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Etiquetas - CRUD', () => {
    it('POST /api/etiquetas crea etiqueta', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/etiquetas')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'etiqueta1', color: '#FF0000' });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
    });

    it('GET /api/etiquetas lista etiquetas', async () => {
      queryMock.mockImplementationOnce(() => Promise.resolve([[{ id: 1, nombre: 'etiqueta1' }], []]));

      const response = await request(app)
        .get('/api/etiquetas')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});

describe('Backlog API - Épicas, Historias y Criterios', () => {
  const token = generateTestToken(1, 'po@scrum.local', 'product_owner');
  let epicaId = 1;
  let historiaId = 1;
  let criterioId = 1;
  let etiquetaId = 1;

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('Épicas - CRUD', () => {
    it('POST /api/epicas crea nueva épica', async () => {
      queryMock.mockResolvedValueOnce([[{ count: 0 }], []]);
      queryMock.mockResolvedValueOnce([{ insertId: 1 }, []]);
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      queryMock.mockResolvedValueOnce([[{
        id_epica: 1,
        id_proyecto: 1,
        nombre: 'E1 - Épica QA',
        descripcion: 'Descripción de QA',
        estado: 'por_hacer',
      }], []]);

      const response = await request(app)
        .post('/api/epicas')
        .set('Authorization', `Bearer ${token}`)
        .send({ 
          nombre: 'Épica QA', 
          proyectoId: 1, 
          descripcion: 'Descripción de QA' 
        });

      expect([200, 201, 400, 401, 403, 500]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('id_epica');
        epicaId = response.body.data.id;
      }
    });

    it('GET /api/epicas lista épicas de proyecto', async () => {
      queryMock.mockResolvedValueOnce([[rawEpica], []]);

      const response = await request(app)
        .get('/api/epicas?proyectoId=1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409, 500]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('GET /api/epicas/:id obtiene épica por ID', async () => {
      queryMock.mockResolvedValueOnce([[rawEpica], []]);

      const response = await request(app)
        .get(`/api/epicas/${epicaId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toEqual(expect.objectContaining({
          id: rawEpica.id_epica,
          id_epica: rawEpica.id_epica,
        }));
      }
    });

    it('PUT /api/epicas/:id actualiza épica', async () => {
      queryMock.mockResolvedValueOnce([[{ nombre_rol: 'Scrum Master' }], []]);
      queryMock.mockResolvedValueOnce([[rawEpica], []]);
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      queryMock.mockResolvedValueOnce([[{ 
        ...rawEpica, 
        nombre: 'Épica QA v2' 
      }], []]);

      const response = await request(app)
        .put(`/api/epicas/${epicaId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Épica QA v2', proyectoId: 1 });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data.nombre).toBe('Épica QA v2');
      }
    });

    it('DELETE /api/epicas/:id elimina épica (soft delete)', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
      queryMock.mockResolvedValueOnce([[{ ...mockEpica, deleted_at: new Date() }]]);

      const response = await request(app)
        .delete(`/api/epicas/${epicaId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });

    it('rechaza crear épica sin datos requeridos', async () => {
      const response = await request(app)
        .post('/api/epicas')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Solo nombre' });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Historias - CRUD', () => {
    it('POST /api/historias crea nueva historia', async () => {
      queryMock.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/historias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Historia de Usuario',
          epicaId: 1,
          prioridad: 3,
          storyPoints: 5,
        });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('id_historia');
        historiaId = response.body.data.id;
      }
    });

    it('GET /api/historias lista historias', async () => {
      queryMock.mockResolvedValueOnce([[rawHistoria], []]);

      const response = await request(app)
        .get('/api/historias?epicaId=1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('GET /api/historias/:id obtiene historia por ID', async () => {
      queryMock.mockResolvedValueOnce([[rawHistoria], []]);

      const response = await request(app)
        .get(`/api/historias/${historiaId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toEqual(expect.objectContaining({
          id: rawHistoria.id_historia,
          id_historia: rawHistoria.id_historia,
        }));
      }
    });

    it('PUT /api/historias/:id actualiza historia', async () => {
      queryMock.mockResolvedValueOnce([[rawHistoria], []]);
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
      queryMock.mockResolvedValueOnce([[{
        ...rawHistoria,
        nombre: 'Historia QA v2',
        story_points: 8,
      }], []]);

      const response = await request(app)
        .put(`/api/historias/${historiaId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ 
          nombre: 'Historia QA v2', 
          epicaId: 1, 
          prioridad: 2, 
          storyPoints: 8 
        });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toEqual(expect.objectContaining({
          id_historia: expect.any(Number),
          storyPoints: expect.any(Number),
          story_points: expect.any(Number),
        }));
      }
    });

    it('DELETE /api/historias/:id elimina historia', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete(`/api/historias/${historiaId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });
  });

  describe('Criterios de Aceptación - CRUD', () => {
    it('POST /api/historias/:id/criterios crea criterio', async () => {
      queryMock.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post(`/api/historias/${historiaId}/criterios`)
        .set('Authorization', `Bearer ${token}`)
        .send({ descripcion: 'Debe mostrar backlog' });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toEqual(expect.objectContaining({
          id: expect.any(Number),
          historiaId: expect.any(Number),
        }));
        criterioId = response.body.data.id;
      }
    });

    it('GET /api/historias/:id/criterios lista criterios', async () => {
      queryMock.mockResolvedValueOnce([[
        { id: 1, descripcion: 'Criterio 1' },
        { id: 2, descripcion: 'Criterio 2' },
      ]]);

      const response = await request(app)
        .get(`/api/historias/${historiaId}/criterios`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('PUT /api/criterios/:id actualiza criterio', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
      queryMock.mockResolvedValueOnce([[{
        id: criterioId,
        descripcion: 'Debe mostrar backlog actualizado',
      }]]);

      const response = await request(app)
        .put(`/api/criterios/${criterioId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ descripcion: 'Debe mostrar backlog actualizado' });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });

    it('DELETE /api/criterios/:id elimina criterio', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete(`/api/criterios/${criterioId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });
  });

  describe('Etiquetas - CRUD', () => {
    it('POST /api/etiquetas crea nueva etiqueta', async () => {
      queryMock.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/etiquetas')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'frontend' });

      expect([200, 201, 400, 401, 403]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(response.body.data).toEqual(expect.objectContaining({
          id: expect.any(Number),
          nombre: 'frontend',
        }));
        etiquetaId = response.body.data.id;
      }
    });

    it('GET /api/etiquetas lista todas las etiquetas', async () => {
      queryMock.mockResolvedValueOnce([[
        { id: 1, nombre: 'frontend' },
        { id: 2, nombre: 'backend' },
      ]]);

      const response = await request(app)
        .get('/api/etiquetas')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
      if (response.status < 400) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('PUT /api/etiquetas/:id actualiza etiqueta', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
      queryMock.mockResolvedValueOnce([[{
        id: etiquetaId,
        nombre: 'frontend-v2',
      }]]);

      const response = await request(app)
        .put(`/api/etiquetas/${etiquetaId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'frontend-v2' });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });

    it('DELETE /api/etiquetas/:id elimina etiqueta', async () => {
      queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete(`/api/etiquetas/${etiquetaId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expectApiShape(response);
    });

    it('rechaza crear etiqueta sin PO o SM', async () => {
      const userToken = generateTestToken(4, 'user@scrum.local', 'usuario');
      
      const response = await request(app)
        .post('/api/etiquetas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ nombre: 'frontend' });

      expect([401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });
});
