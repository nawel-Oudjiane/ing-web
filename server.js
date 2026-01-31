const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Debug log
app.use((req, res, next) => {
  console.log(` ${req.method} ${req.url}`, req.body);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/rooms', require('./routes/rooms.routes'));// pour importer les routes rooms
app.use('/api/users', require('./routes/users.routes')); //pour importer les routes users
app.use('/api/bookings', require('./routes/bookings.routes')); // pour importer les routes bookings
app.use('/api/stats', require('./routes/stats.routes'));

// Routes test
app.get('/api', (req, res) => res.json({ message: 'API OK' }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date() }));

// Erreurs 404
app.use((req, res) => res.status(404).json({ error: 'Route non trouvée' }));

// Middleware d'erreur global
app.use((err, req, res, next) => {
  console.error('ERREUR SERVEUR:', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));

