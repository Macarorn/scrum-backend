import { describe, it, expect, vi, beforeEach } from "vitest";

const obtenerMetricasProyectoMock = vi.fn();

vi.mock("../src/services/metricas.service.js", () => ({
  obtenerMetricasProyecto: obtenerMetricasProyectoMock,
}));

import { exportarMetricas, obtenerMetricas } from "../src/controllers/metricas.controller.js";

describe("metricas controller", () => {
  beforeEach(() => {
    obtenerMetricasProyectoMock.mockReset();
  });

  it("envía el sprint al servicio cuando se solicita un filtro", async () => {
    obtenerMetricasProyectoMock.mockResolvedValue({ total_tareas: 3 });

    const req = { params: { id: "7" }, query: { sprint: "12" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      send: vi.fn(),
    };
    const next = vi.fn();

    await obtenerMetricas(req, res, next);

    expect(obtenerMetricasProyectoMock).toHaveBeenCalledWith("7", "12");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("exporta usando el proyecto y el sprint recibidos", async () => {
    obtenerMetricasProyectoMock.mockResolvedValue({ total_tareas: 3 });

    const req = { params: { id: "7" }, query: { sprint: "12" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      send: vi.fn(),
    };
    const next = vi.fn();

    await exportarMetricas(req, res, next);

    expect(obtenerMetricasProyectoMock).toHaveBeenCalledWith("7", "12");
    expect(res.setHeader).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });
});
