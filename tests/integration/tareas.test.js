import request from "supertest";
import { describe, expect, it } from "vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1h";
process.env.RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || "15";
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || "100";

const { generateToken } = await import("../../src/utils/jwt.utils.js");
const { default: app } = await import("../../src/app.js");

describe("Tareas API CRUD", () => {
  const token = generateToken(10, "qa@example.com", "Scrum Master");
  let tareaId;

  it("crea una tarea", async () => {
    const response = await request(app)
      .post("/api/tareas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        titulo: "Tarea de prueba",
        descripcion: "Descripcion",
        sprintId: 1,
        responsableId: 10,
        prioridad: 3,
        tipo: "feature",
        storyPoints: 5,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("id");
    tareaId = response.body.data.id;
  });

  it("lista tareas", async () => {
    const response = await request(app)
      .get("/api/tareas?sprintId=1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("obtiene una tarea por id", async () => {
    const response = await request(app)
      .get(`/api/tareas/${tareaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(tareaId);
  });

  it("actualiza una tarea", async () => {
    const response = await request(app)
      .put(`/api/tareas/${tareaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ prioridad: 2, storyPoints: 8 });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.prioridad).toBe(2);
  });

  it("elimina una tarea con soft delete", async () => {
    const response = await request(app)
      .delete(`/api/tareas/${tareaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.softDelete).toBe(true);
  });
});
