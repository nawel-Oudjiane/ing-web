//routes/auth.routes.js :sert à définir les routes d'authentification et à les lier aux contrôleurs appropriés.

const express = require('express');
const AuthController = require('../controllers/auth.controller');
const router = express.Router();
const { validateRegister, validateLogin } = require('../middleware/validate');

router.post('/register', validateRegister, AuthController.register); //route pour l'inscription liée à la méthode register du contrôleur AuthController
router.post('/login', validateLogin, AuthController.login);//route pour la connexion liée à la méthode login du contrôleur AuthController

module.exports = router; //serve à exporter le routeur afin qu'il puisse être utilisé dans d'autres parties de l'application

