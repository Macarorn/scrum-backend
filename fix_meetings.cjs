const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: 'scrum_db_demo',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  });

  // 1. Add id_proyecto column if missing
  try {
    await conn.query('ALTER TABLE meeting ADD COLUMN id_proyecto INT NULL AFTER id_meeting');
    console.log('✅ Column id_proyecto added');
  } catch (e) {
    console.log('ℹ️  Column id_proyecto already exists');
  }

  // 2. Add index
  try {
    await conn.query('ALTER TABLE meeting ADD INDEX idx_project_meeting (id_proyecto)');
  } catch (e) {}

  // 3. Add FK
  try {
    await conn.query(`ALTER TABLE meeting ADD CONSTRAINT fk_meeting_proyecto 
      FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE`);
  } catch (e) {}

  // 4. Delete old meetings
  await conn.query('DELETE FROM meeting');
  console.log('🗑️  Old meetings deleted');

  // 5. Insert new meetings with id_proyecto
  const sql = `
    INSERT INTO meeting (id_proyecto, title, description, sprint, status, date, type, startTime, duration, room, link) VALUES
    (1, 'Daily Standup', 'Reunión diaria de sincronización del equipo', 'Sprint 2 - Sprints & Kanban', 'programada', DATE_ADD(NOW(), INTERVAL 1 DAY), 'daily', '09:00', '15 min', 'Sala Virtual A', 'https://meet.google.com/abc-defg-hij'),
    (1, 'Sprint Planning', 'Planificación del Sprint 3', 'Sprint 2 - Sprints & Kanban', 'programada', DATE_ADD(NOW(), INTERVAL 3 DAY), 'planning', '10:00', '2 horas', 'Sala Principal', 'https://meet.google.com/xyz-uvw-rst'),
    (1, 'Sprint Review', 'Revisión de lo avanzado en Sprint 2', 'Sprint 2 - Sprints & Kanban', 'programada', DATE_ADD(NOW(), INTERVAL 12 DAY), 'review', '15:00', '1 hora', 'Sala Principal', 'https://meet.google.com/123-456-789'),
    (1, 'Retrospectiva Sprint 1', 'Retrospectiva del Sprint 1 completado', 'Sprint 1 - Foundations', 'completada', DATE_SUB(NOW(), INTERVAL 1 DAY), 'retro', '16:00', '1 hora', 'Sala C', 'https://meet.google.com/qwe-asd-zxc'),
    (1, 'Refinamiento de Backlog', 'Refinar historias para el Sprint 3', 'Sprint 2 - Sprints & Kanban', 'programada', DATE_ADD(NOW(), INTERVAL 5 DAY), 'refinement', '14:00', '1 hora', 'Sala D', 'https://meet.google.com/rty-fgh-vbn'),
    (1, 'Daily Standup - Miércoles', 'Sync diario del equipo', 'Sprint 2 - Sprints & Kanban', 'programada', DATE_ADD(NOW(), INTERVAL 4 DAY), 'daily', '09:00', '15 min', 'Sala Virtual A', 'https://meet.google.com/abc-defg-hij'),
    (2, 'Planning E-commerce', 'Planificación inicial del proyecto E-commerce', 'Sprint 1 - Catálogo Base', 'programada', DATE_ADD(NOW(), INTERVAL 2 DAY), 'planning', '11:00', '2 horas', 'Sala B', 'https://meet.google.com/ecom-plan-001'),
    (2, 'Kickoff E-commerce', 'Reunión de arranque del proyecto', 'Sprint 1 - Catálogo Base', 'programada', DATE_ADD(NOW(), INTERVAL 6 DAY), 'review', '10:00', '1 hora', 'Sala B', 'https://meet.google.com/ecom-kick-002')
  `;

  await conn.query(sql);
  console.log('✅ 8 meetings inserted with id_proyecto!');

  const [rows] = await conn.query('SELECT id_meeting, id_proyecto, title, date FROM meeting ORDER BY date');
  console.table(rows.map(r => ({ id: r.id_meeting, proyecto: r.id_proyecto, titulo: r.title, fecha: r.date })));

  await conn.end();
  console.log('\n🎉 Done!');
})();
