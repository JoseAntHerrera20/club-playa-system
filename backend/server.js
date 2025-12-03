// -------------------------
//   IMPORTS Y CONFIG
// -------------------------
const express = require('express');
const cors = require('cors');
const { getPool } = require('./db'); // <-- USAR AZURE
const sql = require('mssql');

const app = express();

// =========================
// CORS CONFIGURADO PARA FRONTEND
// =========================
app.use(cors({
  origin: 'https://jolly-water-0b1eea10f.3.azurestaticapps.net', // tu frontend
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Habilitar preflight para todas las rutas
app.options('*', cors());

app.use(express.json());

// -------------------------
//   RUTA: GET /api/reservas   (solo por usuario)
// -------------------------
app.get('/api/reservas', async (req, res) => {
  const usuario = req.query.usuario;

  if (!usuario) {
    return res.status(400).json({ error: "Debes enviar ?usuario=correo@algo.com" });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("usuario", sql.VarChar, usuario)
      .query(`
        SELECT camastro AS nombre, horario, usuario, total AS precio, fecha
        FROM reservas
        WHERE usuario = @usuario
        ORDER BY fecha DESC
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error("❌ Error SQL GET /reservas:", err);
    res.status(500).json({ error: "Error leyendo reservas desde SQL" });
  }
});

// -------------------------
//   RUTA ADMIN: TODAS LAS RESERVAS
// -------------------------
app.get('/api/reservas/todas', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT camastro AS nombre, horario, usuario, total AS precio, fecha
        FROM reservas
        ORDER BY fecha DESC
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error("❌ Error SQL GET /reservas/todas:", err);
    res.status(500).json({ error: "Error leyendo TODAS las reservas desde SQL" });
  }
});

// -------------------------
//   RUTA: POST /api/reservas
// -------------------------
app.post('/api/reservas', async (req, res) => {
  const { nombre, horario, precio, usuario } = req.body;

  if (!nombre || !horario || !usuario) {
    return res.status(400).json({ error: "Faltan datos requeridos (nombre, horario, usuario)" });
  }

  try {
    const pool = await getPool();

    // Verifica si ya existe la reserva en ese horario
    const existe = await pool.request()
      .input("camastro", sql.VarChar, nombre)
      .input("horario", sql.VarChar, horario)
      .query(`
        SELECT id FROM reservas
        WHERE camastro = @camastro AND horario = @horario
      `);

    if (existe.recordset.length > 0) {
      return res.status(409).json({ error: `El espacio ya está reservado en ${horario}` });
    }

    // Insertar reserva
    await pool.request()
      .input("camastro", sql.VarChar, nombre)
      .input("horario", sql.VarChar, horario)
      .input("usuario", sql.VarChar, usuario)
      .input("precio", sql.Decimal(10,2), precio || 0)
      .query(`
        INSERT INTO reservas (camastro, horario, usuario, total, fecha)
        VALUES (@camastro, @horario, @usuario, @precio, GETDATE())
      `);

    res.status(201).json({
      mensaje: "Reserva creada correctamente",
      reserva: { nombre, horario, usuario, precio }
    });

  } catch (err) {
    console.error("❌ Error SQL POST /reservas:", err);
    res.status(500).json({ error: "Error guardando reserva en SQL" });
  }
});

// -------------------------
//   INICIAR SERVIDOR
// -------------------------
app.listen(3000, () => {
  console.log("✅ Backend corriendo en http://localhost:3000 (Azure SQL)");
});
