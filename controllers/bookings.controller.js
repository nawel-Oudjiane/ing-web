// controllers/bookings.controller.js
// ce controlleur fonctionne avec db.query pour interagir avec la base de données PostgreSQL sans cree de modeol pour la reservation.

const db = require('../config/database');

//exports pour créer une réservation (CLIENT)============

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
//fonction pour voir les réservation du (CLIENT) /  .getMybookings: sélectionne toutes les réservations associées à l'ID du client connecté
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

//fonction pour annuler une réservation (CLIENT)===============
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

//fonction pour que l'admin puisse voir toutes les réservations
// Pour le propriétaire : voir TOUTES les réservations de ses salles
exports.getAllBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = '';
        let params = [];

        if (userRole === 'admin') {
            // Admin voit TOUTES les réservations
            query = `
                SELECT b.*, 
                       r.name AS room_name,
                       r.owner_id,
                       r.price_per_hour,
                       u.full_name AS client_name,
                       u.email AS client_email
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                JOIN users u ON u.id = b.client_id
                ORDER BY b.start_time DESC
            `;
        } else if (userRole === 'owner') {
            // Propriétaire voit seulement les réservations de SES salles
            query = `
                SELECT b.*, 
                       r.name AS room_name,
                       r.owner_id,
                       r.price_per_hour,
                       u.full_name AS client_name,
                       u.email AS client_email
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                JOIN users u ON u.id = b.client_id
                WHERE r.owner_id = $1
                ORDER BY b.start_time DESC
            `;
            params = [userId];
        } else {
            // Client ne devrait pas accéder à cette route
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const result = await db.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur chargement des réservations' });
    }
};

// Pour le propriétaire : changer le statut d'une réservation
exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Vérifier que l'utilisateur est admin ou propriétaire de la salle
        let query = '';
        let params = [];

        if (userRole === 'admin') {
            query = 'SELECT * FROM bookings WHERE id = $1';
            params = [id];
        } else if (userRole === 'owner') {
            query = `
                SELECT b.* 
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                WHERE b.id = $1 AND r.owner_id = $2
            `;
            params = [id, userId];
        } else {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const bookingRes = await db.query(query, params);

        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Réservation introuvable ou non autorisée' });
        }

        const booking = bookingRes.rows[0];
        const now = new Date();
        const startTime = new Date(booking.start_time);

        // Validation supplémentaire si besoin
        if (status === 'confirmed' && now >= startTime) {
            return res.status(400).json({ 
                error: 'Impossible de confirmer : la réservation a déjà commencé' 
            });
        }

        // Mettre à jour le statut
        await db.query(
            'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, id]
        );

        res.json({ 
            message: `Statut mis à jour : ${status}`,
            booking_id: id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur mise à jour statut' });
    }
};
