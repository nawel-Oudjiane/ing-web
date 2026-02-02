// public/client-map.js
console.log("🗺️ Chargement de client-map.js");

let clientMap = null;

function initClientMap(rooms) {
    console.log("🔄 Initialisation carte client...");
    
    // 1. Vérifier si l'élément existe
    const mapElement = document.getElementById('client-map');
    if (!mapElement) {
        console.warn("⚠️ #client-map non trouvé, carte non nécessaire");
        return;
    }
    
    // 2. Créer la carte
    clientMap = MapUtils.initMap('client-map');
    if (!clientMap) return;
    
    // 3. Filtrer les salles avec coordonnées
    const roomsWithCoords = (rooms || []).filter(r => r.latitude && r.longitude);
    console.log(`📍 ${roomsWithCoords.length} salles avec coordonnées`);
    
    if (roomsWithCoords.length === 0) {
        mapElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; border-radius: 8px; color: #666;">
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Aucune salle avec localisation</h3>
                    <p>Les salles n'ont pas encore de coordonnées GPS</p>
                </div>
            </div>
        `;
        return;
    }
    
    // 4. Ajouter les marqueurs
    roomsWithCoords.forEach(room => {
        const marker = L.marker([room.latitude, room.longitude], {
            icon: MapUtils.createRoomIcon()
        })
        .addTo(clientMap)
        .bindPopup(`
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #4361ee;">${room.name}</h4>
                <p style="margin: 4px 0;"><i class="fas fa-users"></i> ${room.capacity} personnes</p>
                <p style="margin: 4px 0;"><i class="fas fa-money-bill-wave"></i> ${room.price_per_hour} Da/h</p>
                ${room.city ? `<p style="margin: 4px 0;"><i class="fas fa-map-marker-alt"></i> ${room.city}</p>` : ''}
                <button onclick="viewRoomDetails(${room.id})" 
                        style="margin-top: 10px; padding: 6px 12px; background: #4361ee; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Voir détails
                </button>
            </div>
        `);
    });
    
    // 5. Ajuster la vue
    if (roomsWithCoords.length > 1) {
        const bounds = L.latLngBounds(roomsWithCoords.map(r => [r.latitude, r.longitude]));
        clientMap.fitBounds(bounds, { padding: [30, 30] });
    } else if (roomsWithCoords.length === 1) {
        clientMap.setView([roomsWithCoords[0].latitude, roomsWithCoords[0].longitude], 12);
    }
    
    console.log(" Carte client prête !");
}

// Exposer
window.initClientMap = initClientMap;