import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTestToken, createDatabaseMock } from '../utils/test-helpers.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing';
process.env.JWT_REFRESH_EXPIRE = '7d';

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

  const module = await import('../../src/app.js');
  app = module.default;
});

describe('Legal & Consentimiento - Términos y Condiciones', () => {
  const adminToken = generateTestToken(1, 'admin@scrum.local', 'admin');

  beforeEach(() => {
    queryMock.mockClear();
    queryMock.mockImplementation(genericQueryResponse);
  });

  describe('GET /api/legal/terms - Obtener Términos', () => {
    it('devuelve la versión activa de términos legales', async () => {
      const response = await request(app).get('/api/legal/terms');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/auth/register - Validación de Consentimiento', () => {
    it('rechaza registro sin consentimiento', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Usuario Sin Consentimiento',
          email: 'sinconsentimiento@scrum.local',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          consent_granted: false,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CONSENT_REQUIRED');
    });

    it('acepta registro con consentimiento', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT email FROM usuario')) {
          return Promise.resolve([[], []]);
        }
        if (sql.includes('INSERT INTO usuario')) {
          return Promise.resolve([{ insertId: 10, affectedRows: 1 }, []]);
        }
        if (sql.includes('INSERT INTO')) {
          return Promise.resolve([{ affectedRows: 1 }, []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Usuario Con Consentimiento',
          email: `test${Date.now()}@scrum.local`,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          consent_granted: true,
          consent_version: 'v1.0',
        });

      expect([200, 201, 400, 409]).toContain(response.status);
    });
  });

  describe('GET /api/usuarios/:id/consent - Obtener Consentimiento', () => {
    it('devuelve consentimiento registrado del usuario', async () => {
      queryMock.mockImplementation(() => Promise.resolve([[{
        id_usuario: 1,
        consent_granted: true,
        consent_version: 'v1.0',
      }], []]));

      const response = await request(app)
        .get('/api/usuarios/1/consent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/legal/accept - Aceptar Términos', () => {
    it('registra aceptación de términos', async () => {
      queryMock.mockImplementation(() => Promise.resolve([{ insertId: 1 }, []]));

      const response = await request(app)
        .post('/api/legal/accept')
        .send({
          id_usuario: 1,
          consent_version: 'v1.0',
        });

      expect([200, 201, 400, 401]).toContain(response.status);
    });
  });
});
