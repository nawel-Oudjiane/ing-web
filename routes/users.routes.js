const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/users.controller');
const { authMiddleware, verifyTokenAdmin } = require('../middleware/auth');

// GET all users (admin uniquement)
router.get('/', verifyTokenAdmin, UsersController.getAll);

// PUT /api/users/:id/status -> activer/désactiver (admin)
router.put('/:id/status', verifyTokenAdmin, UsersController.updateStatus);

module.exports = router; 


