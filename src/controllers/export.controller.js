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

    // Estilos generales (Verde SENA: #39A900)
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF39A900' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    // ==========================================
    // Hoja Principal: Backlog del Producto (Plantilla SENA)
    // ==========================================
    const sheetBacklog = workbook.addWorksheet('Backlog del Producto');
    
    // Título Principal
    sheetBacklog.mergeCells('B2:H2');
    sheetBacklog.getCell('B2').value = 'Backlog del Producto';
    sheetBacklog.getCell('B2').font = { size: 16, bold: true, color: { argb: 'FF000000' } };
    sheetBacklog.getCell('B2').alignment = { vertical: 'middle', horizontal: 'left' };

    // Detalles del Proyecto
    sheetBacklog.getCell('B4').value = 'Nombre del Proyecto:';
    sheetBacklog.getCell('B4').font = { bold: true };
    sheetBacklog.mergeCells('D4:H4');
    sheetBacklog.getCell('D4').value = proyecto.nombre;
    sheetBacklog.getCell('D4').border = {
      top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
    };
    sheetBacklog.getCell('D4').alignment = { vertical: 'middle', horizontal: 'center' };

    // Dueño del Producto
    const dueño = miembros.find(m => m.nombre_rol && m.nombre_rol.toLowerCase().includes('dueño')) || miembros.find(m => m.nombre_rol && m.nombre_rol.toLowerCase().includes('administrador')) || miembros[0] || { nombre: '' };
    sheetBacklog.getCell('B5').value = 'Dueño del Producto:';
    sheetBacklog.getCell('B5').font = { bold: true };
    sheetBacklog.mergeCells('D5:H5');
    sheetBacklog.getCell('D5').value = dueño.nombre;
    sheetBacklog.getCell('D5').border = {
      top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
    };
    sheetBacklog.getCell('D5').alignment = { vertical: 'middle', horizontal: 'center' };

    // Estilos para la tabla del backlog
    const tableHeaderStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF39A900' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: {
        top: {style:'thin', color: {argb:'FF000000'}},
        left: {style:'thin', color: {argb:'FF000000'}},
        bottom: {style:'thin', color: {argb:'FF000000'}},
        right: {style:'thin', color: {argb:'FF000000'}}
      }
    };

    const tableCellStyle = {
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      border: {
        top: {style:'thin', color: {argb:'FFCCCCCC'}},
        left: {style:'thin', color: {argb:'FFCCCCCC'}},
        bottom: {style:'thin', color: {argb:'FFCCCCCC'}},
        right: {style:'thin', color: {argb:'FFCCCCCC'}}
      }
    };

    // Encabezados de Tabla
    sheetBacklog.getCell('B7').value = 'ÉPICA';
    sheetBacklog.getCell('C7').value = 'HISTORIA DE USUARIO';
    sheetBacklog.getCell('D7').value = 'PUNTOS DE HISTORIA';
    sheetBacklog.getCell('E7').value = 'PRIORIDAD';
    sheetBacklog.getCell('F7').value = 'ESTADO';
    sheetBacklog.getCell('G7').value = 'RESPONSABLE';
    sheetBacklog.getCell('H7').value = 'SPRINT ASIGNADO';

    ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      Object.assign(sheetBacklog.getCell(`${col}7`), tableHeaderStyle);
    });

    // Anchos de columna
    sheetBacklog.getColumn('B').width = 25; // Epica
    sheetBacklog.getColumn('C').width = 45; // Historia
    sheetBacklog.getColumn('D').width = 20; // Puntos
    sheetBacklog.getColumn('E').width = 15; // Prioridad
    sheetBacklog.getColumn('F').width = 15; // Estado
    sheetBacklog.getColumn('G').width = 25; // Responsable
    sheetBacklog.getColumn('H').width = 20; // Sprint

    let currentRow = 8;

    epicas.forEach(epica => {
      const historiasDeEpica = historias.filter(h => h.id_epica === epica.id_epica);
      
      if (historiasDeEpica.length === 0) {
        // Epica sin historias
        sheetBacklog.getCell(`B${currentRow}`).value = epica.nombre;
        sheetBacklog.getCell(`C${currentRow}`).value = '(Sin historias de usuario)';
        sheetBacklog.getCell(`F${currentRow}`).value = epica.estado;
        
        ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(c => {
          Object.assign(sheetBacklog.getCell(`${c}${currentRow}`), tableCellStyle);
        });
        
        currentRow++;
      } else {
        // Epica con historias
        let startRow = currentRow;
        historiasDeEpica.forEach((historia) => {
          sheetBacklog.getCell(`C${currentRow}`).value = historia.nombre;
          sheetBacklog.getCell(`D${currentRow}`).value = historia.story_points || '';
          sheetBacklog.getCell(`E${currentRow}`).value = historia.prioridad || '';
          sheetBacklog.getCell(`F${currentRow}`).value = historia.estado || '';
          
          // Buscar tareas de esta historia para obtener el responsable principal (si hay uno mayoritario o el primero)
          const tareasHistoria = tareas.filter(t => t.id_historia === historia.id_historia);
          let responsable = '';
          if (tareasHistoria.length > 0 && tareasHistoria[0].responsable) {
             responsable = tareasHistoria[0].responsable;
          }
          sheetBacklog.getCell(`G${currentRow}`).value = responsable;
          
          // Encontrar sprint si tiene uno activo o asignado (esto requiere info de `historia_sprint` o tareas, por simplicidad usamos el último sprint si la historia está en él)
          let sprintName = '';
          const sprint = sprints.find(s => new Date(s.fecha_inicio) <= new Date() && new Date(s.fecha_fin) >= new Date() && s.estado === 'activo');
          if (sprint && historia.estado === 'en_progreso') sprintName = sprint.nombre; // Aproximación
          
          sheetBacklog.getCell(`H${currentRow}`).value = sprintName;

          ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(c => {
            Object.assign(sheetBacklog.getCell(`${c}${currentRow}`), tableCellStyle);
            if(c === 'D' || c === 'E' || c === 'F' || c === 'H') {
               sheetBacklog.getCell(`${c}${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            }
          });
          
          currentRow++;
        });

        // Combinar celdas de Épica
        if (currentRow - 1 > startRow) {
          sheetBacklog.mergeCells(`B${startRow}:B${currentRow - 1}`);
        }
        sheetBacklog.getCell(`B${startRow}`).value = epica.nombre;
      }
    });


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
