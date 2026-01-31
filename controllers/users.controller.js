// controllers/users.controller.js
const db = require('../config/database');

exports.getAll = async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role FROM users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur récupération utilisateurs' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        await db.query('UPDATE users SET active=$1 WHERE id=$2', [active, id]);
        res.json({ message: 'Statut utilisateur mis à jour' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur mise à jour statut' });
    }
};
