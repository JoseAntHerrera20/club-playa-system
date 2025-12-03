const express = require('express');
const router = express.Router();

let reservas = []; // Esto luego lo conectaremos a base de datos

// Obtener reservas guardadas
router.get('/', (req, res) => {
  res.json(reservas);
});

// Guardar una nueva reserva
router.post('/', (req, res) => {
  const { nombre, horario } = req.body;

  if (!nombre || !horario) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  // Validar si ya está reservado ese horario
  const yaReservado = reservas.find(r => r.nombre === nombre && r.horario === horario);

  if (yaReservado) {
    return res.status(409).json({ error: 'Ya reservado para ese horario.' });
  }

  // Guardar reserva
  reservas.push({ nombre, horario });
  res.status(201).json({ message: 'Reserva guardada correctamente.' });
});

module.exports = router;
