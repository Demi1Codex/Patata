/**
 * App Logic for Idea Board
 * Handles theme toggling, data persistence, and UI rendering.
 */

// State Management
const STATE = {
    ideas: [],
    theme: 'dark',
    currentCategory: 'all',
    isSharedSession: false,
    sessionPassword: null, // Stores password in memory for current session
    googleToken: null,
    calendarEvents: [],
    lastCheckedEvent: null
};

// Google Config (User needs to replace this Client ID)
const GOOGLE_CONFIG = {
    CLIENT_ID: '698511203920-idpjgq19kec7hjivcrtmkrd9nnn908n6.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/calendar.readonly'
};

// DOM Elements
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    addIdeaBtn: document.getElementById('addIdeaBtn'),
    modal: document.getElementById('ideaModal'),
    ideaForm: document.getElementById('ideaForm'),
    cancelBtn: document.querySelector('.btn-secondary'),
    progressList: document.getElementById('progressList'),
    pausedList: document.getElementById('pausedList'),
    imageInput: document.getElementById('ideaImage'),
    categoryList: document.getElementById('categoryFilterList'),
    shareBtn: document.getElementById('shareBtn'),
    openSharedBtn: document.getElementById('openSharedBtn'),
    sharedFileInput: document.getElementById('sharedFileInput'),
    // New Elements
    calendarBtn: document.getElementById('calendarBtn'),
    calendarModal: document.getElementById('calendarModal'),
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    requestNotifyBtn: document.getElementById('requestNotifyBtn'),
    notificationContainer: document.getElementById('notificationContainer'),
    calendarEventsList: document.getElementById('calendarEvents'),
    googleLoginSection: document.getElementById('googleLoginSection'),
    eventsContainer: document.getElementById('eventsContainer')
};

// --- Initialization ---

async function init() {
    await loadState();
    applyTheme();
    updateShareButtonsText();
    updateCalendarButtonText();
    renderBoard();
    setupEventListeners();

    // Check for Google Token in storage
    const savedToken = localStorage.getItem('googleToken');
    if (savedToken) {
        STATE.googleToken = savedToken;
        updateCalendarUI(true);
        fetchCalendarEvents();
    }

    // Start background event checker (every 1 minute)
    setInterval(checkUpcomingEvents, 60000);

    // Update UI if we loaded a shared session
    if (STATE.isSharedSession) {
        document.title = "Tablero Compartido";
        const h1 = document.querySelector('header h1');
        if (h1) {
            h1.innerHTML = "🔒 Tablero Compartido";
            h1.style.color = "#F87171";
        }
    }
}

// --- Calendar & Notifications Logic ---

let googleTokenClient;

function openCalendar() {
    elements.calendarModal.classList.add('open');
    if (STATE.googleToken) {
        fetchCalendarEvents();
    }
}

window.closeCalendar = function () {
    elements.calendarModal.classList.remove('open');
};

function updateCalendarButtonText() {
    if (!elements.calendarBtn) return;
    const isMobile = window.innerWidth <= 900;
    elements.calendarBtn.innerText = isMobile ? '📅' : '📅 Calendario';
}

function handleGoogleLogin() {
    if (!googleTokenClient) {
        googleTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: (response) => {
                if (response.access_token) {
                    STATE.googleToken = response.access_token;
                    localStorage.setItem('googleToken', STATE.googleToken);
                    updateCalendarUI(true);
                    fetchCalendarEvents();
                    showToast('Sincronizado con Google exitosamente');
                }
            },
        });
    }
    googleTokenClient.requestAccessToken();
}

window.logoutGoogle = function () {
    STATE.googleToken = null;
    localStorage.removeItem('googleToken');
    updateCalendarUI(false);
    showToast('Sesión de Google cerrada');
};

function updateCalendarUI(isLoggedIn) {
    if (isLoggedIn) {
        elements.googleLoginSection.style.display = 'none';
        elements.calendarEventsList.style.display = 'block';
    } else {
        elements.googleLoginSection.style.display = 'block';
        elements.calendarEventsList.style.display = 'none';
        elements.eventsContainer.innerHTML = '';
    }
}

async function fetchCalendarEvents() {
    if (!STATE.googleToken) return;

    try {
        const now = new Date().toISOString();
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=10&orderBy=startTime&singleEvents=true`, {
            headers: { 'Authorization': `Bearer ${STATE.googleToken}` }
        });

        if (response.status === 401) {
            // Token expired
            logoutGoogle();
            return;
        }

        const data = await response.json();
        STATE.calendarEvents = data.items || [];
        renderCalendarEvents();
        checkUpcomingEvents();
    } catch (error) {
        console.error('Error fetching events:', error);
    }
}

function renderCalendarEvents() {
    if (!elements.eventsContainer) return;

    if (STATE.calendarEvents.length === 0) {
        elements.eventsContainer.innerHTML = '<p class="empty-state">No hay eventos próximos.</p>';
        return;
    }

    elements.eventsContainer.innerHTML = STATE.calendarEvents.map(event => {
        const start = event.start.dateTime || event.start.date;
        const date = new Date(start).toLocaleString();
        return `
            <div class="event-item">
                <div class="event-time">${date}</div>
                <div class="event-title">${escapeHtml(event.summary)}</div>
            </div>
        `;
    }).join('');
}

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("Este navegador no soporta notificaciones de escritorio.");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            showToast('¡Notificaciones activadas!');
            showNotification('Patata', 'Ahora recibirás avisos de tus eventos aquí.');
        }
    });
}

function showToast(message, title = 'Info') {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="notify-icon">🔔</div>
        <div class="notify-body">
            <div class="notify-header">${title}</div>
            <div class="notify-msg">${message}</div>
        </div>
    `;

    elements.notificationContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showNotification(title, message) {
    // In-page notification
    showToast(message, title);

    // System notification
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: message,
            icon: 'palpueblo.png'
        });
    }
}

function checkUpcomingEvents() {
    if (STATE.calendarEvents.length === 0) return;

    const now = new Date();
    const imminentEvents = STATE.calendarEvents.filter(event => {
        const start = new Date(event.start.dateTime || event.start.date);
        const diffMinutes = (start - now) / (1000 * 60);
        // Notify if event is in the next 5 minutes and we haven't notified for this specific one recently
        return diffMinutes > 0 && diffMinutes <= 5;
    });

    imminentEvents.forEach(event => {
        const eventKey = `notified_${event.id}`;
        if (!sessionStorage.getItem(eventKey)) {
            showNotification('Evento Próximo', `${event.summary} comienza pronto.`);
            sessionStorage.setItem(eventKey, 'true');
        }
    });
}


// --- Data Persistence ---

async function loadState() {
    const savedData = localStorage.getItem('ideaBoardData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        STATE.theme = parsed.theme || 'dark';

        if (parsed.isSharedSession && parsed.encryptedData) {
            // Locked session found
            const password = prompt("🔒 Tablero Protegido. Introduce la contraseña para restaurar la sesión:");
            if (password) {
                try {
                    const decryptedIdeas = await decryptData(parsed.encryptedData, password);
                    STATE.ideas = decryptedIdeas;
                    STATE.sessionPassword = password;
                    STATE.isSharedSession = true;
                } catch (error) {
                    console.error("Decryption failed", error);
                    alert("Contraseña incorrecta. No se puede acceder al tablero protegido.");
                    STATE.ideas = [];
                }
            } // If cancelled, ideas remains empty
        } else {
            STATE.ideas = parsed.ideas || [];
        }
    }
}

async function saveState() {
    if (STATE.isSharedSession) {
        if (STATE.sessionPassword) {
            try {
                // Determine what to encrypt
                const encryptedString = await encryptData(STATE.ideas, STATE.sessionPassword);
                const payload = {
                    theme: STATE.theme,
                    isSharedSession: true,
                    encryptedData: encryptedString
                };
                localStorage.setItem('ideaBoardData', JSON.stringify(payload));
                console.log('Shared board state saved encrypted.');
            } catch (e) {
                console.error("Error saving shared state:", e);
            }
        } else {
            console.warn('Shared session active but no password. Skipping save.');
        }
        return;
    }

    // Normal save
    localStorage.setItem('ideaBoardData', JSON.stringify(STATE));
}

// --- Theme Management ---

function applyTheme() {
    document.documentElement.setAttribute('data-theme', STATE.theme);
    updateThemeButtonText();
}

function updateThemeButtonText() {
    if (!elements.themeToggle) return;

    const isMobile = window.innerWidth <= 900;
    const iconOnly = STATE.theme === 'dark' ? '☀️' : '🌙';
    const iconWithText = STATE.theme === 'dark' ? '☀️ Light' : '🌙 Dark';

    elements.themeToggle.innerText = isMobile ? iconOnly : iconWithText;
    elements.themeToggle.setAttribute('aria-label', STATE.theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}

function toggleTheme() {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
}

function updateShareButtonsText() {
    const isMobile = window.innerWidth <= 900;

    if (elements.shareBtn) {
        elements.shareBtn.innerText = isMobile ? '📤' : '📤 Compartir';
        elements.shareBtn.setAttribute('aria-label', 'Compartir Tablero');
    }

    if (elements.openSharedBtn) {
        elements.openSharedBtn.innerText = isMobile ? '📂' : '📂 Abrir';
        elements.openSharedBtn.setAttribute('aria-label', 'Abrir Tablero Compartido');
    }
}

// --- Board Rendering ---

function renderBoard() {
    // Clear lists
    elements.progressList.innerHTML = '';
    elements.pausedList.innerHTML = '';

    // Filter ideas based on current category
    const filteredIdeas = STATE.ideas.filter(idea => {
        if (STATE.currentCategory === 'all') return true;
        return idea.category === STATE.currentCategory;
    });

    filteredIdeas.forEach(idea => {
        const card = createIdeaCard(idea);
        if (idea.status === 'progress') {
            elements.progressList.appendChild(card);
        } else {
            elements.pausedList.appendChild(card);
        }
    });

    updateCounts(filteredIdeas);
}

function createIdeaCard(idea) {
    const div = document.createElement('div');
    div.className = `idea-card ${idea.status}`;
    div.id = idea.id;

    const imageHtml = idea.image ? `<img src="${idea.image}" class="card-image" alt="Idea attachment">` : '';

    div.innerHTML = `
        ${imageHtml}
        <div class="category-badge">${escapeHtml(idea.category || 'General')}</div>
        <div class="card-title">${escapeHtml(idea.title)}</div>
        <p class="card-desc">${escapeHtml(idea.description)}</p>
        <div class="card-actions">
            <button class="btn-icon" onclick="deleteIdea('${idea.id}')" title="Delete">
                🗑️
            </button>
            <button class="btn-icon" onclick="editIdea('${idea.id}')" title="Edit">
                ✏️
            </button>
            <button class="btn-icon" onclick="toggleStatus('${idea.id}')" title="Move to ${idea.status === 'progress' ? 'Paused' : 'Progress'}">
                ⇄
            </button>
        </div>
    `;
    return div;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateCounts(ideas) {
    const list = ideas || STATE.ideas;
    const progressCount = list.filter(i => i.status === 'progress').length;
    const pausedCount = list.filter(i => i.status === 'paused').length;

    document.getElementById('progressCount').innerText = progressCount;
    document.getElementById('pausedCount').innerText = pausedCount;
}

// --- Item Management ---

function addIdea(e) {
    e.preventDefault();

    const id = document.getElementById('ideaId').value;
    const title = document.getElementById('ideaTitle').value;
    const description = document.getElementById('ideaDesc').value;
    const status = document.getElementById('ideaStatus').value;
    const category = document.getElementById('ideaCategory').value;
    const imageFile = document.getElementById('ideaImage').files[0];

    // If ID exists, we are updating. get existing idea to preserve properties like image if not changed
    let existingIdea = id ? STATE.ideas.find(i => i.id === id) : null;

    const ideaData = {
        id: id || Date.now().toString(),
        title,
        description,
        status,
        category,
        image: existingIdea ? existingIdea.image : null, // Default to existing
        createdAt: existingIdea ? existingIdea.createdAt : new Date().toISOString()
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (event) {
            ideaData.image = event.target.result; // Update image
            saveIdeaAndClose(ideaData, !!id);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveIdeaAndClose(ideaData, !!id);
    }
}

function saveIdeaAndClose(idea, isUpdate) {
    if (isUpdate) {
        const index = STATE.ideas.findIndex(i => i.id === idea.id);
        if (index !== -1) STATE.ideas[index] = idea;
    } else {
        STATE.ideas.push(idea);
    }

    saveState();
    renderBoard();
    closeModal();
    resetForm();
}

// Global functions for inline onclick handlers
// Global functions for inline onclick handlers
window.deleteIdea = function (id) {
    if (confirm('Are you sure you want to delete this idea?')) {
        STATE.ideas = STATE.ideas.filter(i => i.id !== id);
        saveState();
        renderBoard();
    }
};

window.editIdea = function (id) {
    const idea = STATE.ideas.find(i => i.id === id);
    if (!idea) return;

    // Populate form
    document.getElementById('ideaId').value = idea.id;
    document.getElementById('ideaTitle').value = idea.title;
    document.getElementById('ideaDesc').value = idea.description;
    document.getElementById('ideaStatus').value = idea.status;
    document.getElementById('ideaCategory').value = idea.category || 'Personal';

    // Change Modal Title
    document.querySelector('.modal-title').innerText = 'Editar Idea';

    openModal(false); // false = don't clear form
};

window.toggleStatus = function (id) {
    const idea = STATE.ideas.find(i => i.id === id);
    if (idea) {
        idea.status = idea.status === 'progress' ? 'paused' : 'progress';
        saveState();
        renderBoard();
    }
};

// --- Modal Handling ---

function openModal(clear = true) {
    if (clear) resetForm();
    elements.modal.classList.add('open');
    document.getElementById('ideaTitle').focus();
}

function closeModal() {
    elements.modal.classList.remove('open');
    resetForm();
    document.querySelector('.modal-title').innerText = 'Crear Nueva Idea';
}

function resetForm() {
    elements.ideaForm.reset();
    document.getElementById('ideaId').value = '';
}

// --- Event Listeners ---

function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.addIdeaBtn.addEventListener('click', openModal);

    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });

    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', closeModal);
    }

    elements.ideaForm.addEventListener('submit', addIdea);

    // Category Filter Listeners
    if (elements.categoryList) {
        elements.categoryList.addEventListener('change', (e) => {
            if (e.target.name === 'category') {
                setCategory(e.target.value);
            }
        });
    }

    if (elements.shareBtn) elements.shareBtn.addEventListener('click', handleShareBoard);
    if (elements.openSharedBtn) elements.openSharedBtn.addEventListener('click', () => elements.sharedFileInput.click());
    if (elements.sharedFileInput) elements.sharedFileInput.addEventListener('change', handleOpenSharedBoard);

    // New Listeners
    if (elements.calendarBtn) elements.calendarBtn.addEventListener('click', openCalendar);
    if (elements.googleLoginBtn) elements.googleLoginBtn.addEventListener('click', handleGoogleLogin);
    if (elements.requestNotifyBtn) elements.requestNotifyBtn.addEventListener('click', requestNotificationPermission);

    elements.calendarModal.addEventListener('click', (e) => {
        if (e.target === elements.calendarModal) closeCalendar();
    });

    // Update button text on window resize
    window.addEventListener('resize', () => {
        updateThemeButtonText();
        updateShareButtonsText();
        updateCalendarButtonText();
    });
}

function setCategory(category) {
    STATE.currentCategory = category;

    // Update UI active state (radio button)
    const radio = document.querySelector(`input[name="category"][value="${category}"]`);
    if (radio) radio.checked = true;

    renderBoard();
}

// Start
// --- Sharing & Crypto Logic ---

async function handleShareBoard() {
    const groupIdeas = STATE.ideas.filter(idea => idea.category === 'Grupales');

    if (groupIdeas.length === 0) {
        alert('No hay ideas en la categoría "Grupales" para compartir.');
        return;
    }

    const password = prompt('Escoge una contraseña para proteger este tablero grupal:');
    if (!password) return;

    try {
        const encryptedData = await encryptData(groupIdeas, password);
        downloadFile('tablero_grupales.lock', encryptedData);
    } catch (error) {
        console.error('Error in encryption:', error);
        alert('Error al encriptar el tablero.');
    }
}

async function handleOpenSharedBoard(e) {
    const file = e.target.files[0];
    if (!file) return;

    const password = prompt('Introduce la contraseña para abrir este tablero:');
    if (!password) {
        e.target.value = ''; // Reset input
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (event) {
        try {
            const encryptedContent = event.target.result;
            const decryptedIdeas = await decryptData(encryptedContent, password);

            // Verify password is correct by trying to decrypt first? 
            // Logic is: user provides password for FILE. We use that same password for SESSION persistence.

            // Allow saving of this session
            STATE.sessionPassword = password;
            saveState(); // Save immediately as "Shared Session" to persistence

            // Success
            loadSharedBoard(decryptedIdeas);
        } catch (error) {
            console.error(error);
            alert('Contraseña incorrecta o archivo dañado.');
        } finally {
            e.target.value = ''; // Reset input
        }
    };
    reader.readAsText(file);
}

function loadSharedBoard(ideas) {
    STATE.ideas = ideas;
    STATE.isSharedSession = true;

    // Update UI to reflect shared state
    document.title = "Tablero Compartido";
    document.querySelector('header h1').innerHTML = "🔒 Tablero Compartido";
    document.querySelector('header h1').style.color = "#F87171"; // Reddish to indicate warning/special state

    // Refresh board
    setCategory('all');
    renderBoard();

    // alert('Has abierto un tablero compartido. ¡Cuidado! Los cambios que hagas aquí NO se guardarán permanentemente.');
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Crypto Helpers (Web Crypto API) ---

async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptData(data, password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(JSON.stringify(data))
    );

    // Pack everything into a JSON string
    return JSON.stringify({
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(ciphertext))
    });
}

async function decryptData(encryptedJson, password) {
    const data = JSON.parse(encryptedJson);
    const salt = new Uint8Array(data.salt);
    const iv = new Uint8Array(data.iv);
    const ciphertext = new Uint8Array(data.ciphertext);
    const key = await deriveKey(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
}

document.addEventListener('DOMContentLoaded', init);
