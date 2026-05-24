import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pool from "../../src/utils/database.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1h";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "7d";

let app;
let proyectoId = null;
let usuarioA = null;
let usuarioB = null;
let tokenA = null;
let tokenB = null;

beforeAll(async () => {
  const module = await import("../../src/app.js");
  app = module.default;
});

describe("Integracion Solicitudes - Caso miembro ya en proyecto", () => {
  const uniqueId = Date.now();
  usuarioA = {
    nombre: `Usuario A ${uniqueId}`,
    email: `usuario.a.${uniqueId}@scrum.local`,
    password: "Password123",
  };
  usuarioB = {
    nombre: `Usuario B ${uniqueId}`,
    email: `usuario.b.${uniqueId}@scrum.local`,
    password: "Password123",
  };

  it("registra y autentica a dos usuarios nuevos", async () => {
    const registerA = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: usuarioA.nombre,
        email: usuarioA.email,
        password: usuarioA.password,
        confirmPassword: usuarioA.password,
      });

    expect(registerA.status).toBe(201);
    expect(registerA.body.success).toBe(true);
    expect(registerA.body.data.email).toBe(usuarioA.email);

    const loginA = await request(app).post("/api/auth/login").send({
      email: usuarioA.email,
      password: usuarioA.password,
    });

    expect(loginA.status).toBe(200);
    expect(loginA.body.success).toBe(true);
    tokenA = loginA.body.data.accessToken;

    const registerB = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: usuarioB.nombre,
        email: usuarioB.email,
        password: usuarioB.password,
        confirmPassword: usuarioB.password,
      });

    expect(registerB.status).toBe(201);
    expect(registerB.body.success).toBe(true);
    expect(registerB.body.data.email).toBe(usuarioB.email);
    usuarioB.id_usuario = registerB.body.data.id_usuario;

    const loginB = await request(app).post("/api/auth/login").send({
      email: usuarioB.email,
      password: usuarioB.password,
    });

    expect(loginB.status).toBe(200);
    expect(loginB.body.success).toBe(true);
    tokenB = loginB.body.data.accessToken;
  });

  it("crea un proyecto con usuario A y obtiene el id", async () => {
    const response = await request(app)
      .post("/api/proyectos")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        nombre: `Proyecto de prueba ${uniqueId}`,
        descripcion: "Proyecto de prueba para solicitud de membresia",
        tipo: "Desarrollo",
        codigo_proyecto: `PRUEBA-${uniqueId}`,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("id_proyecto");
    proyectoId = response.body.data.id_proyecto;
  });

  it("agrega a usuario B al equipo del proyecto directamente en la base de datos", async () => {
    const [insertTeam] = await pool.query(
      "INSERT INTO equipo_proyecto (id_proyecto, nombre, descripcion) VALUES (?, ?, ?)",
      [proyectoId, `Equipo prueba ${uniqueId}`, "Equipo creado para la prueba"],
    );

    const idEquipoProyecto = insertTeam.insertId;
    expect(idEquipoProyecto).toBeGreaterThan(0);

    await pool.query(
      `INSERT INTO usuario_equipo_proyecto (id_usuario, id_equipo_proyecto, id_rol)
       VALUES (?, ?, ?)`,
      [usuarioB.id_usuario, idEquipoProyecto, 5],
    );

    const [membershipCount] = await pool.query(
      `SELECT COUNT(*) AS cantidad FROM usuario_equipo_proyecto
       WHERE id_usuario = ? AND id_equipo_proyecto = ?`,
      [usuarioB.id_usuario, idEquipoProyecto],
    );

    expect(membershipCount[0].cantidad).toBe(1);
  });

  it("rechaza crear solicitud si el usuario ya es miembro del proyecto", async () => {
    const [beforeCount] = await pool.query(
      `SELECT COUNT(*) AS cantidad FROM solicitud WHERE id_usuario = (
        SELECT id_usuario FROM usuario WHERE email = ?
      ) AND id_proyecto = ?`,
      [usuarioB.email, proyectoId],
    );

    const [notificationsBefore] = await pool.query(
      `SELECT COUNT(*) AS cantidad FROM notificacion WHERE id_usuario = (
        SELECT creado_por FROM proyecto WHERE id_proyecto = ?
      )`,
      [proyectoId],
    );

    const response = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        id_proyecto: proyectoId,
        mensaje_opcional: "Quiero unirme de nuevo",
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Ya eres miembro");

    const [afterCount] = await pool.query(
      `SELECT COUNT(*) AS cantidad FROM solicitud WHERE id_usuario = (
        SELECT id_usuario FROM usuario WHERE email = ?
      ) AND id_proyecto = ?`,
      [usuarioB.email, proyectoId],
    );

    const [notificationsAfter] = await pool.query(
      `SELECT COUNT(*) AS cantidad FROM notificacion WHERE id_usuario = (
        SELECT creado_por FROM proyecto WHERE id_proyecto = ?
      )`,
      [proyectoId],
    );

    expect(afterCount[0].cantidad).toBe(beforeCount[0].cantidad);
    expect(notificationsAfter[0].cantidad).toBe(notificationsBefore[0].cantidad);

    const [membershipCount] = await pool.query(
      `SELECT COUNT(*) AS cantidad FROM usuario_equipo_proyecto uep
       JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
       WHERE uep.id_usuario = (
         SELECT id_usuario FROM usuario WHERE email = ?
       ) AND ep.id_proyecto = ?`,
      [usuarioB.email, proyectoId],
    );

    expect(membershipCount[0].cantidad).toBe(1);
  });
});

afterAll(async () => {
  if (proyectoId) {
    await pool.query("DELETE FROM proyecto WHERE id_proyecto = ?", [proyectoId]);
  }
  await pool.query("DELETE FROM usuario WHERE email IN (?, ?)", [
    usuarioA.email,
    usuarioB.email,
  ]);
});
