// controllers/bookings.controller.js

const db = require('../config/database');

exports.create = async (req, res) => {
    try {
        const clientId = req.user.id;
        const { room_id, start_time, end_time, special_requests } = req.body;

        if (!room_id || !start_time || !end_time) {
            return res.status(400).json({ error: 'Champs manquants' });
        }

        // Récupérer le prix de la salle
        const roomRes = await db.query(
            'SELECT price_per_hour FROM rooms WHERE id = $1',
            [room_id]
        );

        if (roomRes.rows.length === 0) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }

        const pricePerHour = roomRes.rows[0].price_per_hour;

        const start = new Date(start_time);
        const end = new Date(end_time);

        if (end <= start) {
            return res.status(400).json({ error: 'Heure fin invalide' });
        }

        const hours = (end - start) / (1000 * 60 * 60);
        const total_price = hours * pricePerHour;

        const result = await db.query(
            `INSERT INTO bookings
             (room_id, client_id, start_time, end_time, total_price, status, special_requests)
             VALUES ($1,$2,$3,$4,$5,'confirmed',$6)
             RETURNING *`,
            [room_id, clientId, start, end, total_price, special_requests || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur réservation' });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const clientId = req.user.id;

        const result = await db.query(
            `SELECT b.*, r.name AS room_name
             FROM bookings b
             JOIN rooms r ON r.id = b.room_id
             WHERE b.client_id = $1
             ORDER BY b.start_time DESC`,
            [clientId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur chargement réservations' });
    }
};


exports.cancel = async (req, res) => {
    try {
        const { id } = req.params;
        const clientId = req.user.id;

        // Vérifier que la réservation appartient au client
        const bookingRes = await db.query(
            'SELECT * FROM bookings WHERE id = $1 AND client_id = $2',
            [id, clientId]
        );

        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Réservation introuvable' });
        }

        const booking = bookingRes.rows[0];

        const now = new Date();
        const startTime = new Date(booking.start_time);

        // Interdire l'annulation si la réservation a déjà commencé
        if (now >= startTime) {
            return res.status(400).json({
                error: 'Impossible d’annuler : la réservation a déjà commencé'
            });
        }

        // Annulation autorisée
        await db.query(
            'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
            ['cancelled', id]
        );

        res.json({ message: 'Réservation annulée avec succès' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur annulation réservation' });
    }
};
