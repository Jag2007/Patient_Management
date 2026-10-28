// Staff account routes (admin only): list, create, reset password, enable/disable and delete. Calls userService.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const userService = require('../services/userService');

const router = express.Router();
router.use(requireRole('admin'));

router.get('/', async (req, res) => {
  res.json(await userService.listUsers());
});

router.post('/', async (req, res) => {
  res.status(201).json(await userService.createStaff(req.body, req.user));
});

router.put('/:id/password', async (req, res) => {
  await userService.resetPassword(req.params.id, req.body?.password, req.user);
  res.status(204).end();
});

router.patch('/:id/active', async (req, res) => {
  res.json(await userService.setActive(req.params.id, req.body?.active, req.user));
});

router.delete('/:id', async (req, res) => {
  await userService.deleteStaff(req.params.id, req.user);
  res.status(204).end();
});

module.exports = router;
