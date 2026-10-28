// POST /api/auth/login: the only public endpoint. Returns a JWT and the user's role.
// The frontend stores the token and sends it as "Authorization: Bearer <token>".
const express = require('express');
const authService = require('../services/authService');

const router = express.Router();

router.post('/login', async (req, res) => {
  const result = await authService.login(req.body?.username, req.body?.password);
  res.json(result);
});

module.exports = router;
