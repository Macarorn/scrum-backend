import { describe, expect, it, vi } from "vitest";

vi.mock("../src/utils/database.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

import { construirMetricasProyectoDto } from "../src/services/metricas.service.js";

describe("construirMetricasProyectoDto", () => {
  it("cuenta las épicas activas como pendientes y las completadas como completadas", () => {
    const dto = construirMetricasProyectoDto({
      tareasRow: { total_tareas: 0, por_hacer: 0, en_progreso: 0, terminado: 0, bloqueado: 0 },
      epicasRow: { total_epicas: 3, completadas: 1, activas: 2 },
      historiasRow: { total_historias: 0, por_hacer: 0, en_progreso: 0, terminado: 0 },
      epicasDetalleRows: [
        { id_epica: 1, nombre: "Epica 1", estado: "por_hacer" },
        { id_epica: 2, nombre: "Epica 2", estado: "en_progreso" },
        { id_epica: 3, nombre: "Epica 3", estado: "completada" },
      ],
      usuariosRows: [],
    });

    expect(dto.epicas.total).toBe(3);
    expect(dto.epicas.activas).toBe(2);
    expect(dto.epicas.completadas).toBe(1);
    expect(dto.epicas.pendientes).toBe(2);
    expect(dto.epicStatus.pending).toBe(2);
  });
});
