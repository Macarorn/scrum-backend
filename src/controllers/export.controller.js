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

    // 7. Fetch Criterios de Aceptación
    const [criterios] = await pool.query(`
      SELECT ca.* 
      FROM criterio_aceptacion ca
      JOIN historia_usuario h ON ca.id_historia = h.id_historia
      JOIN epica e ON h.id_epica = e.id_epica
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

    const formatEstado = (estado) => {
      if (!estado) return '';
      const str = estado.replace(/_/g, ' ');
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const formatTipo = (tipo) => {
      if (tipo === 'RF') return 'Requisito Funcional';
      if (tipo === 'RNF') return 'Requisito No Funcional';
      if (!tipo) return '';
      return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    };

    const labelStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF39A900' } },
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: {
        top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
      }
    };

    const addProjectHeader = (sheet, title, lastCol) => {
      // 6 filas vacías al inicio para empujar la tabla hacia abajo
      for (let i = 0; i < 6; i++) sheet.addRow([]);

      sheet.mergeCells(`B2:${lastCol}2`);
      sheet.getCell('B2').value = title;
      sheet.getCell('B2').font = { size: 16, bold: true, color: { argb: 'FF000000' } };
      sheet.getCell('B2').alignment = { vertical: 'middle', horizontal: 'left' };

      // Etiqueta Nombre del Proyecto
      sheet.getCell('B4').value = 'Nombre del Proyecto:';
      Object.assign(sheet.getCell('B4'), labelStyle);
      Object.assign(sheet.getCell('C4'), labelStyle); // para los bordes
      sheet.mergeCells(`B4:C4`);
      
      // Valor Nombre del Proyecto
      sheet.getCell('D4').value = proyecto.nombre;
      sheet.getCell('D4').border = {
        top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
      };
      sheet.getCell('D4').alignment = { vertical: 'middle', horizontal: 'left' };
      // Para asegurar bordes en todas las celdas combinadas
      for(let col = sheet.getColumn('D').number; col <= sheet.getColumn(lastCol).number; col++) {
          sheet.getRow(4).getCell(col).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      }
      sheet.mergeCells(`D4:${lastCol}4`);

      // Etiqueta Dueño del Producto
      const dueño = miembros.find(m => m.nombre_rol && m.nombre_rol.toLowerCase().includes('dueño')) || miembros.find(m => m.nombre_rol && m.nombre_rol.toLowerCase().includes('administrador')) || miembros[0] || { nombre: '' };
      sheet.getCell('B5').value = 'Dueño del Producto:';
      Object.assign(sheet.getCell('B5'), labelStyle);
      Object.assign(sheet.getCell('C5'), labelStyle); // para los bordes
      sheet.mergeCells(`B5:C5`);
      
      // Valor Dueño del Producto
      sheet.getCell('D5').value = dueño.nombre;
      sheet.getCell('D5').border = {
        top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
      };
      sheet.getCell('D5').alignment = { vertical: 'middle', horizontal: 'left' };
      // Para asegurar bordes en todas las celdas combinadas
      for(let col = sheet.getColumn('D').number; col <= sheet.getColumn(lastCol).number; col++) {
          sheet.getRow(5).getCell(col).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      }
      sheet.mergeCells(`D5:${lastCol}5`);
    };


    // ==========================================
    // Hoja Principal: Backlog del Producto (Plantilla SENA Avanzada)
    // ==========================================
    const sheetBacklog = workbook.addWorksheet('Backlog del Producto');
    addProjectHeader(sheetBacklog, 'Backlog del Producto', 'J');

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

    // Encabezados de Tabla (Super-encabezados)
    sheetBacklog.mergeCells('B7:E7');
    sheetBacklog.getCell('B7').value = 'EPICA';
    sheetBacklog.mergeCells('F7:I7');
    sheetBacklog.getCell('F7').value = 'HISTORIA DE USUARIO';
    sheetBacklog.getCell('J7').value = 'CRITERIOS DE ACEPTACIÓN';
    sheetBacklog.mergeCells('J7:J8'); 

    // Asignar estilos a la fila 7
    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(c => Object.assign(sheetBacklog.getCell(`${c}7`), tableHeaderStyle));

    // Sub-encabezados
    sheetBacklog.getCell('B8').value = 'ID Epica';
    sheetBacklog.getCell('C8').value = 'Como (Rol)';
    sheetBacklog.getCell('D8').value = 'Deseo...';
    sheetBacklog.getCell('E8').value = 'Para...';
    
    sheetBacklog.getCell('F8').value = 'ID Historia';
    sheetBacklog.getCell('G8').value = 'Como (Rol)...';
    sheetBacklog.getCell('H8').value = 'Deseo....';
    sheetBacklog.getCell('I8').value = 'Para....';

    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(c => Object.assign(sheetBacklog.getCell(`${c}8`), tableHeaderStyle));
    sheetBacklog.getCell('J7').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Anchos de columna
    sheetBacklog.getColumn('B').width = 15; // ID Epica
    sheetBacklog.getColumn('C').width = 20; // Como E
    sheetBacklog.getColumn('D').width = 35; // Deseo E
    sheetBacklog.getColumn('E').width = 35; // Para E
    sheetBacklog.getColumn('F').width = 15; // ID Historia
    sheetBacklog.getColumn('G').width = 25; // Como H
    sheetBacklog.getColumn('H').width = 45; // Deseo H
    sheetBacklog.getColumn('I').width = 35; // Para H
    sheetBacklog.getColumn('J').width = 45; // Criterios

    let currentRow = 9;

    epicas.forEach((epica, indexEpica) => {
      const historiasDeEpica = historias.filter(h => h.id_epica === epica.id_epica);
      const epicaIdFormat = `EPIC${(indexEpica + 1).toString().padStart(2, '0')}`;
      
      if (historiasDeEpica.length === 0) {
        // Epica sin historias
        sheetBacklog.getCell(`B${currentRow}`).value = epicaIdFormat;
        sheetBacklog.getCell(`C${currentRow}`).value = ''; 
        sheetBacklog.getCell(`D${currentRow}`).value = epica.nombre;
        sheetBacklog.getCell(`E${currentRow}`).value = epica.descripcion || '';
        
        sheetBacklog.getCell(`F${currentRow}`).value = '';
        sheetBacklog.getCell(`G${currentRow}`).value = '(Sin historias de usuario)';
        sheetBacklog.getCell(`H${currentRow}`).value = '';
        sheetBacklog.getCell(`I${currentRow}`).value = '';
        sheetBacklog.getCell(`J${currentRow}`).value = '';
        
        ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(c => {
          Object.assign(sheetBacklog.getCell(`${c}${currentRow}`), tableCellStyle);
          if (c === 'B' || c === 'F') { 
             sheetBacklog.getCell(`${c}${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          }
        });
        
        currentRow++;
      } else {
        // Epica con historias
        let startRow = currentRow;
        historiasDeEpica.forEach((historia, indexHistoria) => {
          const criteriosHistoria = criterios.filter(c => c.id_historia === historia.id_historia);
          let criteriosTexto = '';
          criteriosHistoria.forEach((crit, i) => {
            criteriosTexto += `${i + 1}. ${crit.descripcion}\n`;
          });
          
          sheetBacklog.getCell(`F${currentRow}`).value = indexHistoria + 1; 
          sheetBacklog.getCell(`G${currentRow}`).value = historia.como_quien || 'Usuario';
          sheetBacklog.getCell(`H${currentRow}`).value = historia.quiero || historia.nombre;
          sheetBacklog.getCell(`I${currentRow}`).value = historia.para || '';
          sheetBacklog.getCell(`J${currentRow}`).value = criteriosTexto.trim();
          
          ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(c => {
            Object.assign(sheetBacklog.getCell(`${c}${currentRow}`), tableCellStyle);
            if(c === 'B' || c === 'F') {
               sheetBacklog.getCell(`${c}${currentRow}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            }
          });
          
          currentRow++;
        });

        // Combinar celdas de Épica (columnas B, C, D, E)
        if (currentRow - 1 > startRow) {
          ['B', 'C', 'D', 'E'].forEach(c => {
            sheetBacklog.mergeCells(`${c}${startRow}:${c}${currentRow - 1}`);
          });
        }
        sheetBacklog.getCell(`B${startRow}`).value = epicaIdFormat;
        sheetBacklog.getCell(`C${startRow}`).value = '';
        sheetBacklog.getCell(`D${startRow}`).value = epica.nombre;
        sheetBacklog.getCell(`E${startRow}`).value = epica.descripcion || '';
      }
    });


    // Hoja: Proyecto
    const sheetProyecto = workbook.addWorksheet('Proyecto');
    addProjectHeader(sheetProyecto, 'Detalles del Proyecto', 'G');
    
    const headerProyecto = sheetProyecto.addRow(['', 'ID', 'Nombre', 'Descripción', 'Fecha Inicio', 'Fecha Fin', 'Estado']);
    headerProyecto.eachCell((cell, colNumber) => { if(colNumber > 1) Object.assign(cell, headerStyle); });
    
    sheetProyecto.addRow(['',
      proyecto.id_proyecto,
      proyecto.nombre,
      proyecto.descripcion,
      proyecto.fecha_inicio ? new Date(proyecto.fecha_inicio).toLocaleDateString() : '',
      proyecto.fecha_fin_est ? new Date(proyecto.fecha_fin_est).toLocaleDateString() : '',
      formatEstado(proyecto.estado)
    ]);
    
    sheetProyecto.getColumn('B').width = 10;
    sheetProyecto.getColumn('C').width = 30;
    sheetProyecto.getColumn('D').width = 50;
    sheetProyecto.getColumn('E').width = 15;
    sheetProyecto.getColumn('F').width = 15;
    sheetProyecto.getColumn('G').width = 15;

    // Hoja: Miembros
    const sheetMiembros = workbook.addWorksheet('Miembros');
    addProjectHeader(sheetMiembros, 'Miembros del Equipo', 'E');
    
    const headerMiembros = sheetMiembros.addRow(['', 'Nombre', 'Email', 'Rol', 'Estado']);
    headerMiembros.eachCell((cell, colNumber) => { if(colNumber > 1) Object.assign(cell, headerStyle); });
    
    miembros.forEach(m => sheetMiembros.addRow(['',
      m.nombre, 
      m.email, 
      m.nombre_rol, 
      m.activo ? 'Activo' : 'Inactivo'
    ]));
    
    sheetMiembros.getColumn('B').width = 30;
    sheetMiembros.getColumn('C').width = 35;
    sheetMiembros.getColumn('D').width = 20;
    sheetMiembros.getColumn('E').width = 15;

    // Hoja: Sprints
    const sheetSprints = workbook.addWorksheet('Sprints');
    addProjectHeader(sheetSprints, 'Historial de Sprints', 'G');
    
    const headerSprints = sheetSprints.addRow(['', 'ID', 'Nombre', 'Objetivo', 'Fecha Inicio', 'Fecha Fin', 'Estado']);
    headerSprints.eachCell((cell, colNumber) => { if(colNumber > 1) Object.assign(cell, headerStyle); });
    
    sprints.forEach(s => sheetSprints.addRow(['',
      s.id_sprint, 
      s.nombre, 
      s.objetivo, 
      s.fecha_inicio ? new Date(s.fecha_inicio).toLocaleDateString() : '', 
      s.fecha_fin ? new Date(s.fecha_fin).toLocaleDateString() : '', 
      formatEstado(s.estado)
    ]));
    
    sheetSprints.getColumn('B').width = 10;
    sheetSprints.getColumn('C').width = 30;
    sheetSprints.getColumn('D').width = 40;
    sheetSprints.getColumn('E').width = 15;
    sheetSprints.getColumn('F').width = 15;
    sheetSprints.getColumn('G').width = 15;

    // Hoja: Epicas
    const sheetEpicas = workbook.addWorksheet('Epicas');
    addProjectHeader(sheetEpicas, 'Listado de Épicas', 'E');
    
    const headerEpicas = sheetEpicas.addRow(['', 'ID', 'Nombre', 'Descripción', 'Estado']);
    headerEpicas.eachCell((cell, colNumber) => { if(colNumber > 1) Object.assign(cell, headerStyle); });
    
    epicas.forEach(e => sheetEpicas.addRow(['', e.id_epica, e.nombre, e.descripcion, formatEstado(e.estado)]));
    
    sheetEpicas.getColumn('B').width = 10;
    sheetEpicas.getColumn('C').width = 30;
    sheetEpicas.getColumn('D').width = 40;
    sheetEpicas.getColumn('E').width = 15;

    // Hoja: Historias
    const sheetHistorias = workbook.addWorksheet('Historias');
    addProjectHeader(sheetHistorias, 'Historias de Usuario', 'G');
    
    const headerHistorias = sheetHistorias.addRow(['', 'ID', 'Épica', 'Nombre', 'Puntos', 'Prioridad', 'Estado']);
    headerHistorias.eachCell((cell, colNumber) => { if(colNumber > 1) Object.assign(cell, headerStyle); });
    
    historias.forEach(h => sheetHistorias.addRow(['',
      h.id_historia, 
      h.epica_nombre, 
      h.nombre, 
      h.story_points, 
      h.prioridad, 
      formatEstado(h.estado)
    ]));
    
    sheetHistorias.getColumn('B').width = 10;
    sheetHistorias.getColumn('C').width = 30;
    sheetHistorias.getColumn('D').width = 35;
    sheetHistorias.getColumn('E').width = 10;
    sheetHistorias.getColumn('F').width = 15;
    sheetHistorias.getColumn('G').width = 15;

    // Hoja: Tareas
    const sheetTareas = workbook.addWorksheet('Tareas');
    addProjectHeader(sheetTareas, 'Desglose de Tareas', 'I');
    
    const headerTareas = sheetTareas.addRow(['', 'ID', 'Historia', 'Nombre', 'Tipo', 'Estado', 'Responsable', 'Estimación (días)', 'Tiempo Real']);
    headerTareas.eachCell((cell, colNumber) => { if(colNumber > 1) Object.assign(cell, headerStyle); });
    
    const formatDias = (valor) => {
      if (valor == null || valor === '') return '';
      const num = parseFloat(valor);
      if (isNaN(num)) return '';
      if (num === 0.5) return 'Medio día';
      if (num === 1) return '1 día';
      return `${num} días`;
    };

    tareas.forEach(t => sheetTareas.addRow(['',
      t.id_tarea, 
      t.historia_nombre, 
      t.nombre, 
      formatTipo(t.tipo), 
      formatEstado(t.estado), 
      t.responsable || 'Sin asignar', 
      formatDias(t.estimacion_dias),
      formatDias(t.tiempo_real)
    ]));
    
    sheetTareas.getColumn('B').width = 10;
    sheetTareas.getColumn('C').width = 35;
    sheetTareas.getColumn('D').width = 35;
    sheetTareas.getColumn('E').width = 25;
    sheetTareas.getColumn('F').width = 15;
    sheetTareas.getColumn('G').width = 25;
    sheetTareas.getColumn('H').width = 20;
    sheetTareas.getColumn('I').width = 15;

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
