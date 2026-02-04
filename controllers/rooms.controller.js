// controllers/rooms.controller.js 
const db = require('../config/database');

// GET toutes les salles (avec filtre selon rôle)========
exports.getAll = async (req, res) => {
    try {
        let query = '';
        let params = [];
        
        const user = req.user; // L'utilisateur peut être undefined (visiteur)<========
        
        console.log(` Rôle utilisateur: ${user?.role || 'visiteur'}, ID: ${user?.id}`);
        
        // 1. SI PROPRIÉTAIRE : seulement SES salles===
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
        // 3. SI CLIENT ou VISITEUR : seulement les salles disponibles===
        else {
            query = `
                SELECT r.*, u.full_name as owner_name 
                FROM rooms r 
                LEFT JOIN users u ON r.owner_id = u.id
                WHERE r.is_available = true
                ORDER BY r.created_at DESC
            `;
        }
        
        console.log(`Requête: ${query.substring(0, 100)}...`);
        console.log(`Paramètres: ${JSON.stringify(params)}`);
        
        const result = await db.query(query, params);
        
        console.log(` ${result.rows.length} salles trouvées`);
        
        res.json(result.rows);
    } catch (err) {
        console.error(' Erreur getAll:', err);
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
        console.error('Erreur getOne:', err);
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

        console.log(`Création salle par propriétaire ${user.id}:`, { 
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

        console.log(`====>Salle créée ID: ${result.rows[0].id}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('===>Erreur création:', err);
        res.status(500).json({ error: 'Erreur création salle' });
    }
};

// ------UPDATE
// UPDATE pour modifier une salle (avec latitude/longitude)
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

        // DEBUG: Voir ce qui est envoyé
        console.log(` =======> Mise à jour salle ${id} par ${user.role} ${user.id}`);
        console.log(' =======> Données reçues:', req.body);
        console.log('======> Coordonnées:', { latitude, longitude });

        // Construire la requête SQL dynamiquement
        const updates = [];
        const values = [];
        let paramIndex = 1;

        // Ajouter seulement les champs qui sont fournis
        if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }
        
        if (description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            values.push(description);
            paramIndex++;
        }
        
        if (capacity !== undefined) {
            updates.push(`capacity = $${paramIndex}`);
            values.push(parseInt(capacity));
            paramIndex++;
        }
        
        if (price_per_hour !== undefined) {
            updates.push(`price_per_hour = $${paramIndex}`);
            values.push(parseFloat(price_per_hour));
            paramIndex++;
        }
        
        if (city !== undefined) {
            updates.push(`city = $${paramIndex}`);
            values.push(city);
            paramIndex++;
        }
        
        if (address !== undefined) {
            updates.push(`address = $${paramIndex}`);
            values.push(address);
            paramIndex++;
        }
        
        // IMPORTANT: Toujours mettre à jour latitude et longitude ensemble
        if (latitude !== undefined && longitude !== undefined) {
            updates.push(`latitude = $${paramIndex}`);
            values.push(parseFloat(latitude));
            paramIndex++;
            
            updates.push(`longitude = $${paramIndex}`);
            values.push(parseFloat(longitude));
            paramIndex++;
            
            console.log(` Coordonnées mises à jour: ${latitude}, ${longitude}`);
        } else if (latitude !== undefined || longitude !== undefined) {
            // Si un seul des deux est fourni, c'est une erreur
            return res.status(400).json({ 
                error: 'Les deux coordonnées (latitude ET longitude) doivent être fournies ensemble' 
            });
        }

        // Toujours ajouter updated_at
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
        }

        // Ajouter l'ID à la fin
        values.push(id);

        const query = `
            UPDATE rooms
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        console.log(' Requête SQL:', query);
        console.log(' Valeurs:', values);

        const result = await db.query(query, values);

        console.log(` Salle ${id} mise à jour avec succès`);
        
        res.json({
            success: true,
            message: 'Salle mise à jour',
            room: result.rows[0]
        });
    } catch (err) {
        console.error(' Erreur update:', err);
        res.status(500).json({ error: 'Erreur modification salle', details: err.message });
    }
};

// DELETE :supprimer une salle
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
        
        console.log(` Salle ${id} supprimée par ${user.role} ${user.id}`);
        res.json({ message: 'Salle supprimée' });
    } catch (err) {
        console.error(' Erreur delete:', err);
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