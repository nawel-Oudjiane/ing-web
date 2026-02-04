# Plateforme de réservation de salles

Ce projet consiste à développer une plateforme web permettant
aux propriétaires de proposer des salles à la location et aux
clients de réserver ces salles. Le système gère plusieurs rôles
(utilisateur, propriétaire, administrateur) et repose sur une
architecture client–serveur avec une API REST.

## Technologies utilisées

- Node.js
- Express.js
- PostgreSQL
- JWT (authentification)
- HTML / CSS / JavaScript
- Leaflet (cartographie)

## Architecture du projet
- Frontend : fichiers HTML, CSS et JavaScript dans le dossier /public
- Backend : API REST développée avec Express
- Base de données : PostgreSQL

## Installation

1. Installer Node.js et PostgreSQL
2. Cloner le projet
3. Installer les dépendances :
   npm install
4. Créer la base de données :
   createdb reservation_system
5. Exécuter le script SQL :
   psql -d reservation_system -f docs/schema.sql
6. Créer un fichier .env :
   PORT=3000
   DB_USER=postgres
   DB_PASSWORD=****
   DB_NAME=reservation_system
   JWT_SECRET=secret

## Lancement

npm run dev
ouvrir http://localhost:3000

## Rôles

- Visiteur : consulter les salles
- Client : réserver des salles et laisser des avis
- Propriétaire : gérer ses salles
- Administrateur : gérer les utilisateurs et modérer le contenu

## Fonctionnalités

- Authentification avec JWT
- CRUD des salles
- Réservation de salles
- Gestion des avis
- Cartographie des salles
- Statistiques (admin / owner)
