import request from "supertest";
import { describe, expect, it } from "vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1h";
process.env.RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || "15";
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || "100";

const { generateToken } = await import("../../src/utils/jwt.utils.js");
const { default: app } = await import("../../src/app.js");

describe("Backlog API", () => {
  const token = generateToken(7, "po@example.com", "Scrum Master");
  let epicaId;
  let historiaId;
  let criterioId;
  let etiquetaId;

  it("CRUD basico de epicas", async () => {
    const crear = await request(app)
      .post("/api/epicas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Epica QA", proyectoId: 1, descripcion: "desc" });

    expect(crear.statusCode).toBe(201);
    expect(crear.body.success).toBe(true);
    epicaId = crear.body.data.id;

    const listar = await request(app)
      .get("/api/epicas?proyectoId=1")
      .set("Authorization", `Bearer ${token}`);

    expect(listar.statusCode).toBe(200);
    expect(Array.isArray(listar.body.data)).toBe(true);

    const obtener = await request(app)
      .get(`/api/epicas/${epicaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(obtener.statusCode).toBe(200);
    expect(obtener.body.data.id).toBe(epicaId);

    const actualizar = await request(app)
      .put(`/api/epicas/${epicaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Epica QA v2", proyectoId: 1 });

    expect(actualizar.statusCode).toBe(200);
    expect(actualizar.body.data.nombre).toBe("Epica QA v2");

    const eliminar = await request(app)
      .delete(`/api/epicas/${epicaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(eliminar.statusCode).toBe(200);
    expect(eliminar.body.data.softDelete).toBe(true);
  });

  it("CRUD basico de historias y criterios", async () => {
    const crearEpica = await request(app)
      .post("/api/epicas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Epica para historias", proyectoId: 2, descripcion: "desc" });

    epicaId = crearEpica.body.data.id;

    const crearHistoria = await request(app)
      .post("/api/historias")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Historia QA",
        epicaId,
        prioridad: 3,
        storyPoints: 5,
      });

    expect(crearHistoria.statusCode).toBe(201);
    historiaId = crearHistoria.body.data.id;

    const listar = await request(app)
      .get(`/api/historias?epicaId=${epicaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listar.statusCode).toBe(200);
    expect(Array.isArray(listar.body.data)).toBe(true);

    const obtener = await request(app)
      .get(`/api/historias/${historiaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(obtener.statusCode).toBe(200);

    const actualizar = await request(app)
      .put(`/api/historias/${historiaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Historia QA v2", epicaId, prioridad: 2, storyPoints: 8 });

    expect(actualizar.statusCode).toBe(200);

    const crearCriterio = await request(app)
      .post(`/api/historias/${historiaId}/criterios`)
      .set("Authorization", `Bearer ${token}`)
      .send({ descripcion: "Debe mostrar backlog" });

    expect(crearCriterio.statusCode).toBe(201);
    criterioId = crearCriterio.body.data.id;

    const actualizarCriterio = await request(app)
      .put(`/api/criterios/${criterioId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ descripcion: "Debe mostrar backlog actualizado" });

    expect(actualizarCriterio.statusCode).toBe(200);

    const eliminarCriterio = await request(app)
      .delete(`/api/criterios/${criterioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(eliminarCriterio.statusCode).toBe(200);
    expect(eliminarCriterio.body.data.softDelete).toBe(true);

    const eliminarHistoria = await request(app)
      .delete(`/api/historias/${historiaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(eliminarHistoria.statusCode).toBe(200);
    expect(eliminarHistoria.body.data.softDelete).toBe(true);
  });

  it("CRUD basico de etiquetas", async () => {
    const crear = await request(app)
      .post("/api/etiquetas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "frontend" });

    expect(crear.statusCode).toBe(201);
    etiquetaId = crear.body.data.id;

    const listar = await request(app)
      .get("/api/etiquetas")
      .set("Authorization", `Bearer ${token}`);

    expect(listar.statusCode).toBe(200);
    expect(Array.isArray(listar.body.data)).toBe(true);

    const actualizar = await request(app)
      .put(`/api/etiquetas/${etiquetaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "frontend-v2" });

    expect(actualizar.statusCode).toBe(200);

    const eliminar = await request(app)
      .delete(`/api/etiquetas/${etiquetaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(eliminar.statusCode).toBe(200);
    expect(eliminar.body.data.softDelete).toBe(true);
  });
});
