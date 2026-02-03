// models/Review.js
const db = require('../config/database');

const Review = {
    // Créer un avis
    create: async (userId, bookingId, rating, comment) => {
        const result = await db.query(
            `INSERT INTO reviews (user_id, booking_id, rating, comment, status) 
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [userId, bookingId, rating, comment]
        );
        return result.rows[0];
    },
    
    // Avis d'une salle
    getByRoom: async (roomId) => {
        const result = await db.query(
            `SELECT r.*, u.full_name as user_name
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             JOIN bookings b ON r.booking_id = b.id
             WHERE b.room_id = $1 AND r.status = 'approved'
             ORDER BY r.created_at DESC`,
            [roomId]
        );
        return result.rows;
    }
};

module.exports = Review;