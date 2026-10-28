// GET /api/documents: admin only. Lists the clinic documents the AI assistant answers from, section by section.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { listDocuments } = require('../services/documentService');

const router = express.Router();

router.get('/', requireRole('admin'), async (req, res) => {
  res.json(await listDocuments());
});

module.exports = router;
