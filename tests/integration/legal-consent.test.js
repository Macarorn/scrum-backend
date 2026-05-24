import pool from "../../src/utils/database.js";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createUser } from "../../src/utils/user.store.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1h";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "7d";

let app;
let adminToken = "";
let createdUserId = 0;
let createdUserEmail = "";

beforeAll(async () => {
  const module = await import("../../src/app.js");
  app = module.default;

  let adminRoleId = null;
  const [existingRoles] = await pool.query(
    "SELECT id_rol FROM rol WHERE nombre_rol = ? LIMIT 1",
    ["admin"],
  );

  if (existingRoles.length > 0) {
    adminRoleId = existingRoles[0].id_rol;
  } else {
    const [result] = await pool.query(
      "INSERT INTO rol (nombre_rol, descripcion) VALUES (?, ?)",
      ["admin", "Acceso total al sistema"],
    );
    adminRoleId = result.insertId;
  }

  try {
    await createUser({
      nombre: "Admin Consent",
      email: "admin.consent@scrum.local",
      password: "Admin1234",
      id_rol: adminRoleId,
      consent_granted: true,
      consent_version: "v1.0",
    });
  } catch (error) {
    if (error.error !== "EMAIL_ALREADY_EXISTS") {
      throw error;
    }
  }

  const loginResponse = await request(app).post("/api/auth/login").send({
    email: "admin.consent@scrum.local",
    password: "Admin1234",
  });

  expect(loginResponse.status).toBe(200);
  adminToken = loginResponse.body.data.accessToken;
});

describe("Integracion Legal y Consentimiento", () => {
  it("GET /api/legal/terms devuelve la version activa", async () => {
    const response = await request(app).get("/api/legal/terms");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      version: "v1.0",
    });
    expect(typeof response.body.data.content).toBe("string");
  });

  it("POST /api/auth/register sin consentimiento devuelve error", async () => {
    const response = await request(app).post("/api/auth/register").send({
      nombre: "Consent Test",
      email: "consent.test@scrum.local",
      password: "Password123",
      confirmPassword: "Password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("CONSENT_REQUIRED");
  });

  it("POST /api/auth/register con consentimiento guarda el usuario", async () => {
    const testUserEmail = `consent.test.${Date.now()}@scrum.local`;
    const response = await request(app).post("/api/auth/register").send({
      nombre: "Consent Test",
      email: testUserEmail,
      password: "Password123",
      confirmPassword: "Password123",
      consent_granted: true,
      consent_version: "v1.0",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(testUserEmail);
    createdUserId = response.body.data.id_usuario;
    createdUserEmail = testUserEmail;
  });

  it("GET /api/usuarios/:id/consent devuelve el consentimiento registrado", async () => {
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: createdUserEmail,
      password: "Password123",
    });

    // The login should succeed for the newly registered user.
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    const userToken = loginResponse.body.data.accessToken;

    const response = await request(app)
      .get(`/api/usuarios/${createdUserId}/consent`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.consent).toMatchObject({
      consent_version: "v1.0",
      accepted: true,
    });
  });
});
