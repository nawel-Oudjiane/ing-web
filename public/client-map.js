// public/client-map.js

console.log('🗺️ client-map.js chargé');

let clientMap = null;
let roomMarkers = [];

/**
 * Initialise ou met à jour la carte client
 * @param {Array} rooms
 */
function initClientMap(rooms = []) {
    const mapContainer = document.getElementById('client-map');

    if (!mapContainer) {
        console.warn('❌ #client-map introuvable');
        return;
    }

    if (typeof L === 'undefined') {
        console.error('❌ Leaflet non chargé');
        return;
    }

    // 1️⃣ Initialisation UNE SEULE FOIS
    if (!clientMap) {
        console.log('🆕 Création de la carte client');

        clientMap = L.map('client-map').setView([36.7525, 3.0420], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(clientMap);
    }

    // 2️⃣ Nettoyer les anciens marqueurs
    roomMarkers.forEach(marker => {
        clientMap.removeLayer(marker);
    });
    roomMarkers = [];

    // 3️⃣ Ajouter les nouveaux marqueurs
    rooms.forEach(room => {
        if (!room.latitude || !room.longitude) return;

        const marker = L.marker([room.latitude, room.longitude])
            .addTo(clientMap)
            .bindPopup(`
                <strong>${room.name}</strong><br>
                ${room.city || ''}<br>
                ${room.price_per_hour} Da / h
            `);

        roomMarkers.push(marker);
    });

    console.log(`✅ Carte mise à jour : ${roomMarkers.length} marqueurs`);
}

// rendre globale
window.initClientMap = initClientMap;
