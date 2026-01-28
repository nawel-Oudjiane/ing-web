const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// Route de test API
app.get('/api', (req, res) => {
  res.json({
    message: '🎉 API Réservation de Salles fonctionne!',
    version: '1.0.0',
    status: 'OK',
    endpoints: [
      'GET /api - Cette page',
      'GET /api/health - Vérifie le statut',
      'POST /api/auth/register - Inscription (à implémenter)',
      'POST /api/auth/login - Connexion (à implémenter)',
      'GET /api/rooms - Liste des salles (à implémenter)'
    ]
  });
});

// Route santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Reservation API'
  });
});

// ⭐⭐ routes TEST pour la DB ⭐⭐
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as time, version() as version');
    res.json({ 
      status: 'success', 
      database: 'connected',
      time: result.rows[0].time,
      version: result.rows[0].version.split(',')[0]
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      message: err.message 
    });
  }
});
// ⭐⭐ FIN  ⭐⭐

// Route racine (redirige vers l'interface)
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Gestion 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}/api`);
  console.log(`🏠 Interface: http://localhost:${PORT}/`);
});