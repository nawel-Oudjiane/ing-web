// routes/rooms.routes.js
// routes/rooms.routes.js
const express = require('express');
const router = express.Router();
const roomsController = require('../controllers/rooms.controller');
const { authMiddleware } = require('../middleware/auth');

// Routes publiques (visiteurs/clients)
router.get('/', roomsController.getAll); // route get pour obtenir toutes les salles avec roomController.getAll lier au controller
router.get('/:id', roomsController.getOne);

// Routes protégées
router.post('/', authMiddleware, roomsController.create);// route post pour créer une salle avec authMiddleware pour vérifier l'authentification
router.put('/:id', authMiddleware, roomsController.update);//route put pour mettre à jour une salle avec authMiddleware pour vérifier l'authentification
router.delete('/:id', authMiddleware, roomsController.remove);//route delete pour supprimer une salle avec authMiddleware pour vérifier l'authentification

// Route spécifique pour les propriétaires (leurs salles seulement)
router.get('/owner/my-rooms', authMiddleware, roomsController.getOwnerRooms);

module.exports = router;