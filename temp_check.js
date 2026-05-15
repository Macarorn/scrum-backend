import mysql from 'mysql2/promise.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scrum_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkData() {
  try {
    console.log('=== ROLES ===');
    const [roles] = await pool.execute('SELECT * FROM rol ORDER BY id_rol');
    console.log(roles);

    console.log('\n=== MIEMBROS DEL PROYECTO 1 ===');
    const [members] = await pool.execute(`
      SELECT u.nombre, r.nombre_rol, uep.activo, uep.id_usuario
      FROM usuario_equipo_proyecto uep
      JOIN usuario u ON uep.id_usuario = u.id_usuario
      JOIN rol r ON uep.id_rol = r.id_rol
      WHERE uep.id_equipo_proyecto = (
        SELECT id_equipo_proyecto FROM equipo_proyecto WHERE id_proyecto = 1 LIMIT 1
      )
    `);
    console.log(members);

    console.log('\n=== USUARIOS Y SUS ROLES GLOBALES ===');
    const [users] = await pool.execute(`
      SELECT u.id_usuario, u.nombre, ur.id_rol, r.nombre_rol
      FROM usuario u
      LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN rol r ON ur.id_rol = r.id_rol
      WHERE u.id_usuario IN (1,2)
    `);
    console.log(users);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkData();