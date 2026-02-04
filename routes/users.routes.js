// routes/users.routes.js
const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/users.controller');
const { authMiddleware, verifyTokenAdmin } = require('../middleware/auth');

// GET all users (admin uniquement)
router.get('/', verifyTokenAdmin, UsersController.getAll);

// GET user by ID (admin uniquement) 
router.get('/:id', verifyTokenAdmin, UsersController.getOne);

// PUT /api/users/:id/status -> activer/désactiver (admin)
router.put('/:id/status', verifyTokenAdmin, UsersController.updateStatus);


// DELETE user (admin uniquement) 
router.delete('/:id', verifyTokenAdmin, UsersController.delete);

//router POST /api/users/register -> créer un nouvel utilisateur par (admin)
router.post('/register', verifyTokenAdmin, UsersController.register);

module.exports = router;