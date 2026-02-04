// routes/reviews.routes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Route pour voir les avis d'une salle (publique)
router.get('/room/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        
        const result = await db.query(
            `SELECT r.*, u.full_name as user_name
             FROM reviews r
             JOIN users u ON r.client_id = u.id
             WHERE r.room_id = $1
             ORDER BY r.created_at DESC`,
            [roomId]
        );
        
        // Calculer la moyenne
        const avgResult = await db.query(
            `SELECT AVG(rating) as average, COUNT(*) as count
             FROM reviews 
             WHERE room_id = $1`,
            [roomId]
        );
        
        res.json({
            reviews: result.rows,
            stats: {
                average: parseFloat(avgResult.rows[0].average) || 0,
                count: parseInt(avgResult.rows[0].count) || 0
            }
        });
        
    } catch (err) {
        console.error('Erreur récupération avis:', err);
        res.status(500).json({ error: 'Erreur récupération avis' });
    }
});

// Route pour créer un avis (client seulement)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.id;
        const { booking_id, rating, comment } = req.body;
        
        // Validation
        if (!booking_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Données invalides' });
        }
        
        console.log(`Création avis: client=${clientId}, booking=${booking_id}`);
        
        // Vérifier que la réservation existe et appartient au client
        const booking = await db.query(
            `SELECT b.*, r.id as room_id 
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             WHERE b.id = $1 AND b.client_id = $2`,
            [booking_id, clientId]
        );
        
        if (booking.rows.length === 0) {
            return res.status(403).json({ error: 'Réservation non trouvée ou non autorisée' });
        }
        
        const bookingData = booking.rows[0];
        const roomId = bookingData.room_id;
        
        // Vérifier que la réservation est terminée
        const endTime = new Date(bookingData.end_time);
        const now = new Date();
        
        if (endTime > now) {
            return res.status(400).json({ 
                error: 'Vous ne pouvez noter qu\'une réservation terminée' 
            });
        }
        
        // Vérifier si le client a déjà noté cette réservation
        const existingReview = await db.query(
            'SELECT * FROM reviews WHERE booking_id = $1 AND client_id = $2',
            [booking_id, clientId]
        );
        
        if (existingReview.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Vous avez déjà noté cette réservation' 
            });
        }
        
        // Créer l'avis (directement approuvé, pas de modération pour simplifier)
        const result = await db.query(
            `INSERT INTO reviews (booking_id, client_id, room_id, rating, comment) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [booking_id, clientId, roomId, rating, comment || null]
        );
        
        console.log(` Avis créé: ID ${result.rows[0].id}`);
        
        res.status(201).json({
            success: true,
            message: 'Avis ajouté avec succès',
            review: result.rows[0]
        });
        
    } catch (err) {
        console.error('Erreur création avis:', err);
        res.status(500).json({ error: 'Erreur création avis', details: err.message });
    }
});

// Route pour récupérer les avis du client connecté
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.id;
        
        const result = await db.query(
            `SELECT r.*, rm.name as room_name, b.start_time as booking_date
             FROM reviews r
             JOIN rooms rm ON r.room_id = rm.id
             JOIN bookings b ON r.booking_id = b.id
             WHERE r.client_id = $1
             ORDER BY r.created_at DESC`,
            [clientId]
        );
        
        res.json(result.rows);
        
    } catch (err) {
        console.error('Erreur récupération avis client:', err);
        res.status(500).json({ error: 'Erreur récupération avis' });
    }
});

// Route pour tous les avis (admin seulement)
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        
        const result = await db.query(
            `SELECT r.*, u.full_name as client_name, 
                    rm.name as room_name, rm.id as room_id
             FROM reviews r
             JOIN users u ON r.client_id = u.id
             JOIN rooms rm ON r.room_id = rm.id
             ORDER BY r.created_at DESC`
        );
        
        res.json(result.rows);
        
    } catch (err) {
        console.error('Erreur récupération avis admin:', err);
        res.status(500).json({ error: 'Erreur récupération avis' });
    }
});

// Supprimer un avis (admin ou propriétaire de l'avis)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Vérifier que l'avis existe
        const review = await db.query(
            'SELECT * FROM reviews WHERE id = $1',
            [reviewId]
        );
        
        if (review.rows.length === 0) {
            return res.status(404).json({ error: 'Avis non trouvé' });
        }
        
        const reviewData = review.rows[0];
        
        // Vérifier les permissions
        if (userRole !== 'admin' && reviewData.client_id !== userId) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        
        // Supprimer l'avis
        await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
        
        res.json({
            success: true,
            message: 'Avis supprimé'
        });
        
    } catch (err) {
        console.error('Erreur suppression avis:', err);
        res.status(500).json({ error: 'Erreur suppression avis' });
    }
});

// Approuver un avis (admin seulement)
router.put('/:id/approve', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès admin seulement' });
        }
        
        const { id } = req.params;
        
        const result = await db.query(
            `UPDATE reviews 
             SET status = 'approved'
             WHERE id = $1 
             RETURNING *`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Avis non trouvé' });
        }
        
        res.json({
            success: true,
            message: 'Avis approuvé avec succès',
            review: result.rows[0]
        });
        
    } catch (err) {
        console.error('Erreur approbation:', err);
        res.status(500).json({ error: 'Erreur approbation' });
    }
});

module.exports = router;