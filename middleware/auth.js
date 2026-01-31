// middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware général : vérifie que le token est présent et valide
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Stocke l'utilisateur dans la requête
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token invalide' });
    }
};

// Middleware spécifique : vérifie que c'est un admin
const verifyTokenAdmin = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé, admin seulement' });
        }
        next();
    });
};

// Middleware spécifique : vérifie que c'est un owner
const verifyTokenOwner = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: 'Accès refusé, propriétaire seulement' });
        }
        next();
    });
};

// Middleware spécifique : vérifie que c'est un client
const verifyTokenClient = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'client') {
            return res.status(403).json({ error: 'Accès refusé, client seulement' });
        }
        next();
    });
};

module.exports = {
    authMiddleware,
    verifyTokenAdmin,
    verifyTokenOwner,
    verifyTokenClient
};
