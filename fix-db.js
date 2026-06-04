import pool from './src/utils/database.js';

async function fix() {
  console.log('Iniciando actualización de la base de datos...');
  
  try {
    await pool.query('ALTER TABLE solicitud ADD COLUMN id_usuario_creador INT DEFAULT NULL');
    await pool.query('ALTER TABLE solicitud ADD CONSTRAINT fk_solicitud_creador FOREIGN KEY (id_usuario_creador) REFERENCES usuario(id_usuario) ON DELETE SET NULL');
    console.log('✅ Tabla solicitud actualizada.');
  } catch(e) { 
    console.log('⚠️ solicitud (probablemente ya exista):', e.message); 
  }

  try {
    await pool.query("ALTER TABLE notificacion MODIFY COLUMN tipo ENUM('sistema','urgente','prioritaria','mensajeria','informativa','recordatorio','reunion_creada','reunion_actualizada','reunion_eliminada') NOT NULL DEFAULT 'informativa'");
    await pool.query('ALTER TABLE notificacion ADD COLUMN id_meeting INT DEFAULT NULL');
    await pool.query('ALTER TABLE notificacion ADD COLUMN id_proyecto INT DEFAULT NULL');
    await pool.query('ALTER TABLE notificacion ADD COLUMN accion VARCHAR(50) DEFAULT NULL');
    await pool.query('CREATE INDEX idx_notificacion_meeting ON notificacion(id_meeting)');
    await pool.query('CREATE INDEX idx_notificacion_proyecto ON notificacion(id_proyecto)');
    console.log('✅ Tabla notificacion actualizada.');
  } catch(e) { 
    console.log('⚠️ notificacion (probablemente ya exista):', e.message); 
  }

  try {
    await pool.query('ALTER TABLE rol ADD COLUMN id_proyecto INT NULL');
    await pool.query('ALTER TABLE rol DROP INDEX nombre_rol');
    await pool.query('ALTER TABLE rol ADD UNIQUE KEY uk_rol_nombre_proyecto (id_proyecto, nombre_rol)');
    console.log('✅ Tabla rol actualizada.');
  } catch(e) { 
    console.log('⚠️ rol (probablemente ya exista):', e.message); 
  }

  console.log('🎉 ¡LISTO! Base de datos actualizada correctamente.');
  process.exit();
}

fix();
