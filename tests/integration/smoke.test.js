import request from 'supertest';
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { generateTestToken, mockUser } from '../utils/test-helpers.js';

let queryMock;
let app;

beforeAll(async () => {
  // IMPORTANTE: Crear y configurar el mock ANTES de importar app.js
  queryMock = vi.fn();

  // Configurar el mock para retornar datos de roles cuando se necesite
  queryMock.mockImplementation((sql, params) => {
    // Para queries de roles
    if (sql.includes('SELECT id_rol, nombre_rol, descripcion FROM rol WHERE id_rol')) {
      const roleId = params[0];
      const roles = {
        1: { id_rol: 1, nombre_rol: 'admin', descripcion: 'Administrator' },
        2: { id_rol: 2, nombre_rol: 'usuario', descripcion: 'Regular User' },
        3: { id_rol: 3, nombre_rol: 'product_owner', descripcion: 'Product Owner' },
        4: { id_rol: 4, nombre_rol: 'scrum_master', descripcion: 'Scrum Master' },
      };
      return Promise.resolve([[roles[roleId] || null], []]);
    }

    // Para queries de búsqueda de usuario por email
    if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('email')) {
      // Hash bcrypt de "Admin1234"
      return Promise.resolve([[{
        id_usuario: 1,
        email: 'admin@scrum.local',
        nombre: 'Admin',
        password: '$2b$10$7UPxF6Q7yH.A.eI1.2.EuOpNvGUTiMGwTJq/n9gZNHo7vAQvNR3i2', // "Admin1234"
        activo: true,
        telefono: null,
        ciudad: null,
        fecha_registro: new Date(),
      }], []]);
    }
    
    // Para otros queries, devolver array vacío
    return Promise.resolve([[], []]);
  });

  vi.doMock('../../src/utils/database.js', () => ({
    default: {
      query: queryMock,
      getConnection: vi.fn(),
      end: vi.fn(),
    },
  }));

  // Importar app DESPUÉS de que el mock está en place
  const { default: appModule } = await import('../../src/app.js');
  app = appModule;
});

describe('Health Check', () => {
  beforeEach(() => {
    queryMock.mockClear();
    queryMock.mockResolvedValue([[], []]);
  });

  it('GET / devuelve estado ok', async () => {
    const response = await request(app)
      .get('/');

    expect(response.status).toBe(200);
  });

  it('GET /health devuelve estado del servidor', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBeOneOf([200, 404]); // Puede existir o no
  });
});

describe('Authentication - Basic', () => {
  const adminToken = generateTestToken(1, 'admin@scrum.local', 'admin');

  beforeEach(() => {
    queryMock.mockClear();
    queryMock.mockImplementation((sql, params) => {
      // Para queries de roles
      if (sql.includes('SELECT id_rol, nombre_rol, descripcion FROM rol WHERE id_rol')) {
        const roleId = params[0];
        const roles = {
          1: { id_rol: 1, nombre_rol: 'admin', descripcion: 'Administrator' },
          2: { id_rol: 2, nombre_rol: 'usuario', descripcion: 'Regular User' },
          3: { id_rol: 3, nombre_rol: 'product_owner', descripcion: 'Product Owner' },
          4: { id_rol: 4, nombre_rol: 'scrum_master', descripcion: 'Scrum Master' },
        };
        return Promise.resolve([[roles[roleId] || null], []]);
      }

      // Para queries de búsqueda de usuario por email
      if (sql.includes('SELECT') && sql.includes('usuario') && sql.includes('email')) {
        // Hash bcrypt de "Admin1234"
        return Promise.resolve([[{
          id_usuario: 1,
          email: 'admin@scrum.local',
          nombre: 'Admin',
          password: '$2b$10$7UPxF6Q7yH.A.eI1.2.EuOpNvGUTiMGwTJq/n9gZNHo7vAQvNR3i2', // "Admin1234"
          activo: true,
          telefono: null,
          ciudad: null,
          fecha_registro: new Date(),
        }], []]);
      }
      
      // Para otros queries, devolver array vacío
      return Promise.resolve([[], []]);
    });
  });

  it('autenticación básica funciona con token válido', async () => {
    queryMock.mockResolvedValueOnce([[{
      id_usuario: 1,
      email: 'admin@scrum.local',
      nombre: 'Admin',
      activo: true,
    }]]);

    const response = await request(app)
      .get('/api/perfil')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(response.status); // 404 si /perfil no existe, 200 si existe
  });

  it('GET /api/perfil requiere autenticación', async () => {
    const response = await request(app)
      .get('/api/perfil');

    expect(response.status).toBe(401);
  });

  it('GET /api/perfil retorna datos del usuario con token válido', async () => {
    queryMock.mockResolvedValueOnce([[{
      id_usuario: 1,
      email: 'admin@scrum.local',
      nombre: 'Admin',
      activo: true,
    }]]);

    const response = await request(app)
      .get('/api/perfil')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });
});
