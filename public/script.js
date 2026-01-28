// Fonctions basiques
async function loadRooms() {
    try {
        const res = await fetch('/api/rooms/test');
        const rooms = await res.json();
        document.getElementById('rooms-list').innerHTML = 
            rooms.map(r => `<div class="room-item">${r.name} (${r.capacity} pers.)</div>`).join('');
    } catch (err) {
        alert('Erreur chargement salles');
    }
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
    });
    
    const data = await res.json();
    alert(data.token ? 'Inscription réussie!' : 'Erreur');
}

// Charger au démarrage
loadRooms();