// models/User.js 
const db = require('../config/database');//import la connexion a la bdd
const bcrypt = require('bcryptjs');//sert a hasher les mdp

class User {
    /**
     * Crée un nouvel utilisateur
     * @param {string} email - Email de l'utilisateur
     * @param {string} password - Mot de passe en clair
     * @param {string} role - Rôle (client, owner, admin)
     * @param {string} full_name - Nom complet
     * @returns {Promise<Object>} Utilisateur créé
     */
    static async create(email, password, role = 'client', full_name = '') {
        try {
            // Hasher le mot de passe
            const password_hash = await bcrypt.hash(password, 10);
            
            // Requête SQL
            const query = `
                INSERT INTO users (email, password_hash, role, full_name) 
                VALUES ($1, $2, $3, $4) 
                RETURNING id, email, role, full_name, created_at
            `;
            
            const values = [email, password_hash, role, full_name];
            const result = await db.query(query, values);
            
            return result.rows[0];
            
        } catch (error) {
            console.error('Erreur dans User.create:', error.message);
            throw error;
        }
    }
    
    /**
     * Trouve un utilisateur par son email
     * @param {string} email - Email à rechercher
     * @returns {Promise<Object|null>} Utilisateur ou null
     */
    static async findByEmail(email) {
        try {
            const query = 'SELECT * FROM users WHERE email = $1';
            const result = await db.query(query, [email]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur dans User.findByEmail:', error);
            throw error;
        }
    }
    
    /**
     * Trouve un utilisateur par son ID
     * @param {number} id - ID de l'utilisateur
     * @returns {Promise<Object|null>} Utilisateur ou null
     */
    static async findById(id) {
        try {
            const query = 'SELECT id, email, role, full_name, created_at FROM users WHERE id = $1';
            const result = await db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur dans User.findById:', error);
            throw error;
        }
    }
    
    /**
     * Récupère tous les utilisateurs (admin seulement)
     * @param {number} limit - Nombre maximum d'utilisateurs
     * @param {number} offset - Décalage pour la pagination
     * @returns {Promise<Array>} Liste des utilisateurs
     */
    static async findAll(limit = 100, offset = 0) {
        try {
            const query = `
                SELECT id, email, role, full_name, created_at 
                FROM users 
                ORDER BY created_at DESC 
                LIMIT $1 OFFSET $2
            `;
            const result = await db.query(query, [limit, offset]);
            return result.rows;
        } catch (error) {
            console.error('Erreur dans User.findAll:', error);
            throw error;
        }
    }
}

module.exports = User;

//les modèles représentent la structure des données et les interactions avec la base de données, tandis que les contrôleurs orchestrent le flux de données entre les modèles et les vues (ou réponses HTTP).
//Dans une application Express.js, les modèles sont responsables de la gestion des données, y compris la définition des schémas, la validation et les opérations CRUD (Create, Read, Update, Delete) sur la base de données. Ils encapsulent la logique liée aux données et fournissent une interface pour interagir avec celles-ci.