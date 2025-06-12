require('dotenv').config();
const mysql = require("mysql2/promise");

port: process.env.PORT;
const dbConfig = {
  host: process.env.DB_HOS,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true
};

console.log("Configuración de la base de datos:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  passwordProvided: dbConfig.password ? "Sí" : "No"
});

// Crea el pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función mejorada para verificar conexión
const verifyConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("✅ Conexión a la base de datos establecida");
    
    // Ejecuta una consulta simple para verificar
    const [rows] = await connection.query("SELECT 1 + 1 AS result");
    console.log("✅ Prueba de consulta exitosa. Resultado:", rows[0].result);
  } catch (err) {
    console.error("❌ Error de conexión a la base de datos:", {
      code: err.code,
      message: err.message
    });
    
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("⚠️ Error de autenticación. Verifica usuario y contraseña");
    } else if (err.code === 'ECONNREFUSED') {
      console.error("⚠️ MySQL no está corriendo o la configuración es incorrecta");
    }
  } finally {
    if (connection) connection.release();
  }
};

// Verificar conexión al iniciar
verifyConnection();

// Exportar el pool
module.exports = pool;
