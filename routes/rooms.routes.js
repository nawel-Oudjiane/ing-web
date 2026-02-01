// routes/rooms.routes.js
// routes/rooms.routes.js
const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/rooms.controller');
const { authMiddleware } = require('../middleware/auth');

// Routes publiques (visiteurs/clients)
router.get('/', roomsController.getAll); // S'adapte selon utilisateur
router.get('/:id', roomsController.getOne);

// Routes protégées
router.post('/', authMiddleware, roomsController.create);
router.put('/:id', authMiddleware, roomsController.update);
router.delete('/:id', authMiddleware, roomsController.remove);

// Route spécifique pour les propriétaires (leurs salles seulement)
router.get('/owner/my-rooms', authMiddleware, roomsController.getOwnerRooms);

module.exports = router;