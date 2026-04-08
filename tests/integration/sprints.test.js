import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.USE_AUTH = "true";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1h";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../../src/utils/database.js", () => ({
  default: {
    query: queryMock,
  },
}));

const { generateToken } = await import("../../src/utils/jwt.utils.js");
const { default: app } = await import("../../src/app.js");

describe("Sprints API", () => {
  const token = generateToken(20, "sprint.qa@scrum.local", "Scrum Master");

  beforeEach(() => {
    queryMock.mockReset();
  });

  it("crea, lista, obtiene, actualiza, cambia estado y elimina sprints", async () => {
    queryMock.mockResolvedValueOnce([{ insertId: 101 }]);

    const crear = await request(app)
      .post("/api/sprints")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_proyecto: 1,
        nombre: "Sprint Expo",
        meta: "Entrega para la expo",
        fecha_inicio: "2026-04-07",
        fecha_fin: "2026-04-21",
        estado: "planeado",
        velocidad_estimada: 20,
      });

    expect(crear.statusCode).toBe(201);
    expect(crear.body.success).toBe(true);
    expect(crear.body.data.id_sprint).toBe(101);

    queryMock.mockResolvedValueOnce([
      [{ id_sprint: 101, nombre: "Sprint Expo" }],
    ]);
    const listar = await request(app)
      .get("/api/sprints")
      .set("Authorization", `Bearer ${token}`);

    expect(listar.statusCode).toBe(200);
    expect(Array.isArray(listar.body.data)).toBe(true);

    queryMock.mockResolvedValueOnce([
      [{ id_sprint: 101, nombre: "Sprint Expo" }],
    ]);
    const obtener = await request(app)
      .get("/api/sprints/101")
      .set("Authorization", `Bearer ${token}`);

    expect(obtener.statusCode).toBe(200);
    expect(obtener.body.data.id_sprint).toBe(101);

    queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const actualizar = await request(app)
      .put("/api/sprints/101")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_proyecto: 1,
        nombre: "Sprint Expo v2",
        meta: "Entrega para la expo v2",
        fecha_inicio: "2026-04-07",
        fecha_fin: "2026-04-28",
        estado: "en_curso",
        velocidad_estimada: 24,
      });

    expect(actualizar.statusCode).toBe(200);

    queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const estado = await request(app)
      .patch("/api/sprints/101/estado")
      .set("Authorization", `Bearer ${token}`)
      .send({ estado: "completado" });

    expect(estado.statusCode).toBe(200);
    expect(estado.body.success).toBe(true);

    queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const eliminar = await request(app)
      .delete("/api/sprints/101")
      .set("Authorization", `Bearer ${token}`);

    expect(eliminar.statusCode).toBe(200);
    expect(eliminar.body.success).toBe(true);
  });

  it("rechaza estados invalidos", async () => {
    const response = await request(app)
      .patch("/api/sprints/101/estado")
      .set("Authorization", `Bearer ${token}`)
      .send({ estado: "invalido" });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
