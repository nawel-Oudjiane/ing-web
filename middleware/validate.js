//ce middleware permet de valider les données envoyées par le client avant de les traiter dans les contrôleurs.
// Il utilise la bibliothèque Joi pour définir des schémas de validation pour différentes entités comme les utilisateurs, les chambres et les réservations.``
//DANS QUEL BUT UTILISER CE MIDDLEWARE?
//L'objectif est de s'assurer que les données reçues respectent les contraintes attendues (types, formats, valeurs autorisées) afin d'éviter les erreurs et les incohérences dans la base de données.

// middleware/validate.js
const { body, validationResult } = require('express-validator');

// Middleware de validation général
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validation pour l'inscription
const validateRegister = [
    body('email')
        .isEmail().withMessage('Email invalide')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('Minimum 6 caractères'),
    body('full_name')
        .notEmpty().withMessage('Nom requis')
        .trim(),
    body('role')
        .isIn(['client', 'owner', 'admin']).withMessage('Rôle invalide'),
    validate
];

// Validation pour la connexion
const validateLogin = [
    body('email')
        .isEmail().withMessage('Email invalide')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Mot de passe requis'),
    validate
];

// Validation pour les réservations (optionnel)
const validateBooking = [
    body('room_id')
        .isInt().withMessage('ID de salle invalide'),
    body('start_time')
        .isISO8601().withMessage('Date de début invalide'),
    body('end_time')
        .isISO8601().withMessage('Date de fin invalide'),
    validate
];

module.exports = {
    validateRegister,
    validateLogin,
    validateBooking,
    validate
};