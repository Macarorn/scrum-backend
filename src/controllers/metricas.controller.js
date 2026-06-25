import ExcelJS from "exceljs";
import { obtenerMetricasProyecto } from "../services/metricas.service.js";

const normalizeSprintParam = (value) => {
  const sprintId = Number(value);
  return Number.isFinite(sprintId) && sprintId > 0 ? sprintId : null;
};

const sanitizeFileName = (value) => {
  const normalized = String(value || "proyecto")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "proyecto";
};

const addHeaderRow = (sheet, headers) => {
  const row = sheet.addRow(headers);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF39A900" },
  };
  return row;
};

const buildWorkbook = async (metricas = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Scrum";
  workbook.lastModifiedBy = "Scrum";

  const summarySheet = workbook.addWorksheet("Resumen");
  addHeaderRow(summarySheet, ["Campo", "Valor"]);
  const summaryRows = [
    ["Nombre del proyecto", metricas.nombre_proyecto || metricas.proyecto_nombre || metricas.proyecto || ""],
    ["Sprint", metricas.nombre_sprint || metricas.sprint_nombre || metricas.sprint || ""],
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
  summaryRows.forEach((row) => summarySheet.addRow(row));
  summarySheet.columns = [{ width: 30 }, { width: 50 }];

  const kpiSheet = workbook.addWorksheet("KPIs");
  addHeaderRow(kpiSheet, ["Indicador", "Valor"]);
  const kpiRows = Object.entries(metricas.kpis || {}).map(([key, value]) => [key, value]);
  kpiRows.forEach((row) => kpiSheet.addRow(row));
  kpiSheet.columns = [{ width: 35 }, { width: 25 }];

  const historiasSheet = workbook.addWorksheet("Historias");
  addHeaderRow(historiasSheet, ["ID", "Nombre", "Estado", "Prioridad", "Épica"]);
  const historias = Array.isArray(metricas.historias_detalle) && metricas.historias_detalle.length
    ? metricas.historias_detalle
    : [];
  historias.forEach((item) => historiasSheet.addRow([
    item.id_historia ?? "",
    item.nombre || item.title || "",
    item.estado || "",
    item.prioridad || "",
    item.epica_nombre || item.epica || "",
  ]));
  if (!historias.length) {
    historiasSheet.addRow(["Sin historias registradas", "", "", "", ""]);
  }
  historiasSheet.columns = [{ width: 12 }, { width: 35 }, { width: 20 }, { width: 18 }, { width: 28 }];

  const epicasSheet = workbook.addWorksheet("Epicas");
  addHeaderRow(epicasSheet, ["ID", "Nombre", "Estado"]);
  const epicas = Array.isArray(metricas.epicas_detalle) && metricas.epicas_detalle.length
    ? metricas.epicas_detalle
    : Array.isArray(metricas.epicas?.items)
      ? metricas.epicas.items
      : [];
  epicas.forEach((item) => epicasSheet.addRow([
    item.id_epica ?? "",
    item.nombre || item.name || "",
    item.estado || item.state || "",
  ]));
  if (!epicas.length) {
    epicasSheet.addRow(["Sin épicas registradas", "", ""]);
  }
  epicasSheet.columns = [{ width: 12 }, { width: 35 }, { width: 20 }];

  const tareasSheet = workbook.addWorksheet("Tareas");
  addHeaderRow(tareasSheet, ["ID", "Título", "Estado", "Prioridad", "Historia", "Épica"]);
  const tareas = Array.isArray(metricas.tareas_detalle) && metricas.tareas_detalle.length
    ? metricas.tareas_detalle
    : [];
  tareas.forEach((item) => tareasSheet.addRow([
    item.id_tarea ?? "",
    item.titulo || item.title || "",
    item.estado || "",
    item.prioridad || "",
    item.historia_nombre || item.historia || "",
    item.epica_nombre || item.epica || "",
  ]));
  if (!tareas.length) {
    tareasSheet.addRow(["Sin tareas registradas", "", "", "", "", ""]);
  }
  tareasSheet.columns = [{ width: 12 }, { width: 35 }, { width: 20 }, { width: 18 }, { width: 28 }, { width: 28 }];

  const integrantesSheet = workbook.addWorksheet("Integrantes");
  addHeaderRow(integrantesSheet, ["Nombre", "Rol", "Tareas asignadas", "Completadas", "En progreso", "Por hacer", "Productividad"]);
  const integrantes = Array.isArray(metricas.usuarios) && metricas.usuarios.length
    ? metricas.usuarios
    : Array.isArray(metricas.teamMembers)
      ? metricas.teamMembers
      : [];
  integrantes.forEach((item) => integrantesSheet.addRow([
    item.nombre || item.usuario || "",
    item.rol || "",
    item.tareasAsignadas ?? item.tasks ?? "",
    item.tareasCompletadas ?? item.completed ?? "",
    item.tareasEnProgreso ?? item.inProgress ?? "",
    item.tareasPorHacer ?? item.pending ?? "",
    item.productividad ?? item.compliance ?? "",
  ]));
  if (!integrantes.length) {
    integrantesSheet.addRow(["Sin integrantes registrados", "", "", "", "", "", ""]);
  }
  integrantesSheet.columns = [{ width: 25 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 18 }];

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
    const projectName = sanitizeFileName(
      data?.nombre_proyecto || data?.proyecto_nombre || data?.proyecto || proyectoId || "proyecto"
    );
    const fileName = `metricas-proyecto-${projectName}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};
