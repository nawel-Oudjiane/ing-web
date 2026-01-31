// ================================
// VARIABLES GLOBALES
// ================================
let currentUser = null;
let currentToken = null;

// ================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus(); // Vérifie le token et redirige selon rôle
    setupDashboard();  // Affiche "Bienvenue" et charge les données
});

// ================================
// VÉRIFIER LOGIN & REDIRECTION SELON RÔLE
// ================================
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = payload;
        currentToken = token;

        // Redirection automatique selon rôle si on est sur index.html
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
// CONFIGURATION DU DASHBOARD
// ================================
function setupDashboard() {
    if (!currentUser) return;

    // ADMIN
    if (currentUser.role === 'admin') {
        const welcomeDiv = document.getElementById('admin-welcome');
        if (welcomeDiv) welcomeDiv.innerHTML = `<h3>👋 Bienvenue ${currentUser.full_name}</h3>`;
        loadUsers();
        loadStats();
        loadRooms('rooms-list'); // si tu veux montrer les salles aussi
    }

    // OWNER
    if (currentUser.role === 'owner') {
        const welcomeDiv = document.getElementById('owner-welcome');
        if (welcomeDiv) welcomeDiv.innerHTML = `<h3>👋 Bienvenue ${currentUser.full_name}</h3>`;
        loadRooms('owner-rooms-list'); // listes des salles du proprio
    }

    // CLIENT
    if (currentUser.role === 'client') {
        const welcomeDiv = document.getElementById('client-welcome');
        if (welcomeDiv) welcomeDiv.innerHTML = `<h3>👋 Bienvenue ${currentUser.full_name}</h3>`;
        loadRooms('client-rooms-list'); // listes des salles dispo pour réservation
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

        // Redirection selon rôle
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
// CHARGER UTILISATEURS (ADMIN)
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

// ================================
// CHARGER STATISTIQUES (ADMIN)
// ================================
async function loadStats() {
    if (!currentToken || currentUser.role !== 'admin') return;

    try {
        const res = await fetch('/api/stats', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

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
// RÉSERVER UNE SALLE (CLIENT)
// ================================
async function reserverSalle(roomId) {
    if (!currentToken || currentUser.role !== 'client') return alert('Vous devez être connecté en tant que client');

    const start = prompt('Date et heure début (YYYY-MM-DDTHH:MM)');
    const hours = parseInt(prompt('Nombre d’heures'));

    if (!start || isNaN(hours) || hours <= 0) return alert('Entrées invalides');

    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ room_id: roomId, start_time: start, duration_hours: hours })
        });

        const data = await res.json();
        if (data.error) return alert(data.error);
        alert('Réservation effectuée !');
    } catch (err) {
        console.error(err);
        alert('Erreur réservation');
    }
}
// ================================
// AJOUTER UNE SALLE (PROPRIÉTAIRE)
// ================================
async function addRoom() {
    console.log('addRoom appelé, currentUser:', currentUser, 'currentToken:', currentToken);
    if (!currentToken || currentUser.role !== 'owner') return alert('Accès refusé');

    const name = document.getElementById('room-name')?.value;
    const description = document.getElementById('room-description')?.value;
    const capacity = parseInt(document.getElementById('room-capacity')?.value);
    const price_per_hour = parseFloat(document.getElementById('room-price')?.value);
    const city = document.getElementById('room-city')?.value;

    console.log({name, description, capacity, price_per_hour, city});

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
        console.log('Réponse API:', data);
        if (data.error) return alert(data.error);

        alert('Salle ajoutée !');
        loadRooms('owner-rooms-list');
    } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'ajout de la salle');
    }
}

// ================================
// ÉDITER UNE SALLE (PROPRIÉTAIRE)
// ================================


// ================================
// ÉDITER UNE SALLE (OWNER)
// ================================
let currentEditRoomId = null;

function editRoom(roomId) {
    currentEditRoomId = roomId;

    fetch(`/api/rooms/${roomId}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
    })
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
        .catch(err => {
            console.error(err);
            alert('Erreur lors du chargement de la salle');
        });
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
        loadRooms('owner-rooms-list');
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la modification de la salle");
    }
}

// ================================
// CHARGER SALLES (PUBLIC / OWNER / CLIENT)
// ================================
// ================================
// CHARGER SALLES (PUBLIC / OWNER / CLIENT)
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
            list.innerHTML = '<p>Aucune salle</p>'; 
            return; 
        }

        rooms.forEach(room => {
            // Owner : n'afficher que ses salles dans son dashboard
            if (currentUser?.role === 'owner' && targetListId === 'owner-rooms-list' && room.owner_id !== currentUser.id) {
                return;
            }

            const card = document.createElement('div');
            card.className = 'room-card';

            let actionButtons = '';

            if (currentUser) {
                if (currentUser.role === 'client') {
                    actionButtons = `<button onclick="reserverSalle(${room.id})">Réserver</button>`;
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
                <p>${room.price_per_hour} Da</p>
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
// CHARGER SALLES POUR LES VISITEURS
// ================================
document.addEventListener('DOMContentLoaded', () => {
    // Si personne n'est connecté, charger les salles pour le visiteur
    if (!currentUser) {
        loadRooms('rooms-list');
    }
});



// ================================
// SUPPRIMER UNE SALLE (OWNER / ADMIN)
// ================================
async function deleteRoom(roomId) {
    if (!currentToken || !currentUser) return alert('Vous devez être connecté');

    // Confirmation avant suppression
    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cette salle ? Cette action est irréversible.');
    if (!confirmDelete) return;

    try {
        const res = await fetch(`/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!res.ok) {
            const data = await res.json();
            return alert(data.error || 'Impossible de supprimer la salle');
        }

        alert('Salle supprimée !');
        loadRooms(currentUser.role === 'owner' ? 'owner-rooms-list' : 'rooms-list');
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression de la salle');
    }
}