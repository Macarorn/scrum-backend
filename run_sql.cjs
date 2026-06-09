const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    multipleStatements: true
  });

  console.log('Connected to database server.');

  const sqlPath = path.join(__dirname, 'demo_data_extended.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing SQL file...');
  try {
    await connection.query(sql);
    console.log('SQL file executed successfully!');
  } catch (err) {
    console.error('Error executing SQL:', err.message);
  } finally {
    await connection.end();
  }
}

run();
