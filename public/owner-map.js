// public/owner-map.js - VERSION CORRIGÉE ET COMPLÈTE
console.log("🗺️ Chargement de owner-map.js");

// Variables globales accessibles partout
window.ownerMap = null;
window.locationMarker = null;

function initOwnerMap() {
    console.log("🔄 Initialisation carte propriétaire...");
    
    // 1. Vérifier si l'élément existe
    const mapElement = document.getElementById('owner-map');
    if (!mapElement) {
        console.warn("⚠️ #owner-map non trouvé (peut être normal si pas sur page propriétaire)");
        return false;
    }
    
    // 2. Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error("❌ ERREUR: Leaflet n'est pas chargé !");
        showMapError("Bibliothèque de carte non chargée. Rechargez la page.");
        return false;
    }
    
    // 3. Vérifier si MapUtils existe
    if (typeof MapUtils === 'undefined' || typeof MapUtils.initMap !== 'function') {
        console.error("❌ ERREUR: MapUtils non chargé !");
        showMapError("Utilitaires carte non chargés. Vérifiez map-utils.js");
        return false;
    }
    
    try {
        // 4. Créer la carte
        window.ownerMap = MapUtils.initMap('owner-map', [28.0339, 1.6596], 5);
        
        if (!window.ownerMap) {
            console.error("❌ Échec création carte");
            return false;
        }
        
        // 5. Ajouter l'événement click
        window.ownerMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            console.log(`📍 Position sélectionnée: ${lat}, ${lng}`);
            
            // Mettre à jour les champs HTML
            updateCoordinateFields(lat, lng);
            
            // Mettre à jour le marqueur
            updateLocationMarker(lat, lng);
            
            // Optionnel: Récupérer l'adresse
            // getAddressFromCoords(lat, lng);
        });
        
        console.log("✅ Carte propriétaire prête !");
        return true;
        
    } catch (error) {
        console.error("❌ Erreur initialisation carte:", error);
        showMapError(`Erreur: ${error.message}`);
        return false;
    }
}

// Mettre à jour les champs de coordonnées
function updateCoordinateFields(lat, lng) {
    const latField = document.getElementById('room-latitude');
    const lngField = document.getElementById('room-longitude');
    
    if (latField) latField.value = lat;
    if (lngField) lngField.value = lng;
    
    // Afficher un feedback visuel
    showCoordinateFeedback(lat, lng);
}

// Mettre à jour ou créer le marqueur
function updateLocationMarker(lat, lng) {
    if (!window.ownerMap) return;
    
    if (window.locationMarker) {
        window.locationMarker.setLatLng([lat, lng]);
        window.locationMarker.bindPopup(`Position mise à jour<br>${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
    } else {
        window.locationMarker = L.marker([lat, lng])
            .addTo(window.ownerMap)
            .bindPopup(`Emplacement sélectionné<br>${lat.toFixed(6)}, ${lng.toFixed(6)}`)
            .openPopup();
    }
}

// Recherche d'adresse
function searchAddress() {
    const searchInput = document.getElementById('address-search');
    if (!searchInput) {
        console.error("❌ Champ #address-search non trouvé");
        return;
    }
    
    const query = searchInput.value.trim();
    
    if (!query || query.length < 3) {
        alert('Veuillez entrer au moins 3 caractères pour la recherche');
        return;
    }
    
    console.log(`🔍 Recherche d'adresse: "${query}"`);
    
    // Afficher un indicateur de chargement
    const searchBtn = document.querySelector('[onclick="searchAddress()"]');
    const originalHtml = searchBtn?.innerHTML;
    if (searchBtn) {
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        searchBtn.disabled = true;
    }
    
    // Utiliser MapUtils si disponible, sinon requête directe
    if (typeof MapUtils !== 'undefined' && typeof MapUtils.searchAddress === 'function') {
        MapUtils.searchAddress(query, handleAddressSearchResult);
    } else {
        // Fallback: requête directe
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=dz`)
            .then(res => res.json())
            .then(handleAddressSearchResult)
            .catch(error => {
                console.error("❌ Erreur recherche:", error);
                alert('Erreur lors de la recherche d\'adresse');
            })
            .finally(() => {
                if (searchBtn) {
                    searchBtn.innerHTML = originalHtml || '<i class="fas fa-search"></i>';
                    searchBtn.disabled = false;
                }
            });
    }
}

// Traiter le résultat de recherche d'adresse
function handleAddressSearchResult(data) {
    if (!data || !data.length) {
        alert('Adresse non trouvée. Essayez une autre recherche.');
        return;
    }
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    console.log(`✅ Adresse trouvée: ${result.display_name}`);
    
    // Centrer la carte
    if (window.ownerMap) {
        window.ownerMap.setView([lat, lng], 14);
    }
    
    // Mettre à jour les champs
    updateCoordinateFields(lat, lng);
    
    const addressField = document.getElementById('room-address');
    if (addressField) {
        addressField.value = result.display_name;
    }
    
    // Mettre à jour le marqueur
    updateLocationMarker(lat, lng);
    
    // Remplir automatiquement la ville si vide
    autoFillCity(result);
}

// Remplir automatiquement la ville
function autoFillCity(geocodeResult) {
    const cityField = document.getElementById('room-city');
    if (!cityField || cityField.value.trim()) return;
    
    const address = geocodeResult.address;
    if (address) {
        const city = address.city || address.town || address.village || address.municipality || '';
        if (city) {
            cityField.value = city;
            console.log(`🏙️ Ville auto-remplie: ${city}`);
        }
    }
}

// Afficher un feedback pour les coordonnées
function showCoordinateFeedback(lat, lng) {
    // Vous pouvez ajouter un petit message temporaire
    const mapContainer = document.getElementById('owner-map');
    if (!mapContainer) return;
    
    const feedback = document.createElement('div');
    feedback.className = 'coord-feedback';
    feedback.innerHTML = `
        <div style="position: absolute; top: 10px; right: 10px; background: var(--success); color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 1000; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            <i class="fas fa-check-circle"></i> Position enregistrée
        </div>
    `;
    
    // Supprimer l'ancien feedback
    const oldFeedback = mapContainer.querySelector('.coord-feedback');
    if (oldFeedback) oldFeedback.remove();
    
    mapContainer.appendChild(feedback);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, 3000);
}

// Afficher une erreur sur la carte
function showMapError(message) {
    const mapElement = document.getElementById('owner-map');
    if (!mapElement) return;
    
    mapElement.innerHTML = `
        <div class="map-error-state">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e74c3c; margin-bottom: 1rem;"></i>
            <h4 style="color: #e74c3c; margin: 0 0 0.5rem 0;">Erreur de carte</h4>
            <p style="color: #666; margin: 0 0 1rem 0;">${message}</p>
            <button onclick="initOwnerMap()" 
                    style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-redo"></i> Réessayer
            </button>
        </div>
    `;
}

// Récupérer l'adresse depuis les coordonnées (optionnel)
function getAddressFromCoords(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data.display_name) {
                const addressField = document.getElementById('room-address');
                if (addressField && !addressField.value.trim()) {
                    addressField.value = data.display_name;
                }
            }
        })
        .catch(err => console.warn(" Géocodage inverse échoué:", err));
}

// Exposer les fonctions globalement
window.initOwnerMap = initOwnerMap;
window.searchAddress = searchAddress;
window.updateCoordinateFields = updateCoordinateFields;