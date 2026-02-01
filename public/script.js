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
// CONFIGURATION DASHBOARD SELON RÔLE
// ================================
function setupDashboard() {
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
        const welcomeDiv = document.getElementById('admin-welcome');
        if (welcomeDiv) welcomeDiv.innerHTML = `<h3>👋 Bienvenue ${currentUser.full_name}</h3>`;
        loadUsers();
        loadStats();
        loadRooms('rooms-list');
    } else if (currentUser.role === 'owner') {
        const welcomeDiv = document.getElementById('owner-welcome');
        if (welcomeDiv) welcomeDiv.innerHTML = `<h3>👋 Bienvenue ${currentUser.full_name}</h3>`;
        loadRooms('owner-rooms-list');
    } else if (currentUser.role === 'client') {
        const welcomeDiv = document.getElementById('client-welcome');
        if (welcomeDiv) welcomeDiv.innerHTML = `<h3>👋 Bienvenue ${currentUser.full_name}</h3>`;
        loadRooms('rooms-list');
        loadClientBookings();
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
        const res = await fetch('/api/rooms', {
            headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
        });
        if (!res.ok) throw new Error('Erreur récupération salles');
        const rooms = await res.json();

        const list = document.getElementById(targetListId);
        if (!list) return;
        list.innerHTML = '';

        if (!rooms.length) { 
            list.innerHTML = '<p>Aucune salle disponible</p>'; 
            return; 
        }

        rooms.forEach(room => {
            if (currentUser?.role === 'owner' && targetListId === 'owner-rooms-list' && room.owner_id !== currentUser.id) return;

            const card = document.createElement('div');
            card.className = 'room-card';

            let actionButtons = '';
            if (currentUser) {
                if (currentUser.role === 'client') {
                    actionButtons = `<button onclick="openBookingModal(${room.id}, '${room.name}', ${room.price_per_hour})">Réserver</button>`;
                } else if (currentUser.role === 'admin') {
                    actionButtons = `<button onclick="deleteRoom(${room.id})">Supprimer</button>`;
                } else if (currentUser.role === 'owner' && room.owner_id === currentUser.id) {
                    actionButtons = `
                        <button onclick="editRoom(${room.id})">Modifier</button>
                        <button onclick="deleteRoom(${room.id})">Supprimer</button>
                    `;
                }
            }

            card.innerHTML = `
                <h4>${room.name}</h4>
                <p>Capacité: ${room.capacity}</p>
                <p>${room.price_per_hour} Da / heure</p>
                <p>${room.city || 'Ville non précisée'}</p>
                ${actionButtons}
            `;
            list.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        alert('Erreur lors du chargement des salles');
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
        loadRooms('owner-rooms-list');
    } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'ajout de la salle');
    }
}

// ================================
// MODAL RÉSERVATION
// ================================
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
        alert('Salle supprimée !');
        if (currentUser.role === 'owner') loadRooms('owner-rooms-list');
        else loadRooms('rooms-list');
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression de la salle');
    }
}

// ================================
// EDITER SALLE (OWNER / ADMIN)
// ================================
function editRoom(roomId) {
    currentEditRoomId = roomId;

    fetch(`/api/rooms/${roomId}`, { headers: { 'Authorization': `Bearer ${currentToken}` } })
        .then(res => res.json())
        .then(room => {
            if (currentUser.role !== 'admin' && room.owner_id !== currentUser.id) {
                return alert("Vous ne pouvez modifier que vos propres salles");
            }

            document.getElementById('edit-room-name').value = room.name || '';
            document.getElementById('edit-room-description').value = room.description || '';
            document.getElementById('edit-room-capacity').value = room.capacity || '';
            document.getElementById('edit-room-price').value = room.price_per_hour || '';
            document.getElementById('edit-room-city').value = room.city || '';
            document.getElementById('edit-room-form').classList.remove('hidden');
        })
        .catch(err => { console.error(err); alert('Erreur lors du chargement de la salle'); });
}

function cancelEdit() {
    currentEditRoomId = null;
    document.getElementById('edit-room-form').classList.add('hidden');
}

async function updateRoom() {
    if (!currentEditRoomId) return;

    const name = document.getElementById('edit-room-name').value;
    const description = document.getElementById('edit-room-description').value;
    const capacity = parseInt(document.getElementById('edit-room-capacity').value);
    const price_per_hour = parseFloat(document.getElementById('edit-room-price').value);
    const city = document.getElementById('edit-room-city').value;

    if (!name || !description || isNaN(capacity) || isNaN(price_per_hour) || !city) {
        return alert("Veuillez remplir tous les champs correctement");
    }

    try {
        const res = await fetch(`/api/rooms/${currentEditRoomId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, description, capacity, price_per_hour, city })
        });
        const data = await res.json();
        if (data.error) return alert(data.error);

        alert("Salle modifiée avec succès !");
        cancelEdit();
        loadRooms(currentUser.role === 'owner' ? 'owner-rooms-list' : 'rooms-list');
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la modification de la salle");
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
// FONCTIONS POUR LES AVIS
// ================================
async function approveReview(reviewId) {
    if (!currentToken || currentUser.role !== 'admin') return alert('Accès refusé');

    try {
        const res = await fetch(`/api/reviews/${reviewId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok) {
            alert('Avis approuvé !');
            loadReviews();
        }
    } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'approbation de l\'avis');
    }
}

async function deleteReview(reviewId) {
    if (!currentToken || currentUser.role !== 'admin') return alert('Accès refusé');

    if (!confirm('Supprimer cet avis ?')) return;

    try {
        const res = await fetch(`/api/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok) {
            alert('Avis supprimé !');
            loadReviews();
        }
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression de l\'avis');
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
// FONCTION POUR CHARGER LES AVIS
// ================================
async function loadReviews() {
    if (!currentToken || currentUser.role !== 'admin') return;

    try {
        const res = await fetch('/api/reviews', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.status === 404) {
            document.getElementById('reviews-list').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <p>Fonctionnalité en cours de développement</p>
                    <p><small>La gestion des avis sera disponible bientôt</small></p>
                </div>
            `;
            return;
        }
        
        const reviews = await res.json();
        // Afficher les reviews
    } catch (err) {
        console.error(err);
        document.getElementById('reviews-list').innerHTML = '<div class="empty-state"><p>Erreur lors du chargement des avis</p></div>';
    }
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
// GESTION DU MODE SOMBRE/CLAIR - VERSION SIMPLIFIÉE
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
// INITIALISATION GARANTIE
// ================================

// Méthode 1 : Attendre que tout soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM chargé - Initialisation du thème");
    initThemeSystem();
});

// Méthode 2 : Backup - aussi au chargement de la fenêtre
window.addEventListener('load', function() {
    console.log("Page complètement chargée");
    // Réessayer si pas déjà fait
    if (!document.documentElement.hasAttribute('data-theme')) {
        initThemeSystem();
    }
});

// Méthode 3 : Initialiser immédiatement si DOM déjà prêt
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
        console.log("🔄 Chargement des salles avec carte...");
        
        const res = await fetch('/api/rooms', {
            headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
        });
        
        if (!res.ok) throw new Error('Erreur récupération salles');
        const rooms = await res.json();
        
        console.log(`✅ ${rooms.length} salles chargées`);
        
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
                        ${room.address ? `<p><i class="fas fa-location-dot"></i> ${room.address}</p>` : ''}
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
        console.error('❌ Erreur chargement salles:', err);
        const list = document.getElementById(containerId);
        if (list) {
            list.innerHTML = '<div class="empty-state"><p>Erreur lors du chargement des salles</p></div>';
        }
    }
}

// Remplacer l'ancienne fonction loadRooms
window.loadRooms = loadRoomsWithMap;

