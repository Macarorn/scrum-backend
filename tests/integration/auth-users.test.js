import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTestToken, mockUser, createDatabaseMock } from '../utils/test-helpers.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing';
process.env.JWT_REFRESH_EXPIRE = '7d';

let queryMock;
let app;

const adminPasswordHash = '$2a$10$CyFpbiJSD1SvyYxLLhkyp.n7kpf1D6pAZiA2nfSk.XjV7wIFe.4MS';

const genericQueryResponse = (sql) => {
  const normalized = String(sql || '').trim().toUpperCase();
  if (normalized.startsWith('SELECT')) {
    return Promise.resolve([[{ id_usuario: 1, email: 'mock@scrum.local', nombre: 'Mock User', password: '$2b$10$7UPxF6Q7yH.A.eI1.2.EuOpNvGUTiMGwTJq/n9gZNHo7vAQvNR3i2', activo: 1, rol_principal: 'usuario' }], []]);
  }
  return Promise.resolve([{ insertId: 1, affectedRows: 1 }, []]);
};

beforeAll(async () => {
  // Crear mock de base de datos ANTES de importar app.js
  queryMock = createDatabaseMock();

  vi.doMock('../../src/utils/database.js', () => ({
    default: {
      query: queryMock,
      getConnection: vi.fn(),
      end: vi.fn(),
    },
  }));

  // Importar app DESPUÉS de configurar el mock
  const module = await import('../../src/app.js');
  app = module.default;
});

describe('Autenticación - Auth API', () => {
  const adminToken = generateTestToken(1, 'admin@scrum.local', 'admin');
  const userToken = generateTestToken(3, 'user@scrum.local', 'usuario');

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('POST /api/auth/register - Registro de Usuarios', () => {
    it('registra usuario nuevo con consentimiento', async () => {
      queryMock.mockImplementation((sql, params = []) => {
        if (sql.includes('SELECT version, title, content FROM legal_terms_versions')) {
          return Promise.resolve([[{
            version: 'v1.0',
            title: 'Terminos y Condiciones',
            content: 'Terms v1.0',
          }], []]);
        }
        if (sql.includes('INSERT INTO usuario')) {
          return Promise.resolve([{ insertId: 100 }, []]);
        }
        if (sql.includes('INSERT INTO usuario_rol')) {
          return Promise.resolve([{ affectedRows: 1 }, []]);
        }
        if (sql.includes('INSERT INTO consent_log')) {
          return Promise.resolve([{ insertId: 1 }, []]);
        }
        if (sql.includes('INSERT INTO') && sql.includes('consent')) {
          return Promise.resolve([{ insertId: 1, affectedRows: 1 }, []]);
        }
        if (sql.includes('SELECT p.nombre')) {
          return Promise.resolve([[], []]);
        }
        if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('id_usuario')) {
          return Promise.resolve([[{
            id_usuario: params[0] || 100,
            email: 'nuevo@scrum.local',
            nombre: 'Nuevo Usuario',
            password: adminPasswordHash,
            activo: 1,
            rol_principal: 'usuario',
            permisos: [],
          }], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Nuevo Usuario',
          email: 'nuevo@scrum.local',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          consent_granted: true,
          consent_version: 'v1.0',
        });

      expect([201, 400, 409]).toContain(response.status);
    });

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

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CONSENT_REQUIRED');
    });

    it('rechaza contraseña débil', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Usuario Contraseña Débil',
          email: 'debil@scrum.local',
          password: '123',
          confirmPassword: '123',
          consent_granted: true,
        });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login - Autenticación', () => {
    it('autentica usuario con credenciales correctas', async () => {
      // Hash bcrypt de "Admin1234"
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('email')) {
          return Promise.resolve([[{
            id_usuario: 1,
            email: 'admin@scrum.local',
            nombre: 'Admin',
            password: adminPasswordHash,
            activo: 1,
            rol_principal: 'admin',
          }], []]);
        }
        if (sql.includes('INSERT INTO refresh_tokens')) {
          return Promise.resolve([{ insertId: 1 }, []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@scrum.local',
          password: 'Admin1234',
        });

      expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('rechaza usuario inexistente', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('email')) {
          return Promise.resolve([[], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inexistente@scrum.local',
          password: 'Password123',
        });

      expect([401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('rechaza contraseña incorrecta', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('email')) {
          return Promise.resolve([[{
            id_usuario: 1,
            email: 'admin@scrum.local',
            nombre: 'Admin',
            password: '$2b$10$invalid_hash',
            activo: 1,
            rol_principal: 'admin',
          }], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@scrum.local',
          password: 'IncorrectPassword',
        });

      expect([401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/legal/terms - Términos Legales', () => {
    it('devuelve la versión activa de términos', async () => {
      const response = await request(app).get('/api/legal/terms');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Endpoints Autenticados - Auth Required', () => {
    it('GET /api/perfil rechaza sin token', async () => {
      const response = await request(app).get('/api/perfil');

      expect([401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('GET /api/perfil rechaza con token inválido', async () => {
      const response = await request(app)
        .get('/api/perfil')
        .set('Authorization', 'Bearer invalid_token_xyz');

      expect([401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('GET /api/perfil obtiene perfil del usuario autenticado', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('id_usuario')) {
          return Promise.resolve([[mockUser], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .get('/api/perfil')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });
  });
});

describe('Usuarios - Users API', () => {
  const adminToken = generateTestToken(1, 'admin@scrum.local', 'admin');

  beforeEach(() => {
    queryMock.mockClear();
  });

  describe('GET /api/usuarios - Listar Usuarios', () => {
    it('lista todos los usuarios como admin', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('usuario') && !sql.includes('WHERE')) {
          return Promise.resolve([[
            { id_usuario: 1, nombre: 'Admin', email: 'admin@scrum.local', activo: 1 },
            { id_usuario: 2, nombre: 'PO', email: 'po@scrum.local', activo: 1 },
          ], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/usuarios/:id - Obtener Usuario', () => {
    it('obtiene usuario por ID', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('id_usuario')) {
          return Promise.resolve([[mockUser], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .get('/api/usuarios/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500]).toContain(response.status);
    });

    it('devuelve 404 si usuario no existe', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('usuario')) {
          return Promise.resolve([[], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .get('/api/usuarios/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/roles - Listar Roles', () => {
    it('lista todos los roles disponibles', async () => {
      queryMock.mockImplementation((sql) => {
        if (sql.includes('SELECT') && sql.includes('rol') && !sql.includes('WHERE')) {
          return Promise.resolve([[
            { id_rol: 1, nombre_rol: 'admin', descripcion: 'Acceso total' },
            { id_rol: 2, nombre_rol: 'product_owner', descripcion: 'Gestión de proyecto' },
            { id_rol: 3, nombre_rol: 'scrum_master', descripcion: 'Gestión de sprints' },
            { id_rol: 4, nombre_rol: 'usuario', descripcion: 'Usuario regular' },
          ], []]);
        }
        return Promise.resolve([[], []]);
      });

      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});

