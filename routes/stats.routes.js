// routes/stats.routes.js
const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/stats.controller');
const { authMiddleware, verifyTokenAdmin } = require('../middleware/auth');

// Route principale - redirige automatiquement selon le rôle
router.get('/', authMiddleware, (req, res) => {
    if (req.user.role === 'admin') {
        // Redirige vers la route admin
        return StatsController.getGlobalStats(req, res);
    } else if (req.user.role === 'owner') {
        // Redirige vers la route owner
        return StatsController.getOwnerStats(req, res);
    } else {
        // Pour les clients on retourne une erreur
        return res.status(403).json({ error: 'Accès non autorisé aux statistiques' });
    }
});

// Routes spécifiques
router.get('/admin', verifyTokenAdmin, StatsController.getGlobalStats);
router.get('/owner', authMiddleware, StatsController.getOwnerStats);

module.exports = router;