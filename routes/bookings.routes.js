// routes/bookings.routes.js pour la gestion des réservations
const express = require('express');
const router = express.Router();
const BookingsController = require('../controllers/bookings.controller');
const { authMiddleware, verifyTokenClient } = require('../middleware/auth');
const { validateBooking } = require('../middleware/validate');

// Client uniquement
router.post('/', authMiddleware, verifyTokenClient, validateBooking, BookingsController.create);
router.get('/my', authMiddleware, verifyTokenClient, BookingsController.getMyBookings);
// Annuler une réservation (client)
router.put('/:id/cancel', authMiddleware, verifyTokenClient, BookingsController.cancel);

// ROUTES pour propriétaire/admin
router.get('/', authMiddleware, (req, res, next) => {
    // Vérifie si c'est admin ou propriétaire
    if (req.user.role === 'admin' || req.user.role === 'owner') {
        return BookingsController.getAllBookings(req, res, next); 
    }
    res.status(403).json({ error: 'Accès non autorisé' });
});
//route pour mettre à jour le statut d'une réservation (admin/propriétaire)
router.put('/:id/status', authMiddleware, (req, res, next) => {
    // Vérifie si c'est admin ou propriétaire
    if (req.user.role === 'admin' || req.user.role === 'owner') {
        return BookingsController.updateBookingStatus(req, res, next);
    }
    res.status(403).json({ error: 'Accès non autorisé' });
});



module.exports = router;