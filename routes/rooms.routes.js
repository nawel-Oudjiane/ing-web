// routes/rooms.routes.js
const express = require('express');
const RoomsController = require('../controllers/rooms.controller');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// PUBLIC : GET toutes les salles
router.get('/', RoomsController.getAll);

// GET une salle spécifique (propriétaire / admin)
router.get('/:id', authMiddleware, RoomsController.getOne);

// OWNER : créer une salle
router.post('/', authMiddleware, RoomsController.create);

// OWNER / ADMIN : modifier salle
router.put('/:id', authMiddleware, RoomsController.update);

// OWNER / ADMIN : supprimer salle
router.delete('/:id', authMiddleware, RoomsController.remove);

module.exports = router;
