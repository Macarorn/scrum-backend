import pool from "../utils/database.js";

const COLORS = ["#7C4DFF", "#2F80ED", "#39A900", "#FF8A26", "#E54861", "#00A3A3"];
const metricasCache = new Map();

const numberOrZero = (value) => Number(value) || 0;
const percent = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

function cloneMetricas(metricas) {
  return JSON.parse(JSON.stringify(metricas));
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "NA";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function buildTrend(productividad) {
  const start = Math.max(0, productividad - 18);
  return [
    { w: "S1", v: start },
    { w: "S2", v: Math.min(100, start + 5) },
    { w: "S3", v: Math.min(100, start + 9) },
    { w: "S4", v: Math.min(100, start + 13) },
    { w: "S5", v: Math.min(100, start + 16) },
    { w: "S6", v: productividad },
  ];
}

export function limpiarCacheMetricas() {
  metricasCache.clear();
}

export function invalidarMetricasProyecto(idProyecto) {
  const projectId = Number(idProyecto);
  if (!Number.isFinite(projectId)) {
    return;
  }

  for (const key of Array.from(metricasCache.keys())) {
    if (String(key) === String(projectId) || String(key).startsWith(`${projectId}:`)) {
      metricasCache.delete(key);
    }
  }
}

export async function invalidarMetricasPorEpica(idEpica) {
  const [rows] = await pool.query(
    "SELECT id_proyecto FROM epica WHERE id_epica = ?",
    [Number(idEpica)],
  );

  if (rows[0]?.id_proyecto) {
    invalidarMetricasProyecto(rows[0].id_proyecto);
  }
}

export async function invalidarMetricasPorHistoria(idHistoria) {
  const [rows] = await pool.query(
    `SELECT e.id_proyecto
     FROM historia_usuario h
     INNER JOIN epica e ON e.id_epica = h.id_epica
     WHERE h.id_historia = ?`,
    [Number(idHistoria)],
  );

  if (rows[0]?.id_proyecto) {
    invalidarMetricasProyecto(rows[0].id_proyecto);
  }
}

export async function invalidarMetricasPorTarea(idTarea) {
  const [rows] = await pool.query(
    `SELECT e.id_proyecto
     FROM tarea t
     INNER JOIN historia_usuario h ON h.id_historia = t.id_historia
     INNER JOIN epica e ON e.id_epica = h.id_epica
     WHERE t.id_tarea = ?`,
    [Number(idTarea)],
  );

  if (rows[0]?.id_proyecto) {
    invalidarMetricasProyecto(rows[0].id_proyecto);
  }
}

export function construirMetricasProyectoDto({
  tareasRow = {},
  epicasRow = {},
  historiasRow = {},
  epicasDetalleRows = [],
  usuariosRows = [],
} = {}) {
  const totalTareas = numberOrZero(tareasRow.total_tareas);
  const tareasPorHacer = numberOrZero(tareasRow.por_hacer);
  const tareasEnProgreso = numberOrZero(tareasRow.en_progreso);
  const tareasTerminadas = numberOrZero(tareasRow.terminado);
  const tareasBloqueadas = numberOrZero(tareasRow.bloqueado);
  const tareasPendientes = Math.max(totalTareas - tareasTerminadas, 0);
  const progresoTareas = percent(tareasTerminadas, totalTareas);

  const totalEpicas = numberOrZero(epicasRow.total_epicas);
  const epicasCompletadas = numberOrZero(epicasRow.completadas);
  const epicasActivas = numberOrZero(epicasRow.activas);
  const epicasPendientes = Math.max(totalEpicas - epicasCompletadas, 0);
  const progresoEpicas = percent(epicasCompletadas, totalEpicas);

  const totalHistorias = numberOrZero(historiasRow.total_historias);
  const historiasPorHacer = numberOrZero(historiasRow.por_hacer);
  const historiasEnProgreso = numberOrZero(historiasRow.en_progreso);
  const historiasCompletadas = numberOrZero(historiasRow.terminado);

  const teamMembers = usuariosRows.map((usuario, index) => {
    const tareasAsignadas = numberOrZero(usuario.tareasAsignadas);
    const tareasCompletadas = numberOrZero(usuario.tareasCompletadas);
    const tareasEnProgresoUsuario = numberOrZero(usuario.tareasEnProgreso);
    const tareasPorHacerUsuario = numberOrZero(usuario.tareasPorHacer);
    const productividad = percent(tareasCompletadas, tareasAsignadas);
    const nombre = usuario.nombre || usuario.usuario || usuario.email || "Sin nombre";

    return {
      id_usuario: numberOrZero(usuario.id_usuario),
      usuario: nombre,
      nombre,
      email: usuario.email || "",
      rol: usuario.rol || "Integrante",
      tareasAsignadas,
      tareasCompletadas,
      tareasEnProgreso: tareasEnProgresoUsuario,
      tareasPorHacer: tareasPorHacerUsuario,
      productividad,
      stories: numberOrZero(usuario.historiasAsignadas),
      tasks: tareasAsignadas,
      completed: tareasCompletadas,
      inProgress: tareasEnProgresoUsuario,
      pending: Math.max(tareasAsignadas - tareasCompletadas - tareasEnProgresoUsuario, 0),
      compliance: productividad,
      initials: getInitials(nombre),
      bg: COLORS[index % COLORS.length],
      trend: buildTrend(productividad),
    };
  });

  const epics = epicasDetalleRows.map((epica) => ({
    id_epica: numberOrZero(epica.id_epica),
    name: epica.nombre || `Epica ${epica.id_epica || ""}`,
    nombre: epica.nombre || "",
    done: epica.estado === "completada",
    estado: epica.estado || "por_hacer",
  }));

  const dto = {
    kpis: {
      backlogProgress: progresoTareas,
      totalBacklog: totalTareas,
      completedBacklog: tareasTerminadas,
      completedEpics: epicasCompletadas,
      pendingEpics: epicasPendientes,
      totalEpics: totalEpicas,
      completedEpicsPercent: progresoEpicas,
      pendingEpicsPercent: percent(epicasPendientes, totalEpicas),
      totalStories: totalHistorias,
      completedStories: historiasCompletadas,
      inProgressStories: historiasEnProgreso,
      completedTasks: tareasTerminadas,
      pendingTasks: tareasPendientes,
      todoTasks: tareasPorHacer,
      inProgressTasks: tareasEnProgreso,
    },
    projectProgress: {
      percent: progresoTareas,
      completed: tareasTerminadas,
      pending: tareasPendientes,
      total: totalTareas,
      data: [
        { value: tareasTerminadas },
        { value: Math.max(tareasPendientes, totalTareas ? 0 : 1) },
      ],
    },
    taskStatus: {
      total: totalTareas,
      data: [
        { name: "Por hacer", value: tareasPorHacer, percent: percent(tareasPorHacer, totalTareas), color: "#2F80ED" },
        { name: "En progreso", value: tareasEnProgreso, percent: percent(tareasEnProgreso, totalTareas), color: "#FF8A26" },
        { name: "Terminadas", value: tareasTerminadas, percent: percent(tareasTerminadas, totalTareas), color: "#39A900" },
        { name: "Bloqueadas", value: tareasBloqueadas, percent: percent(tareasBloqueadas, totalTareas), color: "#E54861" },
      ],
    },
    epicStatus: {
      total: totalEpicas,
      active: epicasActivas,
      completed: epicasCompletadas,
      pending: epicasPendientes,
      percent: progresoEpicas,
      data: [
        { name: "Completadas", value: epicasCompletadas, color: "#7C4DFF" },
        { name: "Pendientes", value: epicasPendientes, color: "#FF8A26" },
      ],
      epics,
    },
    backlogStatus: {
      total: totalTareas,
      completed: tareasTerminadas,
      pending: tareasPendientes,
      percent: progresoTareas,
      donutData: [
        { value: tareasTerminadas, color: "#39A900" },
        { value: Math.max(tareasPendientes, totalTareas ? 0 : 1), color: "#EAF7E1" },
      ],
    },
    teamMembers,
  };

  return {
    ...dto,
    tareas: {
      total: totalTareas,
      por_hacer: tareasPorHacer,
      en_progreso: tareasEnProgreso,
      terminado: tareasTerminadas,
      bloqueado: tareasBloqueadas,
      pendientes: tareasPendientes,
      progreso: progresoTareas,
    },
    epicas: {
      total: totalEpicas,
      activas: epicasActivas,
      completadas: epicasCompletadas,
      pendientes: epicasPendientes,
      progreso: progresoEpicas,
      items: epics,
    },
    historias: {
      total: totalHistorias,
      por_hacer: historiasPorHacer,
      en_progreso: historiasEnProgreso,
      terminado: historiasCompletadas,
    },
    backlog: {
      total: totalTareas,
      completado: tareasTerminadas,
      pendiente: tareasPendientes,
      progreso: progresoTareas,
    },
    usuarios: teamMembers,
    total_tareas: totalTareas,
    por_hacer: tareasPorHacer,
    en_progreso: tareasEnProgreso,
    terminado: tareasTerminadas,
    bloqueado: tareasBloqueadas,
    progreso: progresoTareas,
  };
}

async function calcularMetricasProyecto(projectId, sprintId = null) {
  console.log("[metricas][service] ID usado en SQL:", projectId, "Sprint:", sprintId);

  const normalizedSprintId = Number(sprintId);
  const hasSprint = Number.isFinite(normalizedSprintId) && normalizedSprintId > 0;
  const sprintFilterClause = hasSprint
    ? `AND (
        h.id_sprint = ?
        OR EXISTS (SELECT 1 FROM sprint_historia sh WHERE sh.id_historia = h.id_historia AND sh.id_sprint = ?)
      )`
    : "";
  const sprintEpicFilterClause = hasSprint
    ? `AND EXISTS (SELECT 1 FROM sprint_epica se WHERE se.id_epica = e.id_epica AND se.id_sprint = ?)`
    : "";
  const sprintTaskSubqueryClause = hasSprint
    ? `AND (
        h.id_sprint = ?
        OR EXISTS (SELECT 1 FROM sprint_historia sh WHERE sh.id_historia = h.id_historia AND sh.id_sprint = ?)
      )`
    : "";

  const taskParams = hasSprint ? [projectId, normalizedSprintId, normalizedSprintId] : [projectId];
  const [tareasRows] = await pool.query(
    `SELECT
       COUNT(DISTINCT t.id_tarea) AS total_tareas,
       COUNT(DISTINCT CASE WHEN t.estado = 'por_hacer' THEN t.id_tarea END) AS por_hacer,
       COUNT(DISTINCT CASE WHEN t.estado = 'en_progreso' THEN t.id_tarea END) AS en_progreso,
       COUNT(DISTINCT CASE WHEN t.estado = 'terminado' THEN t.id_tarea END) AS terminado,
       COUNT(DISTINCT CASE WHEN t.estado = 'bloqueado' THEN t.id_tarea END) AS bloqueado
     FROM tarea t
     INNER JOIN historia_usuario h ON h.id_historia = t.id_historia
     INNER JOIN epica e ON e.id_epica = h.id_epica
     INNER JOIN proyecto p ON p.id_proyecto = e.id_proyecto
     WHERE p.id_proyecto = ?${sprintFilterClause}`,
    taskParams,
  );

  const epicaParams = hasSprint ? [projectId, normalizedSprintId] : [projectId];
  const [epicasRows] = await pool.query(
    `SELECT
       COUNT(DISTINCT e.id_epica) AS total_epicas,
       COUNT(DISTINCT CASE WHEN e.estado = 'completada' THEN e.id_epica END) AS completadas,
       COUNT(DISTINCT CASE WHEN e.estado <> 'completada' THEN e.id_epica END) AS activas
     FROM epica e
     WHERE e.id_proyecto = ?${sprintEpicFilterClause}`,
    epicaParams,
  );

  const [epicasDetalleRows] = await pool.query(
    `SELECT e.id_epica, e.nombre, e.estado
     FROM epica e
     WHERE e.id_proyecto = ?${sprintEpicFilterClause}
     ORDER BY e.id_epica DESC`,
    epicaParams,
  );

  const historiaParams = hasSprint ? [projectId, normalizedSprintId, normalizedSprintId] : [projectId];
  const [historiasRows] = await pool.query(
    `SELECT
       COUNT(DISTINCT h.id_historia) AS total_historias,
       COUNT(DISTINCT CASE WHEN h.estado = 'por_hacer' THEN h.id_historia END) AS por_hacer,
       COUNT(DISTINCT CASE WHEN h.estado = 'en_progreso' THEN h.id_historia END) AS en_progreso,
       COUNT(DISTINCT CASE WHEN h.estado = 'terminado' THEN h.id_historia END) AS terminado
     FROM historia_usuario h
     INNER JOIN epica e ON e.id_epica = h.id_epica
     WHERE e.id_proyecto = ? AND h.estado <> 'eliminado'${sprintFilterClause}`,
    historiaParams,
  );

  const usuarioParams = hasSprint ? [projectId, normalizedSprintId, normalizedSprintId, projectId] : [projectId, projectId];
  const [usuariosRows] = await pool.query(
    `SELECT
       u.id_usuario,
       u.nombre,
       u.email,
       r.nombre_rol AS rol,
       COUNT(DISTINCT CASE WHEN pt.id_tarea IS NOT NULL THEN pt.id_tarea END) AS tareasAsignadas,
       COUNT(DISTINCT CASE WHEN pt.id_tarea IS NOT NULL AND pt.estado = 'terminado' THEN pt.id_tarea END) AS tareasCompletadas,
       COUNT(DISTINCT CASE WHEN pt.id_tarea IS NOT NULL AND pt.estado = 'en_progreso' THEN pt.id_tarea END) AS tareasEnProgreso,
       COUNT(DISTINCT CASE WHEN pt.id_tarea IS NOT NULL AND pt.estado = 'por_hacer' THEN pt.id_tarea END) AS tareasPorHacer,
       COUNT(DISTINCT CASE WHEN pt.id_historia IS NOT NULL THEN pt.id_historia END) AS historiasAsignadas
     FROM usuario u
     INNER JOIN usuario_equipo_proyecto uep ON uep.id_usuario = u.id_usuario
     INNER JOIN equipo_proyecto ep ON ep.id_equipo_proyecto = uep.id_equipo_proyecto
     LEFT JOIN rol r ON r.id_rol = uep.id_rol
     LEFT JOIN (
       SELECT tu.id_usuario, t.id_tarea, t.estado, h.id_historia
       FROM tarea_usuario tu
       INNER JOIN tarea t ON t.id_tarea = tu.id_tarea
       INNER JOIN historia_usuario h ON h.id_historia = t.id_historia
       INNER JOIN epica e ON e.id_epica = h.id_epica
       WHERE e.id_proyecto = ?${sprintTaskSubqueryClause}
     ) pt ON pt.id_usuario = u.id_usuario
     WHERE ep.id_proyecto = ? AND uep.activo = 1
     GROUP BY u.id_usuario, u.nombre, u.email, r.nombre_rol
     ORDER BY u.nombre ASC`,
    usuarioParams,
  );

  return construirMetricasProyectoDto({
    tareasRow: tareasRows[0],
    epicasRow: epicasRows[0],
    historiasRow: historiasRows[0],
    epicasDetalleRows,
    usuariosRows,
  });
}

export function convertirMetricasACsv(metricas = {}) {
  const rows = [
    ["metric_key", "value"],
    ["total_tareas", metricas.total_tareas ?? ""],
    ["por_hacer", metricas.por_hacer ?? ""],
    ["en_progreso", metricas.en_progreso ?? ""],
    ["terminado", metricas.terminado ?? ""],
    ["bloqueado", metricas.bloqueado ?? ""],
    ["progreso", metricas.progreso ?? ""],
    ["total_epicas", metricas.epicas?.total ?? ""],
    ["epicas_completadas", metricas.epicas?.completadas ?? ""],
    ["epicas_pendientes", metricas.epicas?.pendientes ?? ""],
    ["total_historias", metricas.historias?.total ?? ""],
  ];

  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

async function obtenerMetadataProyectoSprint(projectId, sprintId = null) {
  const proyectoId = Number(projectId);
  const sprintKey = Number(sprintId);
  const hasSprint = Number.isFinite(sprintKey) && sprintKey > 0;

  const [proyectoRows] = await pool.query("SELECT id_proyecto, nombre FROM proyecto WHERE id_proyecto = ?", [proyectoId]);
  const proyecto = proyectoRows[0] || {};

  let sprint = null;
  if (hasSprint) {
    const [sprintRows] = await pool.query("SELECT id_sprint, nombre FROM sprint WHERE id_sprint = ? AND id_proyecto = ?", [sprintKey, proyectoId]);
    sprint = sprintRows[0] || null;
  }

  return {
    nombre_proyecto: proyecto.nombre || `Proyecto ${proyectoId}`,
    proyecto_nombre: proyecto.nombre || `Proyecto ${proyectoId}`,
    nombre_sprint: sprint?.nombre || (hasSprint ? `Sprint ${sprintKey}` : null),
    sprint_nombre: sprint?.nombre || (hasSprint ? `Sprint ${sprintKey}` : null),
  };
}

async function obtenerHistoriasDetalle(projectId, sprintId = null) {
  const proyectoId = Number(projectId);
  const hasSprint = Number.isFinite(Number(sprintId)) && Number(sprintId) > 0;
  const filterClause = hasSprint
    ? `AND (
        h.id_sprint = ?
        OR EXISTS (SELECT 1 FROM sprint_historia sh WHERE sh.id_historia = h.id_historia AND sh.id_sprint = ?)
      )`
    : "";

  const params = hasSprint ? [proyectoId, Number(sprintId), Number(sprintId)] : [proyectoId];
  const [rows] = await pool.query(
    `SELECT h.id_historia, h.nombre, h.estado, h.prioridad, e.nombre AS epica_nombre
     FROM historia_usuario h
     INNER JOIN epica e ON e.id_epica = h.id_epica
     WHERE e.id_proyecto = ? AND h.estado <> 'eliminado'${filterClause}
     ORDER BY h.id_historia DESC`,
    params,
  );

  return rows;
}

async function obtenerEpicasDetalle(projectId, sprintId = null) {
  const proyectoId = Number(projectId);
  const hasSprint = Number.isFinite(Number(sprintId)) && Number(sprintId) > 0;
  const filterClause = hasSprint ? `AND EXISTS (SELECT 1 FROM sprint_epica se WHERE se.id_epica = e.id_epica AND se.id_sprint = ?)` : "";
  const params = hasSprint ? [proyectoId, Number(sprintId)] : [proyectoId];

  const [rows] = await pool.query(
    `SELECT e.id_epica, e.nombre, e.estado
     FROM epica e
     WHERE e.id_proyecto = ?${filterClause}
     ORDER BY e.id_epica DESC`,
    params,
  );

  return rows;
}

async function obtenerTareasDetalle(projectId, sprintId = null) {
  const proyectoId = Number(projectId);
  const hasSprint = Number.isFinite(Number(sprintId)) && Number(sprintId) > 0;
  const filterClause = hasSprint
    ? `AND (
        h.id_sprint = ?
        OR EXISTS (SELECT 1 FROM sprint_historia sh WHERE sh.id_historia = h.id_historia AND sh.id_sprint = ?)
      )`
    : "";

  const params = hasSprint ? [proyectoId, Number(sprintId), Number(sprintId)] : [proyectoId];
  const [rows] = await pool.query(
    `SELECT t.id_tarea, t.titulo, t.estado, t.prioridad, h.nombre AS historia_nombre, e.nombre AS epica_nombre
     FROM tarea t
     INNER JOIN historia_usuario h ON h.id_historia = t.id_historia
     INNER JOIN epica e ON e.id_epica = h.id_epica
     WHERE e.id_proyecto = ?${filterClause}
     ORDER BY t.id_tarea DESC`,
    params,
  );

  return rows;
}

export async function obtenerMetricasProyecto(idProyecto, idSprint = null) {
  const projectId = Number(idProyecto);
  const sprintId = Number(idSprint);
  const cacheKey = Number.isFinite(projectId) && projectId > 0
    ? `${projectId}:${Number.isFinite(sprintId) && sprintId > 0 ? sprintId : 0}`
    : "default";

  console.log("[metricas][service] Proyecto seleccionado:", idProyecto, "Sprint:", idSprint);

  if (!Number.isFinite(projectId) || projectId <= 0) {
    return construirMetricasProyectoDto();
  }

  if (metricasCache.has(cacheKey)) {
    return cloneMetricas(metricasCache.get(cacheKey));
  }

  const metricas = await calcularMetricasProyecto(projectId, sprintId);
  const metadata = await obtenerMetadataProyectoSprint(projectId, sprintId);
  const historiasDetalle = await obtenerHistoriasDetalle(projectId, sprintId);
  const epicasDetalle = await obtenerEpicasDetalle(projectId, sprintId);
  const tareasDetalle = await obtenerTareasDetalle(projectId, sprintId);

  const enrichedMetricas = {
    ...metricas,
    ...metadata,
    proyecto: projectId,
    sprint: Number.isFinite(sprintId) && sprintId > 0 ? sprintId : null,
    historias_detalle: historiasDetalle,
    epicas_detalle: epicasDetalle,
    tareas_detalle: tareasDetalle,
  };

  metricasCache.set(cacheKey, cloneMetricas(enrichedMetricas));
  return enrichedMetricas;
}
