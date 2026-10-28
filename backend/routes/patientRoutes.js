// Patient routes: reads the request and calls patientService.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const patientService = require('../services/patientService');

const router = express.Router();
router.use(requireRole('admin', 'staff'));

router.get('/', async (req, res) => {
  res.json(await patientService.listPatients(req.query.search));
});

router.post('/', async (req, res) => {
  res.status(201).json(await patientService.createPatient(req.body, req.user));
});

router.get('/:patientId', async (req, res) => {
  res.json(await patientService.getPatient(req.params.patientId, req.user));
});

router.put('/:patientId', async (req, res) => {
  res.json(await patientService.updatePatient(req.params.patientId, req.body, req.user));
});

module.exports = router;
