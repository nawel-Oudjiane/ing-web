// public/client-map.js - VERSION CORRIGÉE AVEC GESTION DES MULTIPLES INIT

console.log("🗺️ client-map.js chargé");

let clientMap = null;
let mapInitialized = false;

// Fonction pour détruire proprement une carte existante
function destroyMap() {
    if (clientMap) {
        try {
            clientMap.remove();
            clientMap = null;
            mapInitialized = false;
            console.log("🗑️ Ancienne carte détruite");
        } catch (error) {
            console.warn("⚠️ Erreur lors de la destruction de la carte:", error);
        }
    }
}

// Fonction principale
function initClientMap(rooms = []) {
    console.log("🔄 Initialisation carte pour", rooms.length, "salles");
    
    const mapElement = document.getElementById('client-map');
    if (!mapElement) {
        console.log("ℹ️ Pas de carte sur cette page");
        return;
    }
    
    // Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error("❌ Leaflet non chargé !");
        mapElement.innerHTML = '<div class="map-error"><p>Erreur: Leaflet non chargé</p></div>';
        return;
    }
    
    // Détruire l'ancienne carte si elle existe
    destroyMap();
    
    // Nettoyer l'élément
    mapElement.innerHTML = '';
    
    try {
        console.log("🌍 Création de la carte...");
        
        // Créer la carte
        clientMap = L.map('client-map', {
            preferCanvas: true // Pour de meilleures performances
        }).setView([36.7525, 3.0420], 6);
        
        // Ajouter les tuiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            minZoom: 3
        }).addTo(clientMap);
        
        console.log("✅ Carte créée avec succès");
        
        // Ajouter les marqueurs
        if (rooms && rooms.length > 0) {
            addMarkersToMap(rooms);
        } else {
            // Afficher un message si pas de salles
            L.popup()
                .setLatLng([36.7525, 3.0420])
                .setContent(`
                    <div style="padding: 10px;">
                        <h4 style="margin: 0 0 10px 0;">Aucune salle disponible</h4>
                        <p>Les salles s'afficheront ici lorsqu'elles seront ajoutées.</p>
                    </div>
                `)
                .openOn(clientMap);
        }
        
        mapInitialized = true;
        
    } catch (error) {
        console.error("❌ Erreur création carte:", error);
        
        // Réinitialiser les variables
        clientMap = null;
        mapInitialized = false;
        
        // Afficher un message d'erreur
        mapElement.innerHTML = `
            <div class="map-error" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 2rem;">
                <div>
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #dc3545;"></i>
                    <h3 style="margin: 0 0 10px 0;">Erreur de carte</h3>
                    <p style="margin: 0;">${error.message}</p>
                    <button onclick="forceRecreateMap()" style="margin-top: 15px; padding: 8px 16px; background: #4361ee; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Réessayer
                    </button>
                </div>
            </div>
        `;
    }
}

function addMarkersToMap(rooms) {

    
    if (!clientMap) return;
    
    // Filtrer les salles avec coordonnées
    const roomsWithCoords = rooms.filter(r => r.latitude && r.longitude);
    console.log(`📍 ${roomsWithCoords.length} salles avec coordonnées`);
    
    if (roomsWithCoords.length === 0) {
        console.log("ℹ️ Aucune salle avec coordonnées GPS");
        return;
    }
    
    // Ajouter chaque salle comme marqueur
    const markers = [];
    
    roomsWithCoords.forEach(room => {
        try {
            const marker = L.marker([room.latitude, room.longitude])
                .addTo(clientMap)
                .bindPopup(`
                    <div style="min-width: 200px;">
                        <h4 style="margin: 0 0 10px 0; color: #4361ee;">${room.name}</h4>
                        <p style="margin: 5px 0;"><i class="fas fa-users"></i> ${room.capacity} personnes</p>
                        <p style="margin: 5px 0;"><i class="fas fa-money-bill-wave"></i> ${room.price_per_hour} Da/h</p>
                        ${room.city ? `<p style="margin: 5px 0;"><i class="fas fa-map-marker-alt"></i> ${room.city}</p>` : ''}
                        <button onclick="viewRoomDetails(${room.id})" 
                                style="margin-top: 10px; padding: 8px 16px; background: #4361ee; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">
                            <i class="fas fa-eye"></i> Voir détails
                        </button>
                    </div>
                `);
            
            markers.push(marker);
            
        } catch (err) {
            console.error(`❌ Erreur création marqueur salle ${room.id}:`, err);
        }
    });
    
    // Ajuster la vue pour voir tous les marqueurs
    if (markers.length > 0) {
        if (markers.length === 1) {
            // Si une seule salle, zoomer dessus
            clientMap.setView([roomsWithCoords[0].latitude, roomsWithCoords[0].longitude], 12);
        } else {
            // Si plusieurs salles, ajuster la vue
            const group = new L.featureGroup(markers);
            clientMap.fitBounds(group.getBounds().pad(0.1));
        }
    }
}

// Fonction pour forcer la recréation
function forceRecreateMap() {
    console.log("🔄 Forcer la recréation de la carte...");
    const mapElement = document.getElementById('client-map');
    if (mapElement) {
        mapElement.innerHTML = '';
        // Recharger les salles
        if (typeof loadRooms === 'function') {
            loadRooms('rooms-list');
        }
    }
}

// Initialisation automatique
function autoInitMap() {
    if (mapInitialized) {
        console.log("ℹ️ Carte déjà initialisée");
        return;
    }
    
    const mapElement = document.getElementById('client-map');
    if (mapElement && !mapInitialized) {
        console.log("🔍 Initialisation automatique de la carte...");
        
        // Charger les salles d'abord
        fetch('/api/rooms')
            .then(response => {
                if (!response.ok) throw new Error('Erreur API');
                return response.json();
            })
            .then(rooms => {
                console.log(`✅ ${rooms.length} salles chargées pour la carte`);
                initClientMap(rooms);
            })
            .catch(error => {
                console.error("❌ Erreur chargement salles:", error);
                initClientMap([]);
            });
    }
}

// Exposer les fonctions globalement
window.initClientMap = initClientMap;
window.forceRecreateMap = forceRecreateMap;
window.destroyMap = destroyMap;

// Initialiser quand la page est prête
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM chargé - préparation carte...");
    
    // Attendre que tout soit chargé
    setTimeout(() => {
        if (document.getElementById('client-map')) {
            autoInitMap();
        }
    }, 500);
});

// Cleanup quand on quitte la page
window.addEventListener('beforeunload', function() {
    destroyMap();
});