// routes/bookings.routes.js
const express = require('express');
const router = express.Router();
const BookingsController = require('../controllers/bookings.controller');
const { authMiddleware, verifyTokenClient } = require('../middleware/auth');

// Client uniquement
router.post('/', authMiddleware, verifyTokenClient, BookingsController.create);
router.get('/my', authMiddleware, verifyTokenClient, BookingsController.getMyBookings);
// LIGNE POUR L'ANNULATION :
router.put('/:id/cancel', authMiddleware, verifyTokenClient, BookingsController.cancel);

module.exports = router;