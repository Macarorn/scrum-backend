import exceljs from 'exceljs';
import pool from '../utils/database.js';

export const exportarProyectoExcel = async (req, res) => {
  try {
    const proyectoId = req.params.id;

    // 1. Fetch Proyecto
    const [proyectoRows] = await pool.query('SELECT * FROM proyecto WHERE id_proyecto = ?', [proyectoId]);
    if (proyectoRows.length === 0) return res.status(404).json({ message: 'Proyecto no encontrado' });
    const proyecto = proyectoRows[0];

    // 2. Fetch Miembros
    const [miembros] = await pool.query(`
      SELECT u.nombre, u.email, r.nombre_rol, uep.activo
      FROM usuario_equipo_proyecto uep
      JOIN equipo_proyecto ep ON uep.id_equipo_proyecto = ep.id_equipo_proyecto
      JOIN usuario u ON u.id_usuario = uep.id_usuario
      JOIN rol r ON r.id_rol = uep.id_rol
      WHERE ep.id_proyecto = ?
    `, [proyectoId]);

    // 3. Fetch Sprints
    const [sprints] = await pool.query('SELECT * FROM sprint WHERE id_proyecto = ? ORDER BY fecha_inicio ASC', [proyectoId]);

    // 4. Fetch Epicas
    const [epicas] = await pool.query('SELECT * FROM epica WHERE id_proyecto = ?', [proyectoId]);

    // 5. Fetch Historias
    const [historias] = await pool.query(`
      SELECT h.*, e.nombre AS epica_nombre 
      FROM historia_usuario h
      JOIN epica e ON h.id_epica = e.id_epica
      WHERE e.id_proyecto = ?
    `, [proyectoId]);

    // 6. Fetch Tareas
    const [tareas] = await pool.query(`
      SELECT t.*, h.nombre AS historia_nombre, u.nombre AS responsable
      FROM tarea t
      JOIN historia_usuario h ON t.id_historia = h.id_historia
      JOIN epica e ON h.id_epica = e.id_epica
      LEFT JOIN usuario u ON t.id_usuario_responsable = u.id_usuario
      WHERE e.id_proyecto = ?
    `, [proyectoId]);

    // Crear el Excel
    const workbook = new exceljs.Workbook();
    workbook.creator = 'Scrum App';
    workbook.created = new Date();

    // Estilos generales
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    // Hoja: Proyecto
    const sheetProyecto = workbook.addWorksheet('Proyecto');
    sheetProyecto.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 15 },
      { header: 'Fecha Fin', key: 'fecha_fin', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 }
    ];
    sheetProyecto.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    sheetProyecto.addRow({
      id: proyecto.id_proyecto,
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion,
      fecha_inicio: proyecto.fecha_inicio ? new Date(proyecto.fecha_inicio).toLocaleDateString() : '',
      fecha_fin: proyecto.fecha_fin_est ? new Date(proyecto.fecha_fin_est).toLocaleDateString() : '',
      estado: proyecto.estado
    });

    // Hoja: Miembros
    const sheetMiembros = workbook.addWorksheet('Miembros');
    sheetMiembros.columns = [
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Rol', key: 'rol', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 }
    ];
    sheetMiembros.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    miembros.forEach(m => sheetMiembros.addRow({
      nombre: m.nombre, 
      email: m.email, 
      rol: m.nombre_rol, 
      estado: m.activo ? 'Activo' : 'Inactivo'
    }));

    // Hoja: Sprints
    const sheetSprints = workbook.addWorksheet('Sprints');
    sheetSprints.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Objetivo', key: 'objetivo', width: 40 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 15 },
      { header: 'Fecha Fin', key: 'fecha_fin', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 }
    ];
    sheetSprints.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    sprints.forEach(s => sheetSprints.addRow({
      id: s.id_sprint, 
      nombre: s.nombre, 
      objetivo: s.objetivo, 
      fecha_inicio: s.fecha_inicio ? new Date(s.fecha_inicio).toLocaleDateString() : '', 
      fecha_fin: s.fecha_fin ? new Date(s.fecha_fin).toLocaleDateString() : '', 
      estado: s.estado
    }));

    // Hoja: Epicas
    const sheetEpicas = workbook.addWorksheet('Epicas');
    sheetEpicas.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Estado', key: 'estado', width: 15 }
    ];
    sheetEpicas.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    epicas.forEach(e => sheetEpicas.addRow({
      id: e.id_epica, nombre: e.nombre, descripcion: e.descripcion, estado: e.estado
    }));

    // Hoja: Historias
    const sheetHistorias = workbook.addWorksheet('Historias');
    sheetHistorias.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Épica', key: 'epica', width: 30 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Puntos', key: 'puntos', width: 10 },
      { header: 'Prioridad', key: 'prioridad', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 }
    ];
    sheetHistorias.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    historias.forEach(h => sheetHistorias.addRow({
      id: h.id_historia, 
      epica: h.epica_nombre, 
      nombre: h.nombre, 
      puntos: h.story_points, 
      prioridad: h.prioridad, 
      estado: h.estado
    }));

    // Hoja: Tareas
    const sheetTareas = workbook.addWorksheet('Tareas');
    sheetTareas.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Historia', key: 'historia', width: 35 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Tipo', key: 'tipo', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Responsable', key: 'responsable', width: 25 },
      { header: 'Estimación (días)', key: 'estimacion', width: 20 },
      { header: 'Tiempo Real', key: 'tiempo', width: 15 }
    ];
    const formatDias = (valor) => {
      if (valor == null || valor === '') return '';
      const num = parseFloat(valor);
      if (isNaN(num)) return '';
      if (num === 0.5) return 'Medio día';
      if (num === 1) return '1 día';
      return `${num} días`;
    };

    sheetTareas.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    tareas.forEach(t => sheetTareas.addRow({
      id: t.id_tarea, 
      historia: t.historia_nombre, 
      nombre: t.nombre, 
      tipo: t.tipo, 
      estado: t.estado, 
      responsable: t.responsable || 'Sin asignar', 
      estimacion: formatDias(t.estimacion_dias),
      tiempo: formatDias(t.tiempo_real)
    }));

    // Configurar la respuesta para descarga de archivo
    const safeProjectName = proyecto.nombre.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="proyecto_${safeProjectName}_detalles.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exportando Excel:', error);
    res.status(500).json({ message: 'Error interno al exportar el proyecto a Excel', error: error.message });
  }
};
