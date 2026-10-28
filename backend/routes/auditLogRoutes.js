// Audit log route (admin only). Optional ?patientId=P-0001 shows one patient's activity.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { listRecent } = require('../services/auditService');

const router = express.Router();

router.get('/', requireRole('admin'), async (req, res) => {
  res.json(await listRecent(req.query.patientId));
});

module.exports = router;
