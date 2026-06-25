import ExcelJS from "exceljs";
import { obtenerMetricasProyecto } from "../services/metricas.service.js";

const normalizeSprintParam = (value) => {
  const sprintId = Number(value);
  return Number.isFinite(sprintId) && sprintId > 0 ? sprintId : null;
};

const buildWorkbook = async (metricas = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Scrum";
  workbook.lastModifiedBy = "Scrum";

  const sheet = workbook.addWorksheet("Métricas");
  sheet.columns = [
    { header: "Campo", key: "campo", width: 30 },
    { header: "Valor", key: "valor", width: 50 },
  ];

  const rows = [
    ["Proyecto", metricas.proyecto || ""],
    ["Sprint", metricas.sprint || ""],
    ["Total tareas", metricas.total_tareas ?? ""],
    ["Tareas por hacer", metricas.por_hacer ?? ""],
    ["Tareas en progreso", metricas.en_progreso ?? ""],
    ["Tareas terminadas", metricas.terminado ?? ""],
    ["Tareas bloqueadas", metricas.bloqueado ?? ""],
    ["Progreso", metricas.progreso ?? ""],
    ["Total épicas", metricas.epicas?.total ?? ""],
    ["Épicas completadas", metricas.epicas?.completadas ?? ""],
    ["Épicas pendientes", metricas.epicas?.pendientes ?? ""],
    ["Total historias", metricas.historias?.total ?? ""],
  ];

  rows.forEach((row) => sheet.addRow({ campo: row[0], valor: row[1] }));
  return workbook;
};

export const obtenerMetricas = async (req, res, next) => {
  try {
    const proyectoId = req.params.id ?? req.query.proyecto ?? req.query.id_proyecto;
    const sprintId = normalizeSprintParam(req.query.sprint ?? req.query.id_sprint);
    const data = await obtenerMetricasProyecto(proyectoId, sprintId);

    res.status(200).json({
      success: true,
      data,
      message: "Metricas del proyecto obtenidas",
    });
  } catch (error) {
    next(error);
  }
};

export const exportarMetricas = async (req, res, next) => {
  try {
    const proyectoId = req.params.id ?? req.query.proyecto ?? req.query.id_proyecto;
    const sprintId = normalizeSprintParam(req.query.sprint ?? req.query.id_sprint);
    const data = await obtenerMetricasProyecto(proyectoId, sprintId);
    const workbook = await buildWorkbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `metricas-proyecto-${proyectoId || "sin-proyecto"}${sprintId ? `-sprint-${sprintId}` : ""}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};
