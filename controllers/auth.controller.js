const User = require('../models/User');
const jwt = require('jsonwebtoken');//bibliothèque pour créer et vérifier les tokens JWT,jwt: JSON Web Token, est un standard ouvert (RFC 7519) qui définit un format compact et autonome pour transmettre des informations de manière sécurisée entre des parties sous forme d'objet JSON.
const bcrypt = require('bcryptjs');//bibliothèque pour le hachage des mots de passe

const authController = {

//fonction pour l'inscription d'un utilisateur (CLIENT OU OWNER)================
  async register(req, res) {
    try {
      const { email, password, full_name = '', role = 'client' } = req.body;

      const user = await User.create(email, password, role, full_name);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, full_name: user.full_name},
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ success: true, user, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // connexion d'un utilisateur =================
async login(req, res) {
  console.log(' Login appelé avec:', req.body?.email);

  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    //  VÉRIFICATION STATUT COMPTE (si désactivé, refuser la connexion)============
    if (user.active === false) {
      return res.status(403).json({
        error: 'Votre compte a été désactivé par un administrateur'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      },
      token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur connexion' });
  }
}


};

module.exports = authController;
// Ce code définit un contrôleur d'authentification pour une application Express.js, avec des méthodes pour l'inscription et la connexion des utilisateurs.
//a quoi servent les controleurs dans une application expressjs?
//Les contrôleurs dans une application Express.js servent à gérer la logique métier associée aux différentes routes de l'application. Ils reçoivent les requêtes HTTP, interagissent avec les modèles pour accéder aux données, et renvoient les réponses appropriées au client.