
const db = require('../config/database');

// GET toutes les salles
exports.getAll = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM rooms ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur chargement salles' });
    }
};

// GET une salle
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur récupération salle' });
    }
};

// CREATE
exports.create = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'owner') {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const { name, description, capacity, price_per_hour, city } = req.body;

        const result = await db.query(
            `INSERT INTO rooms (name, description, capacity, price_per_hour, city, owner_id)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [name, description, capacity, price_per_hour, city, user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur création salle' });
    }
};

// UPDATE
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { name, description, capacity, price_per_hour, city } = req.body;

        const room = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
        if (room.rows.length === 0) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }

        if (user.role !== 'admin' && room.rows[0].owner_id !== user.id) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        const result = await db.query(
            `UPDATE rooms
             SET name=$1, description=$2, capacity=$3, price_per_hour=$4, city=$5
             WHERE id=$6 RETURNING *`,
            [name, description, capacity, price_per_hour, city, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur modification salle' });
    }
};

// DELETE
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const room = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
        if (room.rows.length === 0) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }

        if (user.role !== 'admin' && room.rows[0].owner_id !== user.id) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        await db.query('DELETE FROM rooms WHERE id = $1', [id]);
        res.json({ message: 'Salle supprimée' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur suppression salle' });
    }
};
