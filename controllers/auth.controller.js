const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authController = {

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

  // ✅ ICI login est BIEN dans l'objet
  async login(req, res) {
    console.log(' Login appelé avec:', req.body?.email);

    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
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
