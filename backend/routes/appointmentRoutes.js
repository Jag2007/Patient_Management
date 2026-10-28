// Appointment endpoints: list (optionally by ?patientId=), create, and cancel.
// Thin on purpose; all rules (date checks, atomic cancel) live in appointmentService.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const appointmentService = require('../services/appointmentService');

const router = express.Router();
router.use(requireRole('admin', 'staff'));

router.get('/', async (req, res) => {
  res.json(await appointmentService.listAppointments(req.query.patientId));
});

router.post('/', async (req, res) => {
  res.status(201).json(await appointmentService.createAppointment(req.body, req.user));
});

router.patch('/:id/cancel', async (req, res) => {
  res.json(await appointmentService.cancelAppointment(req.params.id, req.user));
});

module.exports = router;
