// controllers/users.controller.js
const db = require('../config/database');

exports.getAll = async (req, res) => {
    try {
        console.log('Tentative de récupération des utilisateurs...');
        
        // ESSAYEZ CETTE REQUÊTE SIMPLE D'ABORD :
        const result = await db.query('SELECT * FROM users ORDER BY id');
        
        console.log(`Nombre d'utilisateurs trouvés: ${result.rows.length}`);
        console.log('Colonnes disponibles:', result.rows[0] ? Object.keys(result.rows[0]) : 'aucun');
        
        res.json(result.rows);
    } catch (err) {
        console.error('ERREUR DÉTAILLÉE getAll:', err);
        res.status(500).json({ error: 'Erreur récupération utilisateurs: ' + err.message });
    }
};

// AJOUTEZ CETTE FONCTION POUR VOIR UN UTILISATEUR
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT id, full_name, email, role, active, created_at FROM users WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur récupération utilisateur' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        
        console.log(`Mise à jour statut utilisateur ${id} -> ${active}`);
        
        // Convertir en boolean si besoin
        const isActive = active === true || active === 'true' || active === 1;
        
        await db.query('UPDATE users SET active=$1 WHERE id=$2', [isActive, id]);
        
        // Récupérer l'utilisateur mis à jour
        const result = await db.query(
            'SELECT id, full_name, email, role, active FROM users WHERE id = $1',
            [id]
        );
        
        res.json({ 
            message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Erreur updateStatus:', err);
        res.status(500).json({ error: 'Erreur mise à jour statut' });
    }
};

// AJOUTEZ CETTE FONCTION POUR SUPPRIMER UN UTILISATEUR
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id; // ID de l'admin qui fait la demande
        
        console.log(`Tentative de suppression utilisateur ID: ${id} par Admin ID: ${adminId}`);
        
        // 1. Vérifier si l'utilisateur existe
        const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            console.log(`Utilisateur ${id} non trouvé`);
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        const user = userCheck.rows[0];
        console.log(`Utilisateur trouvé: ${user.full_name} (${user.email})`);

        // 2. Empêcher l'admin de se supprimer lui-même
        if (parseInt(id) === adminId) {
            console.log(`Admin ${adminId} tente de se supprimer lui-même`);
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        console.log(`Suppression de l'utilisateur ${id}...`);
        
        // 3. Supprimer l'utilisateur
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            console.log(`Échec suppression utilisateur ${id}`);
            return res.status(500).json({ error: 'Échec de la suppression' });
        }
        
        console.log(`Utilisateur ${id} supprimé avec succès`);
        res.json({ 
            message: 'Utilisateur supprimé avec succès',
            deletedUser: result.rows[0]
        });
        
    } catch (err) {
        console.error('ERREUR DÉTAILLÉE suppression utilisateur:', err);
        
        // Vérifier si c'est une erreur de contrainte de clé étrangère
        if (err.code === '23503') { // Code PostgreSQL pour violation de clé étrangère
            return res.status(400).json({ 
                error: 'Impossible de supprimer cet utilisateur car il a des réservations ou des salles actives. Supprimez d\'abord ses données associées.' 
            });
        }
        
        res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'utilisateur' });
    }
};


exports.register = async (req, res) => {
    try {
        const { email, password, full_name, role = 'client' } = req.body;
        
        console.log(' Données reçues:', { email, full_name, role });
        
        // 1. Vérifier les champs obligatoires
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email et mot de passe requis' 
            });
        }
        
        // 2. Vérifier si l'email existe déjà
        // NOTE: Assurez-vous que 'db' est bien défini dans votre controller
        const existing = await db.query(
            'SELECT id FROM users WHERE email = $1', 
            [email]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Email déjà utilisé' 
            });
        }
        
        // 3. Hasher le mot de passe (assurez-vous que bcrypt est installé)
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 4. Insérer dans la base de données
        const result = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, email, full_name, role, created_at`,
            [email, hashedPassword, full_name || null, role]
        );
        
        const newUser = result.rows[0];
    
        console.log(' Utilisateur créé:', newUser.id);
        
        // 5. Répondre avec succès
        res.status(201).json({
            success: true,
            message: 'Utilisateur créé',
            user: newUser
        });
        
    } catch (error) {
        console.error(' Erreur register:', error);
        
        // Message d'erreur plus simple
        res.status(500).json({ 
            error: 'Erreur création utilisateur',
            // Détails en développement seulement
            ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
    }
};