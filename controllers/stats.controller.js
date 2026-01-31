
// controllers/stats.controller.js
const db = require('../config/database');

// Route principale qui s'adapte au rôle
exports.getStats = async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Récupérer les stats admin
            const usersCount = await db.query('SELECT COUNT(*) FROM users');
            const roomsCount = await db.query('SELECT COUNT(*) FROM rooms');
            const bookingsCount = await db.query('SELECT COUNT(*) FROM bookings');
            
            res.json({
                users: parseInt(usersCount.rows[0].count),
                rooms: parseInt(roomsCount.rows[0].count),
                bookings: parseInt(bookingsCount.rows[0].count)
            });
        } else if (req.user.role === 'owner') {
            // Récupérer les stats owner
            const ownerId = req.user.id;
            
            const roomsCount = await db.query(
                'SELECT COUNT(*) FROM rooms WHERE owner_id = $1',
                [ownerId]
            );
            
            const bookingsCount = await db.query(
                `SELECT COUNT(*) FROM bookings b
                 JOIN rooms r ON r.id = b.room_id
                 WHERE r.owner_id = $1`,
                [ownerId]
            );
            
            const revenueResult = await db.query(
                `SELECT COALESCE(SUM(b.total_price), 0) as total_revenue
                 FROM bookings b
                 JOIN rooms r ON r.id = b.room_id
                 WHERE r.owner_id = $1 AND b.status = 'confirmed'`,
                [ownerId]
            );
            
            res.json({
                rooms: parseInt(roomsCount.rows[0].count),
                bookings: parseInt(bookingsCount.rows[0].count),
                total_revenue: parseFloat(revenueResult.rows[0].total_revenue) || 0
            });
        } else {
            res.status(403).json({ error: 'Accès non autorisé' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur récupération statistiques' });
    }
};

// Statistiques globales (admin)
exports.getGlobalStats = async (req, res) => {
    try {
        const usersCount = await db.query('SELECT COUNT(*) FROM users');
        const roomsCount = await db.query('SELECT COUNT(*) FROM rooms');
        const bookingsCount = await db.query('SELECT COUNT(*) FROM bookings');
        
        res.json({
            users: parseInt(usersCount.rows[0].count),
            rooms: parseInt(roomsCount.rows[0].count),
            bookings: parseInt(bookingsCount.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur récupération statistiques' });
    }
};

// Statistiques propriétaire
exports.getOwnerStats = async (req, res) => {
    try {
        const ownerId = req.user.id;
        
        // Nombre de salles du propriétaire
        const roomsCount = await db.query(
            'SELECT COUNT(*) FROM rooms WHERE owner_id = $1',
            [ownerId]
        );
        
        // Nombre de réservations pour ses salles
        const bookingsCount = await db.query(
            `SELECT COUNT(*) FROM bookings b
             JOIN rooms r ON r.id = b.room_id
             WHERE r.owner_id = $1`,
            [ownerId]
        );
        
        // Revenus totaux
        const revenueResult = await db.query(
            `SELECT COALESCE(SUM(b.total_price), 0) as total_revenue
             FROM bookings b
             JOIN rooms r ON r.id = b.room_id
             WHERE r.owner_id = $1 AND b.status = 'confirmed'`,
            [ownerId]
        );
        
        // Salles les plus populaires
        const popularRooms = await db.query(
            `SELECT r.name, COUNT(b.id) as bookings_count
             FROM rooms r
             LEFT JOIN bookings b ON r.id = b.room_id
             WHERE r.owner_id = $1
             GROUP BY r.id, r.name
             ORDER BY bookings_count DESC
             LIMIT 5`,
            [ownerId]
        );
        
        res.json({
            rooms: parseInt(roomsCount.rows[0].count),
            bookings: parseInt(bookingsCount.rows[0].count),
            total_revenue: parseFloat(revenueResult.rows[0].total_revenue) || 0,
            popular_rooms: popularRooms.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur récupération statistiques propriétaire' });
    }
};