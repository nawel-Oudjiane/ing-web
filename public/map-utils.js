// public/map-utils.js
console.log("🗺️ Chargement de map-utils.js");

const MapUtils = {
    // Vérifier si Leaflet est chargé
    isLeafletLoaded: function() {
        return typeof L !== 'undefined';
    },
    
    // Initialiser une carte basique
   initMap: function(elementId, center = [36.7525, 3.0420], zoom = 6) {
    if (!this.isLeafletLoaded()) {
        console.error("❌ Leaflet non chargé !");
        return null;
    }
    
    const mapElement = document.getElementById(elementId);
    if (!mapElement) {
        console.error(`❌ Élément #${elementId} non trouvé`);
        return null;
    }
    
    try {
        const map = L.map(elementId).setView(center, zoom);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(map);
        
        console.log(`✅ Carte #${elementId} initialisée`);
        return map;
    } catch (error) {
        console.error(`❌ Erreur création carte:`, error);
        return null;
    }
},

    
    // Marqueur personnalisé pour salle
    createRoomIcon: function() {
        return L.divIcon({
            className: 'custom-room-marker',
            html: '<div class="marker-icon"><i class="fas fa-building"></i></div>',
            iconSize: [35, 35],
            iconAnchor: [17, 35]
        });
    },
    
    // Recherche d'adresse
    searchAddress: function(query, callback) {
        if (!query || query.length < 3) return;
        
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=dz`)
            .then(res => res.json())
            .then(callback)
            .catch(err => console.error("Erreur recherche:", err));
    }
};

// Exposer globalement
window.MapUtils = MapUtils;