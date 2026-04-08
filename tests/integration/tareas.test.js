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
  let comentarioId;

  it("crea una tarea", async () => {
    const response = await request(app)
      .post("/api/tareas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Tarea de prueba",
        descripcion: "Descripcion",
        id_historia: 1,
        id_usuario_responsable: 10,
        prioridad: "alta",
        tipo: "RF",
        story_points: 5,
        estado: "por_hacer",
        estimacion_dias: 2,
        orden_columna: 1,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("id_tarea");
    tareaId = response.body.data.id_tarea;
  });

  it("lista tareas", async () => {
    const response = await request(app)
      .get("/api/tareas?id_historia=1")
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
    expect(response.body.data.id_tarea).toBe(tareaId);
  });

  it("actualiza una tarea", async () => {
    const response = await request(app)
      .put(`/api/tareas/${tareaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ prioridad: "media", story_points: 8 });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.prioridad).toBe("media");
  });

  it("cambia estado, orden y tiempo real", async () => {
    const estado = await request(app)
      .patch(`/api/tareas/${tareaId}/estado`)
      .set("Authorization", `Bearer ${token}`)
      .send({ estado: "en_progreso" });

    expect(estado.statusCode).toBe(200);
    expect(estado.body.data.estado).toBe("en_progreso");

    const orden = await request(app)
      .put(`/api/tareas/${tareaId}/orden`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orden_columna: 4 });

    expect(orden.statusCode).toBe(200);
    expect(orden.body.data.orden_columna).toBe(4);

    const tiempo = await request(app)
      .patch(`/api/tareas/${tareaId}/tiempo-real`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tiempo_real: 6 });

    expect(tiempo.statusCode).toBe(200);
    expect(tiempo.body.data.tiempo_real).toBe(6);
  });

  it("asigna usuarios, comentarios y etiquetas", async () => {
    const asignarUsuario = await request(app)
      .post(`/api/tareas/${tareaId}/asignar`)
      .set("Authorization", `Bearer ${token}`)
      .send({ id_usuario: 11 });

    expect(asignarUsuario.statusCode).toBe(200);
    expect(
      asignarUsuario.body.data.asignados.some(
        (usuario) => usuario.id_usuario === 11,
      ),
    ).toBe(true);

    const listarUsuarios = await request(app)
      .get(`/api/tareas/${tareaId}/usuarios`)
      .set("Authorization", `Bearer ${token}`);

    expect(listarUsuarios.statusCode).toBe(200);
    expect(
      listarUsuarios.body.data.some((usuario) => usuario.id_usuario === 10),
    ).toBe(true);
    expect(
      listarUsuarios.body.data.some((usuario) => usuario.id_usuario === 11),
    ).toBe(true);

    const agregarComentario = await request(app)
      .post(`/api/tareas/${tareaId}/comentarios`)
      .set("Authorization", `Bearer ${token}`)
      .send({ comentario: "Validado para la expo" });

    expect(agregarComentario.statusCode).toBe(201);
    comentarioId = agregarComentario.body.data.id_comentario;

    const listarComentarios = await request(app)
      .get(`/api/tareas/${tareaId}/comentarios`)
      .set("Authorization", `Bearer ${token}`);

    expect(listarComentarios.statusCode).toBe(200);
    expect(
      listarComentarios.body.data.some(
        (comentario) => comentario.id_comentario === comentarioId,
      ),
    ).toBe(true);

    const asignarEtiqueta = await request(app)
      .post(`/api/tareas/${tareaId}/etiquetas`)
      .set("Authorization", `Bearer ${token}`)
      .send({ id_etiqueta: 5 });

    expect(asignarEtiqueta.statusCode).toBe(200);
    expect(asignarEtiqueta.body.data.etiquetas).toContain(5);

    const removerEtiqueta = await request(app)
      .delete(`/api/tareas/${tareaId}/etiquetas/5`)
      .set("Authorization", `Bearer ${token}`);

    expect(removerEtiqueta.statusCode).toBe(200);
    expect(removerEtiqueta.body.data.etiquetas).not.toContain(5);
  });

  it("expone el historial de cambios", async () => {
    const response = await request(app)
      .get(`/api/tareas/${tareaId}/historial`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(4);
  });

  it("elimina un comentario por id de tarea", async () => {
    const response = await request(app)
      .delete(`/api/tareas/comentarios/${comentarioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.eliminado).toBe(true);
  });

  it("elimina una tarea con soft delete", async () => {
    const response = await request(app)
      .delete(`/api/tareas/${tareaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.eliminado).toBe(true);
  });
});
