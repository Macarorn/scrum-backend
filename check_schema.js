import pool from "./src/utils/database.js";

async function checkSchema() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM notificacion LIKE 'tipo'");
    console.log("Columna 'tipo' de la tabla notificacion:");
    console.log(rows);
    
    const [rows2] = await pool.query("SELECT * FROM notificacion LIMIT 5");
    console.log("\nÚltimas 5 notificaciones:");
    console.log(rows2);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkSchema();
