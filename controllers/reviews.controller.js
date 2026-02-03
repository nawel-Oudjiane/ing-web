// controllers/reviews.controller.js
const db = require('../config/database');

exports.create = async (req, res) => {
    try {
        const userId = req.user.id;
        const { booking_id, rating, comment } = req.body;
        
        // Vérification simple
        if (!booking_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Données invalides' });
        }
        
        // Vérifier que la réservation appartient à l'utilisateur
        const booking = await db.query(
            'SELECT * FROM bookings WHERE id = $1 AND client_id = $2',
            [booking_id, userId]
        );
        
        if (booking.rows.length === 0) {
            return res.status(403).json({ error: 'Réservation non trouvée' });
        }
        
        // Créer l'avis
        const result = await db.query(
            `INSERT INTO reviews (user_id, booking_id, rating, comment, status) 
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [userId, booking_id, rating, comment]
        );
        
        res.json({
            success: true,
            message: 'Avis soumis',
            review: result.rows[0]
        });
        
    } catch (err) {
        console.error('Erreur création avis:', err);
        res.status(500).json({ error: 'Erreur création avis' });
    }
};

// Pour l'admin seulement
exports.getAll = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        
        const result = await db.query(
            `SELECT r.*, u.full_name, u.email, b.id as booking_id
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             JOIN bookings b ON r.booking_id = b.id
             ORDER BY r.created_at DESC`
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Erreur récupération avis:', err);
        res.status(500).json({ error: 'Erreur récupération avis' });
    }
};