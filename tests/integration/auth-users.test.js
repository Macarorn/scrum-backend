import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1h";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "7d";

let app;

beforeAll(async () => {
  const module = await import("../../src/app.js");
  app = module.default;
});

describe("Integracion Auth + Usuarios", () => {
  let adminToken = "";
  let userToken = "";
  let refreshToken = "";
  let userId = 0;

  it("POST /api/auth/register registra usuario", async () => {
    const response = await request(app).post("/api/auth/register").send({
      nombre: "Usuario Prueba",
      email: "usuario.prueba@scrum.local",
      password: "Password123",
      confirmPassword: "Password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("usuario.prueba@scrum.local");
    userId = response.body.data.id_usuario;
  });

  it("POST /api/auth/login autentica admin", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "admin@scrum.local",
      password: "Admin1234",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).toBeTruthy();

    adminToken = response.body.data.accessToken;
    refreshToken = response.body.data.refreshToken;
  });

  it("POST /api/auth/refresh-token refresca token", async () => {
    const response = await request(app)
      .post("/api/auth/refresh-token")
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it("GET /api/usuarios lista usuarios como admin", async () => {
    const response = await request(app)
      .get("/api/usuarios")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("GET /api/usuarios/:id obtiene usuario", async () => {
    const response = await request(app)
      .get(`/api/usuarios/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id_usuario).toBe(userId);
  });

  it("PUT /api/usuarios/:id actualiza usuario", async () => {
    const response = await request(app)
      .put(`/api/usuarios/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Usuario Editado" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.nombre).toBe("Usuario Editado");
  });

  it("POST /api/usuarios/:id/asignar-rol asigna rol", async () => {
    const response = await request(app)
      .post(`/api/usuarios/${userId}/asignar-rol`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_rol: 2 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.roles[0].id_rol).toBe(2);
  });

  it("POST /api/auth/login autentica usuario normal", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "usuario.prueba@scrum.local",
      password: "Password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    userToken = response.body.data.accessToken;
  });

  it("GET /api/perfil obtiene perfil autenticado", async () => {
    const response = await request(app)
      .get("/api/perfil")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("usuario.prueba@scrum.local");
  });

  it("PUT /api/perfil actualiza perfil autenticado", async () => {
    const response = await request(app)
      .put("/api/perfil")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ nombre: "Perfil Actualizado" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.nombre).toBe("Perfil Actualizado");
  });

  it("GET /api/roles y /api/permisos listan catalogos", async () => {
    const rolesResponse = await request(app)
      .get("/api/roles")
      .set("Authorization", `Bearer ${adminToken}`);

    const permisosResponse = await request(app)
      .get("/api/permisos")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(rolesResponse.status).toBe(200);
    expect(permisosResponse.status).toBe(200);
    expect(rolesResponse.body.success).toBe(true);
    expect(permisosResponse.body.success).toBe(true);
  });

  it("POST /api/auth/logout cierra sesion", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("DELETE /api/usuarios/:id elimina usuario", async () => {
    const response = await request(app)
      .delete(`/api/usuarios/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
