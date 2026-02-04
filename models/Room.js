// models/Room.js
const db = require('../config/database');

class Room {
    // fonction pour Récupérer toutes les salles
    static async findAll() {
        const result = await db.query('SELECT * FROM rooms ORDER BY created_at DESC');
        return result.rows;
    }
    
    // Créer une salle
    static async create(ownerId, name, description, capacity, price_per_hour, city) {
        const result = await db.query(
            `INSERT INTO rooms (owner_id, name, description, capacity, price_per_hour, city) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, name, description, capacity, price_per_hour, city`,
            [ownerId, name, description, capacity, price_per_hour, city]
        );
        return result.rows[0];
    }
    
    // Récupérer par ID
    static async findById(id) {
        const result = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
        return result.rows[0];
    }
}

module.exports = Room;