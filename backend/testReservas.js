const { getPool } = require('./db'); // tu db.js correcto
const sql = require('mssql');

async function test() {
  try {
    const pool = await getPool();
    console.log("✅ Conexión a Azure SQL OK");

    // Insertar reserva de prueba
    const nombre = "Camastro Test";
    const horario = "AM";
    const usuario = "venom-891@hotmail.com";
    const precio = 123.45;

    await pool.request()
      .input("camastro", sql.VarChar, nombre)
      .input("horario", sql.VarChar, horario)
      .input("usuario", sql.VarChar, usuario)
      .input("precio", sql.Decimal(10,2), precio)
      .query(`
        INSERT INTO reservas (camastro, horario, usuario, total, fecha)
        VALUES (@camastro, @horario, @usuario, @precio, GETDATE())
      `);

    console.log("✅ Reserva de prueba insertada correctamente");

    // Leer reservas de este usuario
    const result = await pool.request()
      .input("usuario", sql.VarChar, usuario)
      .query(`
        SELECT camastro, horario, usuario, total, fecha
        FROM reservas
        WHERE usuario = @usuario
        ORDER BY fecha DESC
      `);

    console.log("📋 Reservas encontradas:", result.recordset);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

test();
