// controllers/rooms.controller.js - VERSION CORRIGÉE
const db = require('../config/database');

// GET toutes les salles (avec filtre selon rôle)
exports.getAll = async (req, res) => {
    try {
        let query = '';
        let params = [];
        
        const user = req.user; // L'utilisateur peut être undefined (visiteur)
        
        console.log(`🔍 Rôle utilisateur: ${user?.role || 'visiteur'}, ID: ${user?.id}`);
        
        // 1. SI PROPRIÉTAIRE : seulement SES salles
        if (user && user.role === 'owner') {
            query = `
                SELECT r.*, u.full_name as owner_name 
                FROM rooms r 
                LEFT JOIN users u ON r.owner_id = u.id
                WHERE r.owner_id = $1
                ORDER BY r.created_at DESC
            `;
            params = [user.id];
        }
        // 2. SI ADMIN : toutes les salles
        else if (user && user.role === 'admin') {
            query = `
                SELECT r.*, u.full_name as owner_name 
                FROM rooms r 
                LEFT JOIN users u ON r.owner_id = u.id
                ORDER BY r.created_at DESC
            `;
        }
        // 3. SI CLIENT ou VISITEUR : seulement les salles disponibles
        else {
            query = `
                SELECT r.*, u.full_name as owner_name 
                FROM rooms r 
                LEFT JOIN users u ON r.owner_id = u.id
                WHERE r.is_available = true
                ORDER BY r.created_at DESC
            `;
        }
        
        console.log(`📝 Requête: ${query.substring(0, 100)}...`);
        console.log(`📝 Paramètres: ${JSON.stringify(params)}`);
        
        const result = await db.query(query, params);
        
        console.log(`✅ ${result.rows.length} salles trouvées`);
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur getAll:', err);
        res.status(500).json({ error: 'Erreur chargement salles' });
    }
};

// GET une salle spécifique
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        const result = await db.query(
            `SELECT r.*, u.full_name as owner_name 
             FROM rooms r 
             LEFT JOIN users u ON r.owner_id = u.id
             WHERE r.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }

        const room = result.rows[0];
        
        // Vérifier les permissions
        if (user && user.role === 'owner' && room.owner_id !== user.id) {
            return res.status(403).json({ error: 'Accès non autorisé à cette salle' });
        }

        res.json(room);
    } catch (err) {
        console.error('❌ Erreur getOne:', err);
        res.status(500).json({ error: 'Erreur récupération salle' });
    }
};

// CREATE - Ajouter une salle (avec latitude/longitude)
exports.create = async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'owner') {
            return res.status(403).json({ error: 'Accès refusé - Propriétaire seulement' });
        }

        const { 
            name, 
            description, 
            capacity, 
            price_per_hour, 
            city,
            address,
            latitude,
            longitude,
            equipment
        } = req.body;

        // Validation
        if (!name || !description || !capacity || !price_per_hour || !city) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }

        console.log(`➕ Création salle par propriétaire ${user.id}:`, { 
            name, city, latitude, longitude 
        });

        const result = await db.query(
            `INSERT INTO rooms (
                name, description, capacity, price_per_hour, 
                city, address, latitude, longitude,
                amenities, owner_id, is_available
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) 
             RETURNING *`,
            [
                name, 
                description, 
                parseInt(capacity), 
                parseFloat(price_per_hour),
                city,
                address || null,
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null,
                equipment ? [equipment] : [],
                user.id
            ]
        );

        console.log(`✅ Salle créée ID: ${result.rows[0].id}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erreur création:', err);
        res.status(500).json({ error: 'Erreur création salle' });
    }
};

// UPDATE
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        // Récupérer la salle d'abord
        const roomResult = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
        if (roomResult.rows.length === 0) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }

        const room = roomResult.rows[0];
        
        // Vérifier les permissions
        if (user.role !== 'admin' && room.owner_id !== user.id) {
            return res.status(403).json({ error: 'Accès interdit - Cette salle ne vous appartient pas' });
        }

        const { name, description, capacity, price_per_hour, city, address, latitude, longitude } = req.body;

        const result = await db.query(
            `UPDATE rooms
             SET name=$1, description=$2, capacity=$3, 
                 price_per_hour=$4, city=$5, address=$6,
                 latitude=$7, longitude=$8,
                 updated_at=CURRENT_TIMESTAMP
             WHERE id=$9 RETURNING *`,
            [
                name, 
                description, 
                parseInt(capacity), 
                parseFloat(price_per_hour), 
                city,
                address || null,
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null,
                id
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erreur update:', err);
        res.status(500).json({ error: 'Erreur modification salle' });
    }
};

// DELETE
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const roomResult = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
        if (roomResult.rows.length === 0) {
            return res.status(404).json({ error: 'Salle introuvable' });
        }

        const room = roomResult.rows[0];
        
        // Vérifier les permissions
        if (user.role !== 'admin' && room.owner_id !== user.id) {
            return res.status(403).json({ error: 'Accès interdit - Cette salle ne vous appartient pas' });
        }

        await db.query('DELETE FROM rooms WHERE id = $1', [id]);
        
        console.log(`🗑️ Salle ${id} supprimée par ${user.role} ${user.id}`);
        res.json({ message: 'Salle supprimée' });
    } catch (err) {
        console.error('❌ Erreur delete:', err);
        res.status(500).json({ error: 'Erreur suppression salle' });
    }
};

// AJOUTEZ CETTE FONCTION : Salles du propriétaire
exports.getOwnerRooms = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== 'owner') {
            return res.status(403).json({ error: 'Accès réservé aux propriétaires' });
        }

        console.log(` Chargement salles propriétaire ID: ${user.id}`);
        
        const result = await db.query(
            `SELECT r.*, 
                    (SELECT COUNT(*) FROM bookings WHERE room_id = r.id) as bookings_count,
                    (SELECT COALESCE(SUM(total_price), 0) FROM bookings 
                     WHERE room_id = r.id AND status = 'confirmed') as total_revenue
             FROM rooms r 
             WHERE r.owner_id = $1
             ORDER BY r.created_at DESC`,
            [user.id]
        );
        
        console.log(` ${result.rows.length} salles trouvées pour propriétaire ${user.id}`);
        
        res.json(result.rows);
    } catch (err) {
        console.error(' Erreur getOwnerRooms:', err);
        res.status(500).json({ error: 'Erreur récupération salles propriétaire' });
    }
};