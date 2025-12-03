const express = require('express');
const cors = require('cors');
const { getPool } = require('./db');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Obtener reservas
app.get('/api/reservas', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM reservas');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error obteniendo reservas desde SQL');
  }
});

// Guardar nueva reserva
app.post('/api/reservas', async (req, res) => {
  const { camastro, horario, fecha, total } = req.body;

  try {
    const pool = await getPool();
    await pool.request()
      .input('camastro', camastro)
      .input('horario', horario)
      .input('fecha', fecha)
      .input('total', total)
      .query('INSERT INTO reservas (camastro, horario, fecha, total) VALUES (@camastro, @horario, @fecha, @total)');

    res.json({ message: 'Reserva guardada' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error guardando reserva en SQL');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
