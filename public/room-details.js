// ================================
// ROOM DETAILS MODAL - FICHIER SÉPARÉ
// ================================

let roomDetailsModal = null;

// Initialiser le système de détails
function initRoomDetails() {
    // Créer le modal une seule fois
    roomDetailsModal = document.createElement('div');
    roomDetailsModal.id = 'room-details-modal';
    roomDetailsModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        padding: 1rem;
    `;
    document.body.appendChild(roomDetailsModal);
    
    console.log('✅ Modal détails initialisé');
}

// Fonction principale
function viewRoomDetails(roomId) {
    console.log(`🔍 Voir détails salle: ${roomId}`);
    
    // Initialiser le modal s'il n'existe pas
    if (!roomDetailsModal) {
        initRoomDetails();
    }
    
    // Contenu du modal
    roomDetailsModal.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 10px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            position: relative;
        ">
            <button onclick="closeRoomDetails()" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #666;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            " onmouseover="this.style.background='#f5f5f5'"
               onmouseout="this.style.background='none'">
                &times;
            </button>
            
            <h3 style="margin: 0 0 1.5rem 0; color: var(--primary);">
                <i class="fas fa-info-circle"></i> Détails de la salle
            </h3>
            
            <div id="room-details-content">
                <div style="text-align: center; padding: 2rem;">
                    <div style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid var(--primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem auto;
                    "></div>
                    <p>Chargement...</p>
                </div>
            </div>
        </div>
    `;
    
    // Afficher le modal
    roomDetailsModal.style.display = 'flex';
    
    // Charger les données
    loadRoomDetails(roomId);
}

// Charger les détails depuis l'API
async function loadRoomDetails(roomId) {
    try {
        const res = await fetch(`/api/rooms/${roomId}`, {
            headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
        });
        
        if (!res.ok) throw new Error('Erreur API');
        const room = await res.json();
        
        // Afficher les détails
        displayRoomDetails(room);
        
    } catch (err) {
        console.error('Erreur:', err);
        showError('Impossible de charger les détails');
    }
}

// Afficher les détails
function displayRoomDetails(room) {
    const content = roomDetailsModal.querySelector('#room-details-content');
    
    content.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h4 style="color: var(--primary); margin: 0 0 0.5rem 0;">${room.name}</h4>
            <p style="color: #666;">${room.description || 'Pas de description'}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.25rem;">
                    <i class="fas fa-users"></i> Capacité
                </div>
                <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">
                    ${room.capacity} personnes
                </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.25rem;">
                    <i class="fas fa-money-bill-wave"></i> Prix / heure
                </div>
                <div style="font-size: 1.2rem; font-weight: bold; color: var(--success);">
                    ${room.price_per_hour} Da
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
            <div style="font-weight: bold; margin-bottom: 0.5rem; color: #444;">
                <i class="fas fa-map-marker-alt"></i> Localisation
            </div>
            <div style="color: #666;">
                <div><strong>Ville:</strong> ${room.city || 'Non spécifiée'}</div>
                ${room.address ? `<div><strong>Adresse:</strong> ${room.address}</div>` : ''}
                ${room.equipment ? `<div><strong>Équipements:</strong> ${room.equipment}</div>` : ''}
            </div>
        </div>
        
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; text-align: center;">
            ${currentUser?.role === 'client' ? `
            <button onclick="openBookingModal(${room.id}, '${room.name}', ${room.price_per_hour}); closeRoomDetails();" 
                    style="
                        background: var(--success);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 1rem;
                        margin-right: 0.5rem;
                    ">
                <i class="fas fa-calendar-plus"></i> Réserver
            </button>
            ` : ''}
            
            <button onclick="closeRoomDetails()" 
                    style="
                        background: #eee;
                        color: #666;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 1rem;
                    ">
                <i class="fas fa-times"></i> Fermer
            </button>
        </div>
    `;
}

// Afficher une erreur
function showError(message) {
    const content = roomDetailsModal.querySelector('#room-details-content');
    content.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--danger);">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <p>${message}</p>
            <button onclick="closeRoomDetails()" 
                    style="
                        background: #eee;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        margin-top: 1rem;
                        cursor: pointer;
                    ">
                Fermer
            </button>
        </div>
    `;
}

// Fermer le modal
function closeRoomDetails() {
    if (roomDetailsModal) {
        roomDetailsModal.style.display = 'none';
    }
}

// Fermer avec Échap
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && roomDetailsModal?.style.display === 'flex') {
        closeRoomDetails();
    }
});

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', initRoomDetails);

// Styles globaux
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log(' room-details.js chargé');