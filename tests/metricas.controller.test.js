import ExcelJS from "exceljs";
import { describe, it, expect, vi, beforeEach } from "vitest";

const obtenerMetricasProyectoMock = vi.hoisted(() => vi.fn());

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

    expect(obtenerMetricasProyectoMock).toHaveBeenCalledWith("7", 12);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("exporta un archivo Excel con resumen y detalle de métricas", async () => {
    obtenerMetricasProyectoMock.mockResolvedValue({
      total_tareas: 3,
      nombre_proyecto: "Alpha",
      nombre_sprint: "Sprint 1",
      kpis: { totalStories: 2, completedTasks: 1 },
      historias: { total: 2, por_hacer: 1, terminado: 1 },
      epicas: {
        total: 1,
        completadas: 1,
        pendientes: 0,
        items: [{ id_epica: 1, nombre: "Épica 1", estado: "completada" }],
      },
      tareas: { total: 3, por_hacer: 1, en_progreso: 1, terminado: 1 },
      usuarios: [{ nombre: "Ana", rol: "Desarrolladora", tareasCompletadas: 1, tareasAsignadas: 2 }],
    });

    const req = { params: { id: "7" }, query: { sprint: "12" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      send: vi.fn(),
    };
    const next = vi.fn();

    await exportarMetricas(req, res, next);

    expect(obtenerMetricasProyectoMock).toHaveBeenCalledWith("7", 12);
    expect(res.setHeader).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();

    const buffer = res.send.mock.calls[0][0];
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const workbook = await new ExcelJS.Workbook().xlsx.load(buffer);
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
    expect(sheetNames).toEqual(expect.arrayContaining(["Resumen", "KPIs", "Historias", "Epicas", "Tareas", "Integrantes"]));

    const resumen = workbook.getWorksheet("Resumen");
    expect(resumen.getCell("A2").value).toBe("Nombre del proyecto");
    expect(resumen.getCell("B2").value).toBe("Alpha");
    expect(resumen.getCell("A3").value).toBe("Sprint");
    expect(resumen.getCell("B3").value).toBe("Sprint 1");
  });
});
