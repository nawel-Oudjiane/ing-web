// ================================
// VARIABLES GLOBALES
// ================================
let currentUser = null;
let currentToken = null;
let currentEditRoomId = null;
let currentBookingRoomId = null;


// ================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus(); // Vérifie si l'utilisateur est connecté et récupère son token
    setupDashboard();  // Configure l'affichage selon le rôle
});

// ================================
// CHECK AUTHENTIFICATION
// ================================
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = payload;
        currentToken = token;

        // Redirection selon rôle si on est sur index.html
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            if (payload.role === 'admin') window.location.href = '/dashboard-admin.html';
            else if (payload.role === 'owner') window.location.href = '/dashboard-owner.html';
            else if (payload.role === 'client') window.location.href = '/dashboard-client.html';
        }
    } catch {
        localStorage.removeItem('token');
        currentUser = null;
        currentToken = null;
    }
}


// ================================
// CONFIGURATION DASHBOARD SELON RÔLE (message de bienvenu)
// ================================
function setupDashboard() {
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
        const welcomeDiv = document.getElementById('admin-welcome');
        if (welcomeDiv) {
            // NE PAS utiliser innerHTML qui supprime tout !
            const h3 = welcomeDiv.querySelector('h3');
            if (h3) h3.innerHTML = `👋🏻 Bienvenue ${currentUser.full_name}`;
        }
        loadUsers();
        loadStats();
        loadRooms('rooms-list');
        
    } 
    else if (currentUser.role === 'owner') {
        const welcomeDiv = document.getElementById('owner-welcome');
        if (welcomeDiv) {
            const h3 = welcomeDiv.querySelector('h3');
            if (h3) h3.innerHTML = ` 👋🏻  Bienvenue ${currentUser.full_name}`;
        }
        loadRooms('owner-rooms-list');
        loadOwnerReviews();
    } 
    else if (currentUser.role === 'client') {
        const welcomeDiv = document.getElementById('client-welcome');
        if (welcomeDiv) {
            const h3 = welcomeDiv.querySelector('h3');
            if (h3) h3.innerHTML = `👋🏻  Bienvenue ${currentUser.full_name}`;
        }
        loadRooms('rooms-list');
        loadClientBookings();
         loadClientReviews();
    }
}
// ================================
// LOGIN
// ================================
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) return alert('Veuillez remplir email et mot de passe');

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.error) return alert(data.error);

        localStorage.setItem('token', data.token);
        currentUser = data.user;
        currentToken = data.token;

        // Redirection selon rôle
        if (data.user.role === 'admin') window.location.href = '/dashboard-admin.html';
        else if (data.user.role === 'owner') window.location.href = '/dashboard-owner.html';
        else if (data.user.role === 'client') window.location.href = '/dashboard-client.html';

    } catch (err) {
        console.error(err);
        alert('Erreur connexion');
    }
}

// ================================
// INSCRIPTION
// ================================
async function register() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const full_name = document.getElementById('register-name').value;
    const role = document.getElementById('register-role').value;

    if (!email || !password || !full_name) return alert('Veuillez remplir tous les champs');

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name, role })
        });

        const data = await res.json();
        if (data.error) return alert(data.error);

        localStorage.setItem('token', data.token);
        currentUser = data.user;
        currentToken = data.token;

        if (data.user.role === 'admin') window.location.href = '/dashboard-admin.html';
        else if (data.user.role === 'owner') window.location.href = '/dashboard-owner.html';
        else if (data.user.role === 'client') window.location.href = '/dashboard-client.html';

    } catch (err) {
        console.error(err);
        alert('Erreur inscription');
    }
}

// ================================
// DÉCONNEXION
// ================================
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    currentToken = null;
    window.location.href = '/index.html';
}


// ================================
// CHARGER SALLES 
// ================================
async function loadRooms(targetListId) {
    try {
        console.log(`Chargement salles pour: ${targetListId}`);
        
        const res = await fetch('/api/rooms', {
            headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
        });
        
        if (!res.ok) throw new Error('Erreur récupération salles');
        const rooms = await res.json();

        const list = document.getElementById(targetListId);
        if (!list) {
            console.error(`Élément #${targetListId} non trouvé`);
            return;
        }
        
        // VIDER proprement
        list.innerHTML = '';

        if (!rooms.length) { 
            list.innerHTML = '<p>Aucune salle disponible</p>'; 
            return; 
        }

        // Filtrer pour le propriétaire
        let roomsToShow = rooms;
        if (targetListId === 'owner-rooms-list' && currentUser?.role === 'owner') {
            roomsToShow = rooms.filter(room => room.owner_id == currentUser.id);
        }

        if (!roomsToShow.length) {
            list.innerHTML = '<p>Aucune salle disponible</p>';
            return;
        }

        // AFFICHER LES SALLES
        roomsToShow.forEach(room => {
            const card = document.createElement('div');
            card.className = 'room-card';
            
            // BOUTONS selon le contexte
            let actionButtons = '';
            
            if (!currentUser) {
                actionButtons = `
                    <button onclick="viewRoomDetails(${room.id})" class="btn btn-info" style="width: 100%; margin-top: 10px;">
                        <i class="fas fa-eye"></i> Voir détails
                    </button>
                `;
            }
            else if (currentUser.role === 'client') {
                actionButtons = `
                    <div style="display: flex; gap: 0.5rem; margin-top: 10px;">
                        <button onclick="openBookingModal(${room.id}, '${room.name}', ${room.price_per_hour})" class="btn btn-success" style="flex: 1;">
                            <i class="fas fa-calendar-plus"></i> Réserver
                        </button>
                        <button onclick="viewRoomDetails(${room.id})" class="btn btn-info" style="flex: 1;">
                            <i class="fas fa-eye"></i> Détails
                        </button>
                    </div>
                `;
            }
            else if (currentUser.role === 'admin') {
                actionButtons = `
                    <button onclick="deleteRoom(${room.id})" class="btn btn-danger" style="width: 100%; margin-top: 10px;">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                `;
            }
            else if (currentUser.role === 'owner') {
                actionButtons = `
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button onclick="editRoom(${room.id})" class="btn btn-warning" style="flex: 1;">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button onclick="deleteRoom(${room.id})" class="btn btn-danger" style="flex: 1;">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                `;
            }

            card.innerHTML = `
                <h4 style="color: var(--primary); margin-bottom: 10px;">${room.name}</h4>
                <p style="color: #666; margin-bottom: 10px;">
                    ${room.description ? (room.description.length > 100 ? room.description.substring(0, 100) + '...' : room.description) : 'Aucune description'}
                </p>
                <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px;">
                 <span><i class="fas fa-users" style="color: #2196f3;"></i> ${room.capacity} pers.</span>
                  <span><i class="fas fa-money-bill-wave" style="color: #4CAF50;"></i> ${room.price_per_hour} Da/h</span>
                 <span><i class="fas fa-map-marker-alt" style="color: #f44336;"></i> Ville: ${room.city || '?'}</span>
                  <span><i class="fas fa-location-dot" style="color: #f44336;"></i> Adresse: ${room.address_full || room.city || '?'}</span>
                    </div>

                ${actionButtons}
            `;
            list.appendChild(card);
        });

        // Mettre à jour la carte SI elle existe
        if (document.getElementById('client-map') && typeof initClientMap === 'function') {
            console.log("Mise à jour de la carte");
            initClientMap(rooms);// au lieu de roomsToShow
        }

    } catch (err) {
        console.error('Erreur:', err);
        const list = document.getElementById(targetListId);
        if (list) {
            list.innerHTML = '<p>Erreur lors du chargement des salles</p>';
        }
    }
}
// ================================
// AJOUT SALLE (OWNER)
// ================================

async function addRoom() {
    if (!currentToken || currentUser.role !== 'owner') return alert('Accès refusé');

    const name = document.getElementById('room-name')?.value;
    const description = document.getElementById('room-description')?.value;
    const capacity = parseInt(document.getElementById('room-capacity')?.value);
    const price_per_hour = parseFloat(document.getElementById('room-price')?.value);
    const city = document.getElementById('room-city')?.value;

    if (!name || !description || isNaN(capacity) || isNaN(price_per_hour) || !city) 
        return alert('Veuillez remplir tous les champs correctement');

    try {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, description, capacity, price_per_hour, city })
        });
        const data = await res.json();
        if (data.error) return alert(data.error);

        alert('Salle ajoutée !');
        
        // Recharger les salles du proprio
        loadRooms('owner-rooms-list'); 
        
    } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'ajout de la salle');
    }
}


// ================================
// AJOUTER SALLE (POUR LE DASHBOARD OWNER HTML)
// ================================
async function addOwnerRoom() {
    if (!currentToken || currentUser?.role !== 'owner') return alert('Accès refusé');

    const name = document.getElementById('room-name').value.trim();
    const description = document.getElementById('room-description').value.trim();
    const capacity = document.getElementById('room-capacity').value;
    const price = document.getElementById('room-price').value;
    const city = document.getElementById('room-city').value.trim();
    const address = document.getElementById('room-address').value.trim() || null;
    const equipment = document.getElementById('room-equipment').value.trim() || null;
    const latitude = document.getElementById('room-latitude').value;
    const longitude = document.getElementById('room-longitude').value;

    // Validation RENFORCÉE
    if (!name || !description || !capacity || !price || !city) {
        return alert('Veuillez remplir les champs obligatoires (*)');
    }
    
    // FORCER les coordonnées
    if (!latitude || !longitude) {
        // Essayez de géocoder l'adresse automatiquement
        const fullAddress = `${address || ''}, ${city}`;
        const coords = await geocodeAddress(fullAddress);
        
        if (coords) {
            latitude = coords.lat;
            longitude = coords.lng;
            console.log(` Coordonnées géocodées: ${latitude}, ${longitude}`);
        } else {
            return alert('Veuillez définir l\'emplacement sur la carte. Cliquez sur la carte pour positionner la salle.');
        }
    }

    try {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                name, 
                description, 
                capacity: parseInt(capacity), 
                price_per_hour: parseFloat(price), 
                city,
                address,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                equipment 
            })
        });
        
        if (!res.ok) {
            const data = await res.json();
            return alert(data.error || 'Erreur ajout salle');
        }
        
        alert(' Salle ajoutée avec succès !');
        
        // Recharger les salles
        loadRooms('owner-rooms-list');
        
        // Vider le formulaire
        ['room-name','room-description','room-capacity','room-price','room-city',
         'room-address','room-equipment','address-search'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        // Réinitialiser la carte
        if (window.locationMarker && window.ownerMap) {
            window.ownerMap.removeLayer(window.locationMarker);
            window.locationMarker = null;
        }
        
    } catch (err) {
        console.error('Erreur:', err);
        alert('Erreur lors de l\'ajout de la salle');
    }
}

// Fonction de géocodage
async function geocodeAddress(address) {
    if (!address || address.length < 3) return null;
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=dz`
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        console.error('Erreur géocodage:', error);
    }
    
    return null;
}
// ================================
// EDITER SALLE (propriétaire)
// ================================
function editRoom(roomId) {
    currentEditRoomId = roomId;
    console.log(`Modification salle ID: ${roomId}`);

    fetch(`/api/rooms/${roomId}`, { 
        headers: { 'Authorization': `Bearer ${currentToken}` } 
    })
    .then(res => res.json())
    .then(room => {
        // Remplir le formulaire de modification
        document.getElementById('edit-room-name').value = room.name || '';
        document.getElementById('edit-room-description').value = room.description || '';
        document.getElementById('edit-room-capacity').value = room.capacity || '';
        document.getElementById('edit-room-price').value = room.price_per_hour || '';
        document.getElementById('edit-room-city').value = room.city || '';
        
        // Afficher le formulaire
        const editForm = document.getElementById('edit-room-form');
        if (editForm) {
            editForm.style.display = 'block';
            editForm.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Formulaire de modification non trouvé sur cette page');
        }
    })
    .catch(err => { 
        console.error(err); 
        alert('Erreur lors du chargement de la salle'); 
    });
}

function cancelEdit() {
    currentEditRoomId = null;
    const editForm = document.getElementById('edit-room-form');
    if (editForm) {
        editForm.style.display = 'none';
    }
}

// ================================
// MODIFIER LA LOCALISATION D'UNE SALLE sur la map
// ================================
async function editRoomWithMap(roomId) {
    currentEditRoomId = roomId;
    
    try {
        const res = await fetch(`/api/rooms/${roomId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) throw new Error('Erreur chargement salle');
        const room = await res.json();
        
        console.log(' Chargement salle pour édition:', room);
        
        // Ouvrir un modal pour la localisation
        const modal = document.createElement('div');
        modal.id = 'map-edit-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 600px; width: 90%;">
                <h3><i class="fas fa-map-marker-alt"></i> Localiser la salle</h3>
                <p style="margin: 0.5rem 0 1.5rem 0; color: #666;">
                    <strong>${room.name}</strong> - ${room.city || 'Ville non spécifiée'}
                </p>
                
                <div style="margin-bottom: 1rem;">
                    <div id="edit-location-map" style="height: 300px; border-radius: 8px; border: 2px solid #ddd;"></div>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                        <i class="fas fa-info-circle"></i> Cliquez sur la carte ou recherchez une adresse
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 1rem;">
                    <input type="text" id="search-address" placeholder="Rechercher une adresse..." 
                           style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="searchOnEditMap()" style="padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-search"></i> Chercher
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Latitude:</label>
                        <input type="number" id="edit-latitude" step="any" 
                               value="${room.latitude || ''}" 
                               placeholder="Ex: 36.7525"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Longitude:</label>
                        <input type="number" id="edit-longitude" step="any" 
                               value="${room.longitude || ''}" 
                               placeholder="Ex: 3.0420"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="saveRoomLocation(${roomId})" 
                            style="flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-save"></i> Enregistrer la localisation
                    </button>
                    <button onclick="closeEditMapModal()" 
                            style="flex: 1; padding: 12px; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialiser la carte d'édition
        setTimeout(() => initEditMap(room), 100);
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement de la salle');
    }
}


function initEditMap(room) {
    const mapElement = document.getElementById('edit-location-map');
    if (!mapElement || typeof L === 'undefined') return;
    
    // Centre par défaut sur l'Algérie ou coordonnées existantes
    const center = room.latitude && room.longitude 
        ? [room.latitude, room.longitude]
        : [36.7525, 3.0420];
    
    const editMap = L.map('edit-location-map').setView(center, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(editMap);
    
    // Créer un marqueur draggable
    let marker = null;
    
    if (room.latitude && room.longitude) {
        marker = L.marker([room.latitude, room.longitude], { draggable: true }).addTo(editMap);
    } else {
        marker = L.marker(center, { draggable: true }).addTo(editMap);
    }
    
    // Mettre à jour les champs quand le marqueur est déplacé
    marker.on('dragend', function() {
        const position = marker.getLatLng();
        document.getElementById('edit-latitude').value = position.lat.toFixed(6);
        document.getElementById('edit-longitude').value = position.lng.toFixed(6);
    });
    
    // Sauvegarder la carte et le marqueur pour y accéder plus tard
    window.editMap = editMap;
    window.editMarker = marker;
    
    // Ajouter un événement de clic sur la carte
    editMap.on('click', function(e) {
        if (!marker) {
            marker = L.marker(e.latlng, { draggable: true }).addTo(editMap);
        } else {
            marker.setLatLng(e.latlng);
        }
        
        document.getElementById('edit-latitude').value = e.latlng.lat.toFixed(6);
        document.getElementById('edit-longitude').value = e.latlng.lng.toFixed(6);
    });
}

function searchOnEditMap() {
    const address = document.getElementById('search-address').value;
    if (!address || address.length < 3) return;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=dz`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                
                window.editMap.setView([lat, lng], 14);
                
                if (window.editMarker) {
                    window.editMarker.setLatLng([lat, lng]);
                } else {
                    window.editMarker = L.marker([lat, lng], { draggable: true }).addTo(window.editMap);
                }
                
                document.getElementById('edit-latitude').value = lat;
                document.getElementById('edit-longitude').value = lng;
            } else {
                alert('Adresse non trouvée');
            }
        })
        .catch(err => console.error('Erreur recherche:', err));
}

async function saveRoomLocation(roomId) {
    const latitudeInput = document.getElementById('edit-latitude');
    const longitudeInput = document.getElementById('edit-longitude');
    
    if (!latitudeInput || !longitudeInput) {
        alert('Erreur: champs non trouvés');
        return;
    }
    
    const latitude = latitudeInput.value.trim();
    const longitude = longitudeInput.value.trim();
    
    // Validation
    if (!latitude || !longitude) {
        alert('Veuillez sélectionner un emplacement sur la carte');
        return;
    }
    
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
        alert('Coordonnées invalides');
        return;
    }
    
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        alert('Coordonnées hors limites (lat: -90 à 90, lng: -180 à 180)');
        return;
    }
    
    // Afficher un indicateur de chargement
    const saveBtn = document.querySelector('button[onclick="saveRoomLocation(' + roomId + ')"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    saveBtn.disabled = true;
    
    try {
        console.log(` Sauvegarde localisation salle ${roomId}: ${latNum}, ${lngNum}`);
        
        // ENVOYER SEULEMENT les coordonnées, pas les autres champs
        const res = await fetch(`/api/rooms/${roomId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                latitude: latNum,
                longitude: lngNum
                // NE PAS envoyer les autres champs !
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Erreur lors de la sauvegarde');
        }
        
        console.log('Réponse API:', data);
        
        alert('Localisation enregistrée !');
        closeEditMapModal();
        
        // Recharger les données après un court délai
        setTimeout(() => {
            // Recharger les salles selon la page actuelle
            if (window.location.pathname.includes('dashboard-owner.html')) {
                loadRooms('owner-rooms-list');
            } else if (window.location.pathname.includes('dashboard-client.html')) {
                loadRooms('rooms-list');
            } else if (window.location.pathname.includes('index.html')) {
                loadRooms('rooms-list');
            }
            
            // Forcer un rechargement de la carte
            if (typeof initClientMap === 'function') {
                setTimeout(() => {
                    fetch('/api/rooms')
                        .then(res => res.json())
                        .then(rooms => {
                            console.log(' Rechargement carte avec', rooms.length, 'salles');
                            initClientMap(rooms);
                        })
                        .catch(err => console.error('Erreur rechargement:', err));
                }, 500);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        alert(' Erreur: ' + error.message);
        
        // Réactiver le bouton
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}
function closeEditMapModal() {
    const modal = document.getElementById('map-edit-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    window.editMap = null;
    window.editMarker = null;
}

// ================================
// SUPPRIMER SALLE (owner/admin )
// ================================
async function deleteRoom(roomId) {
    if (!currentToken || !currentUser) return alert('Vous devez être connecté');

    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cette salle ? Cette action est irréversible.');
    if (!confirmDelete) return;

    try {
        const res = await fetch(`/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) {
            const data = await res.json();
            return alert(data.error || 'Impossible de supprimer la salle');
        }
        alert('Salle supprimée !');
        if (currentUser.role === 'owner') loadRooms('owner-rooms-list');
        else loadRooms('rooms-list');
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression de la salle');
    }
}

// ================================
// METTRE À JOUR SALLE (OWNER)
// ================================
// ================================
// METTRE À JOUR SALLE (OWNER) + coords
// ================================
// ================================
// METTRE À JOUR SALLE (OWNER) AVEC ADRESSE COMPLETE
// ================================
async function updateRoom() {
    if (!currentEditRoomId) return;

    const name = document.getElementById('edit-room-name').value.trim();
    const description = document.getElementById('edit-room-description').value.trim();
    const capacity = parseInt(document.getElementById('edit-room-capacity').value);
    const price_per_hour = parseFloat(document.getElementById('edit-room-price').value);
    const city = document.getElementById('edit-room-city').value.trim();

    if (!name || !description || isNaN(capacity) || isNaN(price_per_hour) || !city) {
        return alert("Veuillez remplir tous les champs correctement");
    }

    try {
        let latitude = null;
        let longitude = null;
        let address_full = null;

        // 🔹 Géocoder la ville pour récupérer lat/lng + adresse complète
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1&countrycodes=dz`);
        const geoData = await geoRes.json();

        if (geoData && geoData.length > 0) {
            latitude = parseFloat(geoData[0].lat);
            longitude = parseFloat(geoData[0].lon);
            address_full = geoData[0].display_name; // Adresse complète
        } else {
            alert('Ville introuvable, vérifiez l’orthographe');
            return;
        }

        // 🔹 Envoyer la mise à jour à l’API
        const res = await fetch(`/api/rooms/${currentEditRoomId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                name, 
                description, 
                capacity, 
                price_per_hour, 
                city, 
                latitude, 
                longitude,
                address_full
            })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error || 'Erreur lors de la modification de la salle');

        alert("Salle modifiée avec succès !");
        cancelEdit();

        // 🔹 Recharger les salles (owner) et mettre à jour la carte
        loadRooms('owner-rooms-list');

    } catch (err) {
        console.error(err);
        alert("Erreur lors de la modification de la salle");
    }
}



// ================================
// MODAL RÉSERVATION 
// ================================
function openBookingModal(roomId, roomName, price_per_hour) {
    console.log('Tentative d\'ouverture modal pour salle:', roomId, roomName);
    
    currentBookingRoomId = { roomId, roomName, price_per_hour };
    
    // Videz les champs
    document.getElementById('booking-start').value = '';
    document.getElementById('booking-end').value = '';
    document.getElementById('booking-note').value = '';
    
    // Affichez le modal CORRECTEMENT
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.style.display = 'flex';  // Au lieu de .classList.remove('hidden')
        console.log('Modal affiché');
    } else {
        console.error('Modal #booking-modal non trouvé!');
    }
}

function closeBookingModal() {
    currentBookingRoomId = null;
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.style.display = 'none';  // Au lieu de .classList.add('hidden')
    }
}

// ================================
// CONFIRMER RÉSERVATION (CLIENT)
// ================================
async function confirmBooking() {
    if (!currentToken || currentUser.role !== 'client') return alert('Vous devez être connecté en tant que client');

    const start = document.getElementById('booking-start').value;
    const end = document.getElementById('booking-end').value;
    const note = document.getElementById('booking-note').value || '';

    if (!start || !end) return alert('Veuillez remplir la date de début et de fin');

    const durationHours = (new Date(end) - new Date(start)) / 1000 / 3600;
    if (durationHours <= 0) return alert('La date de fin doit être après la date de début');

    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                room_id: currentBookingRoomId.roomId,
                start_time: start,
                end_time: end,
                total_price: currentBookingRoomId.price_per_hour * durationHours,
                special_requests: note
            })
        });
        const data = await res.json();
        if (data.error) return alert(data.error);

        alert('Réservation effectuée !');
        closeBookingModal();
        loadClientBookings();
    } catch (err) {
        console.error(err);
        alert('Erreur réservation');
    }
}


// ================================
// CHARGER LES RÉSERVATIONS DU CLIENT CONNECTÉ
// ================================
async function loadClientBookings() {
    if (!currentToken || currentUser.role !== 'client') return;

    const container = document.getElementById('my-bookings');
    container.innerHTML = '<div class="loading">Chargement de vos réservations...</div>';

    try {
        const res = await fetch(`/api/bookings/my`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!res.ok) throw new Error('Erreur récupération réservations');

        const bookings = await res.json();

        if (!bookings.length) {
            container.innerHTML = '<p>Vous n\'avez encore aucune réservation.</p>';
            return;
        }

        container.innerHTML = '';
        bookings.forEach(b => {
            const div = document.createElement('div');
            div.className = 'room-card';
            
            // AJOUTEZ LE BOUTON ANNULER ICI :
            div.innerHTML = `
                <h4>${b.room_name}</h4>
                <p><strong>Début :</strong> ${new Date(b.start_time).toLocaleString()}</p>
                <p><strong>Fin :</strong> ${new Date(b.end_time).toLocaleString()}</p>
                <p><strong>Total :</strong> ${b.total_price.toLocaleString()} Da</p>
                <p><strong>Status :</strong> ${b.status}</p>
                ${b.special_requests ? `<p><strong>Remarques :</strong> ${b.special_requests}</p>` : ''}
                ${b.status === 'confirmed' ? `
                    <div style="margin-top: 15px;">
                        <button class="btn btn-danger" onclick="cancelBooking(${b.id})">
                            <i class="fas fa-times"></i> Annuler cette réservation
                        </button>
                    </div>
                ` : ''}
            `;
            container.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p>Impossible de charger vos réservations.</p>';
    }
}

// ================================
// FILTRER LES SALLES (CLIENT)
// ================================
async function filterRooms() {
    const search = document.getElementById('search-room').value.toLowerCase();
    const city = document.getElementById('city-filter').value;
    
    try {
        const res = await fetch('/api/rooms');
        const rooms = await res.json();
        
        // Charger les villes pour le filtre
        const cities = [...new Set(rooms.map(r => r.city).filter(c => c))];
        const citySelect = document.getElementById('city-filter');
        
        // Ne remplir qu'une fois
        if (citySelect.options.length <= 1) {
            cities.forEach(c => {
                const option = document.createElement('option');
                option.value = c;
                option.textContent = c;
                citySelect.appendChild(option);
            });
        }
        
        // Filtrer
        const filtered = rooms.filter(room => {
            const nameMatch = !search || room.name.toLowerCase().includes(search);
            const cityMatch = !city || room.city === city;
            return nameMatch && cityMatch;
        });
        
        // Afficher les salles filtrées
        const list = document.getElementById('rooms-list');
        if (!list) return;
        
        list.innerHTML = '';
        filtered.forEach(room => {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
                <h4>${room.name}</h4>
                <p>Capacité: ${room.capacity}</p>
                <p>${room.price_per_hour} Da / heure</p>
                <p>${room.city || 'Ville non précisée'}</p>
                <button onclick="openBookingModal(${room.id}, '${room.name}', ${room.price_per_hour})">
                    <i class="fas fa-calendar-plus"></i> Réserver
                </button>
            `;
            list.appendChild(card);
        });
        
    } catch (err) {
        console.error(err);
        alert('Erreur lors du filtrage');
    }
}


// ================================
// ADMIN - UTILISATEURS ET STATS
// ================================
async function loadUsers() {
    if (!currentToken || currentUser.role !== 'admin') return;

    try {
        const res = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error('Erreur récupération utilisateurs');
        const users = await res.json();

        const list = document.getElementById('users-list');
        if (!list) return;
        list.innerHTML = '';
        if (!users.length) { list.innerHTML = '<p>Aucun utilisateur</p>'; return; }

        users.forEach(u => {
            const div = document.createElement('div');
            div.textContent = `${u.full_name} (${u.email}) - ${u.role}`;
            list.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadStats() {
    if (!currentToken || currentUser.role !== 'admin') return;

    try {
        const res = await fetch('/api/stats', { headers: { 'Authorization': `Bearer ${currentToken}` } });
        if (!res.ok) throw new Error('Erreur récupération statistiques');
        const stats = await res.json();

        document.getElementById('users-count').textContent = stats.users || 0;
        document.getElementById('rooms-count').textContent = stats.rooms || 0;
        document.getElementById('bookings-count').textContent = stats.bookings || 0;
    } catch (err) {
        console.error(err);
    }
}



// ================================
// GESTION DE L'AFFICHAGE INDEX.HTML
// ================================
function updateAuthDisplay() {
    const authStatus = document.getElementById('auth-status');
    const visitorView = document.getElementById('visitor-view');
    const adminLink = document.getElementById('admin-link');
    
    if (currentUser) {
        // Utilisateur connecté
        authStatus.innerHTML = `
            <h3><i class="fas fa-user-circle"></i> Connecté en tant que ${currentUser.full_name}</h3>
            <p>Rôle: ${currentUser.role}</p>
            <p><button class="btn btn-small btn-danger" onclick="logout()" style="margin-top: 10px;">
                <i class="fas fa-sign-out-alt"></i> Se déconnecter
            </button></p>
        `;
        
        visitorView.style.display = 'none';
        
        // Afficher le lien admin si l'utilisateur est admin
        if (currentUser.role === 'admin') {
            adminLink.style.display = 'flex';
            adminLink.href = 'dashboard-admin.html';
        }
    } else {
        // Visiteur non connecté
        authStatus.innerHTML = `
            <h3><i class="fas fa-user-circle"></i> Non connecté</h3>
            <p>Connectez-vous pour réserver des salles</p>
        `;
        
        visitorView.style.display = 'flex';
        adminLink.style.display = 'none';
    }
}

// Appeler cette fonction après chaque connexion/déconnexion
function checkAuthAndUpdate() {
    checkAuthStatus();
    updateAuthDisplay();
    loadRooms('rooms-list');
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        checkAuthAndUpdate();
    }
});

// ================================
// FONCTIONS ADMIN SPÉCIFIQUES
// ================================

async function deleteUser(userId) {
    if (!currentToken || currentUser.role !== 'admin') return alert('Accès refusé');

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) {
            const data = await res.json();
            return alert(data.error || 'Impossible de supprimer l\'utilisateur');
        }
        
        alert('Utilisateur supprimé avec succès !');
        loadUsers();
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression de l\'utilisateur');
    }
}

async function toggleUserActive(userId, currentActive) {
    if (!currentToken || currentUser.role !== 'admin') return alert('Accès refusé');

    const newStatus = !currentActive;
    const action = newStatus ? 'activer' : 'désactiver';
    
    if (!confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?`)) return;

    try {
        const res = await fetch(`/api/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ active: newStatus })
        });
        
        if (!res.ok) {
            const data = await res.json();
            return alert(data.error || 'Impossible de modifier le statut');
        }
        
        alert(`Utilisateur ${action} avec succès !`);
        loadUsers();
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la modification du statut');
    }
}

// ================================
// FONCTIONS POUR LA GESTION DES SALLES (ADMIN)
// ================================
function viewRoomDetails(roomId) {
    if (!currentToken || currentUser.role !== 'admin') return;
    
    fetch(`/api/rooms/${roomId}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
    })
    .then(res => res.json())
    .then(room => {
        const modal = document.getElementById('userModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        modalTitle.textContent = `Détails: ${room.name}`;
        modalContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h4><i class="fas fa-info-circle"></i> Informations de la Salle</h4>
                <p><strong>Nom:</strong> ${room.name}</p>
                <p><strong>Description:</strong> ${room.description || 'Non spécifiée'}</p>
                <p><strong>Capacité:</strong> ${room.capacity} personnes</p>
                <p><strong>Prix:</strong> ${room.price_per_hour} Da / heure</p>
                <p><strong>Ville:</strong> ${room.city || 'Non spécifiée'}</p>
                <p><strong>Créé le:</strong> ${new Date(room.created_at).toLocaleDateString()}</p>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="closeModal('userModal')">Fermer</button>
                <button class="btn btn-danger" onclick="deleteRoom(${room.id})">
                    <i class="fas fa-trash"></i> Supprimer cette salle
                </button>
            </div>
        `;
        
        modal.style.display = 'flex';
    })
    .catch(err => {
        console.error(err);
        alert('Erreur lors du chargement des détails de la salle');
    });
}



// ================================
// FONCTION POUR ANNULER UNE RÉSERVATION (CLIENT)
// ================================
async function cancelBooking(bookingId) {
    if (!currentToken || currentUser.role !== 'client') return;

    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;

    try {
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await res.json();
        if (!res.ok) {
            return alert(data.error || 'Impossible d\'annuler la réservation');
        }
        
        alert('Réservation annulée avec succès !');
        loadClientBookings();
    } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'annulation de la réservation');
    }
}



// ================================
// GESTION DU MODE SOMBRE/CLAIR 
// ================================

// Initialiser le thème
function initThemeSystem() {
    console.log("Initialisation du thème...");
    
    const themeToggle = document.getElementById('theme-toggle');
    
    if (!themeToggle) {
        console.error("Bouton theme-toggle non trouvé !");
        return;
    }
    
    console.log("Bouton trouvé:", themeToggle);
    
    // Détecter la préférence système
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log("Préférence système (dark):", prefersDark);
    
    // Vérifier le thème sauvegardé
    const savedTheme = localStorage.getItem('theme');
    console.log("Thème sauvegardé:", savedTheme);
    
    // Appliquer le thème
    if (savedTheme === 'dark' || savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
    
    // Mettre à jour l'icône
    updateThemeButton();
    
    // Ajouter l'événement
    themeToggle.addEventListener('click', toggleThemeHandler);
    console.log("Événement click ajouté au bouton");
}

// Gérer le clic sur le bouton
function toggleThemeHandler(event) {
    console.log("Bouton cliqué !");
    event.preventDefault();
    toggleTheme();
}

// Basculer le thème
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    console.log("Changement de thème:", currentTheme, "->", newTheme);
    
    // Appliquer le nouveau thème
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Mettre à jour l'icône
    updateThemeButton();
    
    // Animation de feedback
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    }
}

// Mettre à jour l'icône du bouton
function updateThemeButton() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        btn.innerHTML = '<i class="fas fa-sun"></i>';
        btn.title = 'Passer en mode clair';
    } else {
        btn.innerHTML = '<i class="fas fa-moon"></i>';
        btn.title = 'Passer en mode sombre';
    }
    
    console.log("Icône mise à jour:", currentTheme);
}

// ================================
// INITIALISATION DU THÈME AU CHARGEMENT DE LA PAGE
// ================================

//  Attendre que tout soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM chargé - Initialisation du thème");
    initThemeSystem();
});

//  Backup  aussi au chargement de la fenêtre
window.addEventListener('load', function() {
    console.log("Page complètement chargée");
    // Réessayer si pas déjà fait
    if (!document.documentElement.hasAttribute('data-theme')) {
        initThemeSystem();
    }
});

//  Initialiser immédiatement si DOM déjà prêt
if (document.readyState === 'loading') {
    console.log("DOM en cours de chargement...");
} else {
    console.log("DOM déjà prêt - initialisation immédiate");
    initThemeSystem();
}

// ================================
// Fonction pour ajouter un utilisateur (ADMIN)
// ================================


async function addUser(event) {
    event.preventDefault(); // Empêcher le rechargement de la page
    
    // Récupérer les valeurs du formulaire
    const email = document.getElementById('new-email').value.trim();
    const password = document.getElementById('new-password').value;
    const fullName = document.getElementById('new-fullname').value.trim();
    const role = document.getElementById('new-role').value;
    
    // Validation
    if (!validateForm(email, password)) {
        return;
    }
    
    // Désactiver le bouton pendant la requête
    const submitBtn = document.querySelector('.btn-add');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
    submitBtn.disabled = true;
    
    try {
        const token = localStorage.getItem('token');
        const userData = {
            email: email,
            password: password,
            full_name: fullName || null,
            role: role
        };
        
        console.log('Envoi des données:', userData);
        
        // Envoyer la requête au backend
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de la création');
        }
        
        // Succès
        showSuccessMessage('Utilisateur créé avec succès !');
        
        // Réinitialiser le formulaire
        document.getElementById('add-user-form').reset();
        
        // Recharger la liste des utilisateurs
        setTimeout(() => {
            loadUsersTable();
        }, 1000);
        
    } catch (error) {
        console.error('Erreur création utilisateur:', error);
        showErrorMessage(`Erreur: ${error.message}`);
    } finally {
        // Réactiver le bouton
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Validation du formulaire
function validateForm(email, password) {
    // Réinitialiser les messages d'erreur
    hideErrorMessages();
    
    let isValid = true;
    
    // Validation email
    if (!email) {
        showFieldError('new-email', 'L\'email est requis');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('new-email', 'Email invalide');
        isValid = false;
    }
    
    // Validation mot de passe
    if (!password) {
        showFieldError('new-password', 'Le mot de passe est requis');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('new-password', 'Minimum 6 caractères');
        isValid = false;
    }
    
    return isValid;
}

// Vérifier si l'email est valide
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Afficher un message d'erreur pour un champ
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.textContent = message;
    
    // Insérer après le champ
    field.parentNode.appendChild(errorDiv);
    
    // Ajouter une classe d'erreur au champ
    field.style.borderColor = '#e74c3c';
}

// Cacher tous les messages d'erreur
function hideErrorMessages() {
    // Supprimer les messages d'erreur existants
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    
    // Réinitialiser les bordures
    document.querySelectorAll('.form-group input, .form-group select').forEach(input => {
        input.style.borderColor = '#ddd';
    });
}

// Afficher un message de succès
function showSuccessMessage(message) {
    // Créer ou réutiliser l'élément de message
    let successDiv = document.querySelector('.success-message');
    
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        const form = document.getElementById('add-user-form');
        form.parentNode.insertBefore(successDiv, form);
    }
    
    successDiv.textContent = message;
    successDiv.classList.add('show');
    
    // Cacher après 5 secondes
    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 5000);
}

// Afficher un message d'erreur général
function showErrorMessage(message) {
    alert(message); // Pour l'instant, on utilise alert
}

// Initialiser le formulaire
function initForm() {
    const form = document.getElementById('add-user-form');
    if (form) {
        // Réinitialiser les bordures en cas de focus
        form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('focus', function() {
                this.style.borderColor = '#3498db';
            });
            
            input.addEventListener('blur', function() {
                this.style.borderColor = '#ddd';
            });
        });
    }
}

// Initialiser quand la page est chargée
document.addEventListener('DOMContentLoaded', initForm);

// ================================
// FONCTION POUR LA CARTE CLIENT
// ================================
async function loadRoomsWithMap(containerId = 'rooms-list') {
    try {
        console.log(" Chargement des salles avec carte...");
        
        const res = await fetch('/api/rooms', {
            headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
        });
        
        if (!res.ok) throw new Error('Erreur récupération salles');
        const rooms = await res.json();
        
        console.log(` ${rooms.length} salles chargées`);
        
        // 1. Afficher dans la liste
        const list = document.getElementById(containerId);
        if (list) {
            list.innerHTML = '';
            
            if (!rooms.length) { 
                list.innerHTML = '<div class="empty-state"><p>Aucune salle disponible</p></div>'; 
            } else {
                rooms.forEach(room => {
                    const card = document.createElement('div');
                    card.className = 'room-card';
                    card.innerHTML = `
                        <h4>${room.name}</h4>
                        <p><i class="fas fa-info-circle"></i> ${room.description || 'Pas de description'}</p>
                        <p><i class="fas fa-users"></i> Capacité: ${room.capacity}</p>
                        <p class="price"><i class="fas fa-money-bill-wave"></i> ${room.price_per_hour} Da / heure</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${room.city || 'Ville non précisée'}</p>
                        ${room.address_full ? `<p><i class="fas fa-location-dot"></i> ${room.address_full}</p>` : ''}
                        <div class="room-actions">
                            <button class="btn btn-small btn-primary" onclick="viewRoomDetails(${room.id})">
                                <i class="fas fa-eye"></i> Détails
                            </button>
                            ${currentUser?.role === 'client' ? `
                                <button class="btn btn-small btn-success" onclick="openBookingModal(${room.id}, '${room.name}', ${room.price_per_hour})">
                                    <i class="fas fa-calendar-check"></i> Réserver
                                </button>
                            ` : ''}
                        </div>
                    `;
                    list.appendChild(card);
                });
            }
        }
        
        // 2. Mettre à jour la carte si elle existe
        if (window.initClientMap && document.getElementById('client-map')) {
            console.log("🗺️ Mise à jour de la carte client...");
            window.initClientMap(rooms);
        }
        
    } catch (err) {
        console.error(' Erreur chargement salles:', err);
        const list = document.getElementById(containerId);
        if (list) {
            list.innerHTML = '<div class="empty-state"><p>Erreur lors du chargement des salles</p></div>';
        }
    }
}

// Remplacer l'ancienne fonction loadRooms
window.loadRooms = loadRoomsWithMap;



// ================================
// FONCTION SPÉCIFIQUE PROPRIÉTAIRE , Charger uniquement ses salles <---------------------------------------
// ================================
async function loadOwnerRooms() { 
    if (!currentToken || currentUser?.role !== 'owner') return;
    
    const list = document.getElementById('owner-rooms-list');
    if (!list) return;
    
    list.innerHTML = '<div class="loading">Chargement de vos salles...</div>';
    
    try {
        const res = await fetch('/api/rooms', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) throw new Error('Erreur récupération salles');
        const rooms = await res.json();
        
        // DEBUG: Voir ce que l'API retourne
        console.log('Toutes les salles:', rooms);
        console.log('User ID actuel:', currentUser.id);
        
        // Filtrer pour n'afficher que les salles du propriétaire connecté
        const ownerRooms = rooms.filter(room => {
            console.log(`Salle ${room.id} - owner_id: ${room.owner_id}, user_id: ${currentUser.id}`);
            return room.owner_id == currentUser.id; // Utiliser == pour comparer des strings/numbers
        });
        
        console.log('Salles filtrées:', ownerRooms);
        
        if (!ownerRooms.length) { 
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-closed"></i>
                    <p>Vous n'avez pas encore ajouté de salles</p>
                    <button class="btn btn-primary" onclick="document.querySelector('#owner-section').scrollIntoView({behavior: 'smooth'})">
                        <i class="fas fa-plus"></i> Ajouter une salle
                    </button>
                </div>
            `; 
            return; 
        }
        
        list.innerHTML = '';
        ownerRooms.forEach(room => {
            const card = document.createElement('div');
            card.className = 'room-card';
            
            card.innerHTML = `
                <h4>${room.name}</h4>
                <p>${room.description || 'Pas de description'}</p>
                <p><strong>Capacité:</strong> ${room.capacity} personnes</p>
                <p><strong>Prix:</strong> ${room.price_per_hour} Da / heure</p>
                <p><strong>Ville:</strong> ${room.city || 'Non spécifiée'}</p>
                ${room.address_full ? `<p><strong>Adresse:</strong> ${room.address_full}</p>` : ''}
                <div class="room-actions">
                    <button onclick="editRoom(${room.id})" class="btn btn-warning">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button onclick="deleteRoom(${room.id})" class="btn btn-danger">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
        
    } catch (err) {
        console.error('Erreur chargement salles propriétaire:', err);
        list.innerHTML = '<div class="empty-state"><p>Erreur lors du chargement de vos salles</p></div>';
    }
}

// ================================
// SUPPRIMER SALLE
// ================================
async function deleteRoom(roomId) {
    if (!currentToken || !currentUser) return alert('Vous devez être connecté');

    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cette salle ? Cette action est irréversible.');
    if (!confirmDelete) return;

    try {
        const res = await fetch(`/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) {
            const data = await res.json();
            return alert(data.error || 'Impossible de supprimer la salle');
        }
        
        alert(' Salle supprimée !');
        
        // Recharger selon la page
        if (window.location.pathname.includes('dashboard-owner.html')) {
            loadRooms('owner-rooms-list');
        } else {
            loadRooms('rooms-list');
        }
        
    } catch (err) {
        console.error(err);
        alert(' Erreur lors de la suppression de la salle');
    }
}


/* =====================================================
   OWNER – Charger uniquement les salles du propriétaire connecté <-----------------------------------
   ===================================================== */
async function loadOwnerRooms(containerId = 'rooms-list') {
    if (!currentUser || currentUser.role !== 'owner') {
        console.warn('loadOwnerRooms appelé sans owner');
        return;
    }

    try {
        const res = await fetch('/api/rooms', {
            headers: {
                Authorization: `Bearer ${currentToken}`
            }
        });

        if (!res.ok) throw new Error('Erreur récupération salles');

        const rooms = await res.json();

        // Filtrage STRICT côté front
        const ownerRooms = rooms.filter(
            room => room.owner_id === currentUser.id
        );

        const container = document.getElementById(containerId);

        if (!ownerRooms.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-closed"></i>
                    <p>Vous n’avez encore aucune salle</p>
                </div>
            `;
            return;
        }

        container.innerHTML = ownerRooms.map(room => `
            <div class="room-card">
                <h4>${room.name}</h4>
                <p><i class="fas fa-users"></i> Capacité: ${room.capacity}</p>
                <p class="price">${room.price_per_hour} Da / heure</p>
                <p><i class="fas fa-map-marker-alt"></i> ${room.city}</p>

                <div class="room-actions">
                    <button class="btn btn-small btn-primary"
                        onclick="editRoom(${room.id})">
                        <i class="fas fa-edit"></i> Modifier
                    </button>

                    <button class="btn btn-small btn-danger"
                        onclick="deleteRoom(${room.id})">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        document.getElementById(containerId).innerHTML =
            `<p style="color:red">Erreur chargement salles</p>`;
    }
}



// ================================
// INITIALISATION CARTE
// ================================
function initializeMapForPage(rooms) {
    console.log("🌍 Initialisation de la carte...");
    
    const mapElement = document.getElementById('client-map');
    if (!mapElement) {
        console.log("Aucune carte à initialiser sur cette page");
        return;
    }
    
    // Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error(" Leaflet non chargé !");
        mapElement.innerHTML = `
            <div class="map-error">
                <i class="fas fa-map-marked-alt"></i>
                <h3>Carte non disponible</h3>
                <p>Impossible de charger la carte. Vérifiez votre connexion.</p>
            </div>
        `;
        return;
    }
    
    // Vérifier s'il y a des salles avec coordonnées
    const roomsWithCoords = rooms.filter(r => r.latitude && r.longitude);
    if (roomsWithCoords.length === 0) {
        mapElement.innerHTML = `
            <div class="map-empty-state">
                <i class="fas fa-map-marked-alt"></i>
                <h3>Aucune salle avec localisation</h3>
                <p>Les salles n'ont pas encore de coordonnées GPS</p>
            </div>
        `;
        return;
    }
    
    try {
        // Créer la carte
        const map = L.map('client-map').setView([36.7525, 3.0420], 6);
        
        // Ajouter la couche OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(map);
        
        // Ajouter des marqueurs pour chaque salle
        roomsWithCoords.forEach(room => {
            const marker = L.marker([room.latitude, room.longitude])
                .addTo(map)
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
        
        // Ajuster la vue pour inclure tous les marqueurs
        if (roomsWithCoords.length > 1) {
            const bounds = L.latLngBounds(roomsWithCoords.map(r => [r.latitude, r.longitude]));
            map.fitBounds(bounds, { padding: [30, 30] });
        } else if (roomsWithCoords.length === 1) {
            map.setView([roomsWithCoords[0].latitude, roomsWithCoords[0].longitude], 12);
        }
        
        console.log("Carte initialisée avec succès !");
        
    } catch (error) {
        console.error(" Erreur création carte:", error);
        mapElement.innerHTML = `
            <div class="map-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erreur lors du chargement de la carte</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ================================
// FONCTIONS POUR LES AVIS (CLIENT)
// ================================

// Charger les avis du client
async function loadClientReviews() {
    if (!currentToken || currentUser?.role !== 'client') {
        console.log('❌ Non connecté ou non client');
        return;
    }
    
    const container = document.getElementById('my-reviews');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement de vos avis...</div>';
    
    try {
        console.log('🔍 Chargement des avis du client...');
        
        const res = await fetch('/api/reviews/my', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        console.log('📡 Status:', res.status);
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Erreur API');
        }
        
        const reviews = await res.json();
        console.log('✅ Avis reçus:', reviews);
        
        if (!reviews.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <p>Vous n'avez pas encore laissé d'avis</p>
                    <button class="btn btn-primary" onclick="showReviewForm()" style="margin-top: 1rem;">
                        <i class="fas fa-star"></i> Laisser votre premier avis
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        reviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            
            // Rating stars
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            card.innerHTML = `
                <div class="review-header">
                    <div>
                        <strong>${review.room_name || 'Salle'}</strong>
                        <span class="badge status-active" style="margin-left: 10px;">Approuvé</span>
                    </div>
                    <div class="review-rating" style="color: #ffc107; font-size: 1.2rem;">
                        ${stars}
                    </div>
                </div>
                <div class="review-content">
                    ${review.comment || '<i style="color: #666;">Aucun commentaire</i>'}
                </div>
                <div class="review-footer">
                    <small>Posté le ${new Date(review.created_at).toLocaleDateString()}</small>
                    <button class="btn btn-small btn-danger" onclick="deleteMyReview(${review.id})">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            `;
            
            container.appendChild(card);
        });
        
    } catch (err) {
        console.error('❌ Erreur chargement avis:', err);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erreur: ${err.message}</p>
                <button class="btn btn-secondary" onclick="loadClientReviews()" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;
    }
}


// Afficher le formulaire d'avis
async function showReviewForm() {
    const form = document.getElementById('add-review-form');
    const bookingSelect = document.getElementById('review-booking');
    
    if (!form || !bookingSelect) return;
    
    try {
        // Charger les réservations du client
        const res = await fetch('/api/bookings/my', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) throw new Error('Erreur réservations');
        const bookings = await res.json();
        
        console.log('📅 Réservations:', bookings);
        
        // Charger les avis existants du client
        const reviewsRes = await fetch('/api/reviews/my', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const myReviews = reviewsRes.ok ? await reviewsRes.json() : [];
        console.log('⭐ Avis existants:', myReviews);
        
        // Filtrer les réservations :
        // 1. Status 'confirmed'
        // 2. Pas déjà notées
        const eligibleBookings = bookings.filter(booking => {
            // Vérifier le statut
            const isConfirmed = booking.status === 'confirmed';
            
            // Vérifier si déjà notée
            const alreadyReviewed = myReviews.some(review => 
                review.booking_id === booking.id
            );
            
            // Date de fin dans le passé (optionnel)
            const isPast = new Date(booking.end_time) < new Date();
            
            return isConfirmed && !alreadyReviewed; // Vous pouvez retirer isPast pour tester
        });
        
        console.log('✅ Réservations éligibles:', eligibleBookings);
        
        bookingSelect.innerHTML = '<option value="">Sélectionner une réservation</option>';
        
        if (eligibleBookings.length === 0) {
            bookingSelect.innerHTML += '<option value="" disabled>Aucune réservation disponible</option>';
            
            // Message plus explicite
            if (bookings.length === 0) {
                alert('Vous n\'avez aucune réservation. Réservez une salle d\'abord !');
            } else if (bookings.every(b => b.status !== 'confirmed')) {
                alert('Vous n\'avez pas de réservation confirmée.');
            } else {
                alert('Vous avez déjà noté toutes vos réservations.');
            }
            return;
        }
        
        // Ajouter les options
        eligibleBookings.forEach(booking => {
            const option = document.createElement('option');
            option.value = booking.id;
            const date = new Date(booking.start_time).toLocaleDateString();
            option.textContent = `${booking.room_name} - ${date}`;
            bookingSelect.appendChild(option);
        });
        
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
        
    } catch (err) {
        console.error('Erreur:', err);
        alert('Erreur lors du chargement des réservations: ' + err.message);
    }
}


// Définir la note
function setRating(rating) {
    document.getElementById('review-rating').value = rating;
    const stars = document.querySelectorAll('.rating-stars span');
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
        star.style.color = index < rating ? '#ffc107' : '#ddd';
    });
}

// Soumettre un avis
async function submitReview() {
    const bookingId = document.getElementById('review-booking').value;
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;
    
    if (!bookingId || !rating || rating < 1 || rating > 5) {
        alert('Veuillez sélectionner une réservation et donner une note (1-5 étoiles)');
        return;
    }
    
    try {
        const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                booking_id: parseInt(bookingId),
                rating: parseInt(rating),
                comment: comment || null
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Erreur lors de l\'envoi');
        }
        
        alert('✅ Avis soumis avec succès ! Il sera visible après modération.');
        cancelReview();
        loadClientReviews();
        
    } catch (err) {
        console.error('Erreur soumission avis:', err);
        alert('Erreur: ' + err.message);
    }
}

// Annuler l'avis
function cancelReview() {
    const form = document.getElementById('add-review-form');
    if (form) {
        form.style.display = 'none';
        document.getElementById('review-booking').value = '';
        document.getElementById('review-rating').value = '0';
        document.getElementById('review-comment').value = '';
        
        // Réinitialiser les étoiles
        const stars = document.querySelectorAll('.rating-stars span');
        stars.forEach(star => {
            star.textContent = '☆';
            star.style.color = '#ddd';
        });
    }
}

// Supprimer son propre avis
async function deleteMyReview(reviewId) {
    if (!confirm('Supprimer cet avis ?')) return;
    
    try {
        const res = await fetch(`/api/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok) {
            alert('Avis supprimé');
            loadClientReviews();
        }
    } catch (err) {
        console.error('Erreur suppression avis:', err);
        alert('Erreur lors de la suppression');
    }
}

// ================================
// FONCTIONS POUR LES AVIS (PROPRIÉTAIRE)
// ================================

// Charger les avis pour le propriétaire
async function loadOwnerReviews() {
    if (!currentToken || currentUser?.role !== 'owner') return;
    
    const container = document.getElementById('owner-reviews');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement des avis...</div>';
    
    try {
        // Charger les salles du propriétaire d'abord
        const roomsRes = await fetch('/api/rooms', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!roomsRes.ok) throw new Error('Erreur salles');
        const rooms = await roomsRes.json();
        
        // Filtrer pour n'avoir que les salles du propriétaire
        const ownerRooms = rooms.filter(r => r.owner_id == currentUser.id);
        
        if (ownerRooms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-closed"></i>
                    <p>Vous n'avez pas encore de salles avec des avis</p>
                </div>
            `;
            return;
        }
        
        // Charger les avis pour chaque salle
        const allReviews = [];
        let totalRating = 0;
        let reviewCount = 0;
        let pendingCount = 0;
        
        for (const room of ownerRooms) {
            try {
                const reviewsRes = await fetch(`/api/reviews/room/${room.id}`);
                if (reviewsRes.ok) {
                    const data = await reviewsRes.json();
                    const reviews = data.reviews || [];
                    
                    reviews.forEach(review => {
                        review.room_name = room.name;
                        allReviews.push(review);
                        
                        if (review.status === 'approved') {
                            totalRating += review.rating;
                            reviewCount++;
                        } else if (review.status === 'pending') {
                            pendingCount++;
                        }
                    });
                }
            } catch (err) {
                console.error(`Erreur avis salle ${room.id}:`, err);
            }
        }
        
        // Mettre à jour les stats
        document.getElementById('total-reviews').textContent = allReviews.length;
        document.getElementById('pending-reviews').textContent = pendingCount;
        
        const avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : '0.0';
        document.getElementById('avg-rating').textContent = avgRating;
        
        // Filtrer selon les sélecteurs
        const filterStatus = document.getElementById('review-filter')?.value || 'all';
        const filterRoom = document.getElementById('room-filter')?.value || 'all';
        
        let filteredReviews = allReviews;
        
        if (filterStatus !== 'all') {
            filteredReviews = filteredReviews.filter(r => r.status === filterStatus);
        }
        
        if (filterRoom !== 'all') {
            filteredReviews = filteredReviews.filter(r => r.room_name === filterRoom);
        }
        
        // Afficher les avis
        if (filteredReviews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <p>Aucun avis trouvé</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        filteredReviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            
            // Status badge
            let statusBadge = '';
            let statusClass = '';
            if (review.status === 'approved') {
                statusBadge = 'Approuvé';
                statusClass = 'status-active';
            } else if (review.status === 'pending') {
                statusBadge = 'En attente';
                statusClass = 'status-warning';
            } else {
                statusBadge = 'Rejeté';
                statusClass = 'status-inactive';
            }
            
            // Rating stars
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            card.innerHTML = `
                <div class="review-header">
                    <div>
                        <strong>${review.room_name}</strong>
                        <span class="badge ${statusClass}" style="margin-left: 10px;">${statusBadge}</span>
                    </div>
                    <div class="review-rating" style="color: #ffc107; font-size: 1.2rem;">
                        ${stars}
                    </div>
                </div>
                <div class="review-content">
                    <p><i class="fas fa-user"></i> ${review.user_name || 'Client'}</p>
                    <p>${review.comment || '<i style="color: #666;">Aucun commentaire</i>'}</p>
                </div>
                <div class="review-footer">
                    <small>Posté le ${new Date(review.created_at).toLocaleDateString()}</small>
                </div>
            `;
            
            container.appendChild(card);
        });
        
        // Mettre à jour le filtre des salles
        const roomFilter = document.getElementById('room-filter');
        if (roomFilter && roomFilter.options.length <= 2) {
            roomFilter.innerHTML = '<option value="all">Toutes les salles</option>';
            const uniqueRooms = [...new Set(ownerRooms.map(r => r.name))];
            uniqueRooms.forEach(roomName => {
                const option = document.createElement('option');
                option.value = roomName;
                option.textContent = roomName;
                roomFilter.appendChild(option);
            });
        }
        
    } catch (err) {
        console.error('Erreur chargement avis propriétaire:', err);
        container.innerHTML = '<p class="error">Erreur lors du chargement des avis</p>';
    }
}

// ================================
// FONCTIONS POUR LES AVIS (ADMIN)
// ================================

// Charger les avis pour modération (admin)
async function loadReviews() {
    if (!currentToken || currentUser?.role !== 'admin') return;
    
    const list = document.getElementById('reviews-list');
    if (!list) return;
    
    list.innerHTML = '<div class="loading">Chargement des avis...</div>';
    
    try {
        const res = await fetch('/api/reviews', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) throw new Error('Erreur récupération avis');
        const reviews = await res.json();
        
        displayReviews(reviews);
        
    } catch (err) {
        console.error('Erreur chargement avis admin:', err);
        list.innerHTML = '<div class="empty-state"><p>Erreur lors du chargement des avis</p></div>';
    }
}

// Afficher les avis pour modération
function displayReviews(reviews) {
    const list = document.getElementById('reviews-list');
    const noReviewsDiv = document.getElementById('no-reviews');
    
    if (!reviews || reviews.length === 0) {
        list.innerHTML = '';
        noReviewsDiv.style.display = 'block';
        return;
    }
    
    noReviewsDiv.style.display = 'none';
    
    list.innerHTML = reviews.map(review => {
        // Status badge
        let statusBadge = '';
        if (review.status === 'approved') {
            statusBadge = '<span class="badge status-active">Approuvé</span>';
        } else if (review.status === 'pending') {
            statusBadge = '<span class="badge status-warning">En attente</span>';
        } else {
            statusBadge = '<span class="badge status-inactive">Rejeté</span>';
        }
        
        // Rating stars
        const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
        
        return `
            <div class="review-card">
                <div class="review-header">
                    <div>
                        <strong>${review.user_name || 'Utilisateur'}</strong>
                        <br>
                        <small>${review.room_name || 'Salle'}</small>
                        ${statusBadge}
                    </div>
                    <div class="review-rating" style="color: #ffc107;">
                        ${stars}
                    </div>
                </div>
                <div class="review-content">
                    ${review.comment || '<i style="color: #666;">Aucun commentaire</i>'}
                </div>
                <div class="review-footer">
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                    <div class="btn-group">
                        ${review.status === 'pending' ? `
                            <button class="btn btn-small btn-success" onclick="approveReview(${review.id})">
                                <i class="fas fa-check"></i> Approuver
                            </button>
                            <button class="btn btn-small btn-danger" onclick="rejectReview(${review.id})">
                                <i class="fas fa-times"></i> Rejeter
                            </button>
                        ` : ''}
                        <button class="btn btn-small btn-danger" onclick="deleteReview(${review.id})">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Approuver un avis (admin)
async function approveReview(reviewId) {
    if (!currentToken || currentUser?.role !== 'admin') return;
    
    try {
        const res = await fetch(`/api/reviews/${reviewId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok) {
            alert('✅ Avis approuvé !');
            loadReviews();
        }
    } catch (err) {
        console.error('Erreur approbation avis:', err);
        alert(' Erreur lors de l\'approbation');
    }
}

// Rejeter un avis (admin)
async function rejectReview(reviewId) {
    if (!currentToken || currentUser?.role !== 'admin') return;
    
    try {
        const res = await fetch(`/api/reviews/${reviewId}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok) {
            alert(' Avis rejeté !');
            loadReviews();
        }
    } catch (err) {
        console.error('Erreur rejet avis:', err);
        alert('Erreur lors du rejet');
    }
}

// Supprimer un avis (admin)
async function deleteReview(reviewId) {
    if (!currentToken || currentUser?.role !== 'admin') return;
    
    if (!confirm('Supprimer définitivement cet avis ?')) return;
    
    try {
        const res = await fetch(`/api/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok) {
            alert('✅ Avis supprimé !');
            loadReviews();
        }
    } catch (err) {
        console.error('Erreur suppression avis:', err);
        alert('❌ Erreur lors de la suppression');
    }
}

// Fonction de navigation fluide
function initSmoothScroll() {
    // Écouter les clics sur les liens d'ancrage
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Ajouter un bouton "Retour en haut"
    const backToTopBtn = document.createElement('button');
    backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white;
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        transition: all 0.3s ease;
    `;
    
    backToTopBtn.addEventListener('mouseenter', () => {
        backToTopBtn.style.transform = 'scale(1.1)';
    });
    
    backToTopBtn.addEventListener('mouseleave', () => {
        backToTopBtn.style.transform = 'scale(1)';
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    document.body.appendChild(backToTopBtn);
    
    // Afficher/masquer le bouton selon le scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.style.display = 'flex';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });
}

// Appeler cette fonction quand la page est chargée
document.addEventListener('DOMContentLoaded', initSmoothScroll);