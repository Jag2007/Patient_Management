// GET /api/audit-logs: admin only. Staff get 403 from requireRole, even if they call it directly.
// Returns the latest audit entries, newest first. Optional ?patientId=P-0001 shows one patient's activity.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { listRecent } = require('../services/auditService');

const router = express.Router();

router.get('/', requireRole('admin'), async (req, res) => {
  res.json(await listRecent(req.query.patientId));
});

module.exports = router;
