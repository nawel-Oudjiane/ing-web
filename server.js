const express = require('express');
const morgan = require('morgan');
const cors = require('cors');//package pour gérer les erreurs de CORS,cors c'est un package qui permet d'autoriser les requêtes entre différentes origines
require('dotenv').config();//dotenv c'est un package qui permet de gérer les variables d'environnement

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(morgan('dev'));//morgan c'est un package qui permet de logger les requêtes HTTP dans la console
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));



// Debug log
app.use((req, res, next) => {
  console.log(` ${req.method} ${req.url}`, req.body);
  next();
});

// Dans server.js, avant les autres routes
app.get('/api/test/setup', async (req, res) => {
    try {
        const db = require('./config/database');
        
        // Ajouter un avis de test si nécessaire
        const testReview = await db.query(
            `INSERT INTO reviews (booking_id, client_id, room_id, rating, comment) 
             SELECT b.id, b.client_id, b.room_id, 5, 'Test review'
             FROM bookings b 
             WHERE b.client_id = (SELECT id FROM users WHERE role = 'client' LIMIT 1)
             LIMIT 1
             ON CONFLICT (booking_id, client_id) DO NOTHING
             RETURNING *`
        );
        
        res.json({
            success: true,
            message: 'Test setup completed',
            review: testReview.rows[0] || 'Already exists'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/rooms', require('./routes/rooms.routes'));// pour importer les routes rooms
app.use('/api/users', require('./routes/users.routes')); //pour importer les routes users
app.use('/api/bookings', require('./routes/bookings.routes')); // pour importer les routes bookings
app.use('/api/stats', require('./routes/stats.routes'));

const reviewsRoutes = require('./routes/reviews.routes');
app.use('/api/reviews', reviewsRoutes);

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

