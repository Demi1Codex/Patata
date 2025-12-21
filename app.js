/**
 * App Logic for Idea Board
 * Handles theme toggling, data persistence, and UI rendering.
 * Now includes local calendar support and notifications.
 */

// State Management
const STATE = {
    ideas: [],
    theme: 'dark',
    currentCategory: 'all',
    isSharedSession: false,
    sessionPassword: null,
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
    // Calendar & Notifications Elements
    calendarBtn: document.getElementById('calendarBtn'),
    calendarModal: document.getElementById('calendarModal'),
    requestNotifyBtn: document.getElementById('requestNotifyBtn'),
    notificationContainer: document.getElementById('notificationContainer'),
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

    // Start background event checker (every 1 second for precision)
    setInterval(checkUpcomingEvents, 1000);

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

// --- Local Calendar & Notifications Logic ---

function openCalendar() {
    elements.calendarModal.classList.add('open');
    renderCalendarEvents();
}

window.closeCalendar = function () {
    elements.calendarModal.classList.remove('open');
};

function updateCalendarButtonText() {
    if (!elements.calendarBtn) return;
    const isMobile = window.innerWidth <= 900;
    elements.calendarBtn.innerText = isMobile ? '📅' : '📅 Calendario';
}

function renderCalendarEvents() {
    if (!elements.eventsContainer) return;

    const datedIdeas = STATE.ideas
        .filter(idea => idea.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (datedIdeas.length === 0) {
        elements.eventsContainer.innerHTML = '<div class="empty-state">No hay eventos programados en tus ideas.</div>';
        return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groups = {
        past: [],
        today: [],
        tomorrow: [],
        future: []
    };

    datedIdeas.forEach(idea => {
        const d = new Date(idea.date);
        const ideaDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

        if (ideaDate < today) groups.past.push(idea);
        else if (ideaDate.getTime() === today.getTime()) groups.today.push(idea);
        else if (ideaDate.getTime() === tomorrow.getTime()) groups.tomorrow.push(idea);
        else groups.future.push(idea);
    });

    const renderGroup = (title, list) => {
        if (list.length === 0) return '';
        return `
            <div class="calendar-group">
                <div class="group-title">${title}</div>
                ${list.map(idea => {
            const time = new Date(idea.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(idea.date).toLocaleDateString([], { day: 'numeric', month: 'short' });
            return `
                        <div class="event-item">
                            <div class="event-time-badge">
                                <span class="time">${time}</span>
                                <span class="date">${date}</span>
                            </div>
                            <div class="event-details">
                                <div class="event-title">${escapeHtml(idea.title)}</div>
                                <div class="event-meta">
                                    <span class="category">${escapeHtml(idea.category)}</span>
                                    <span class="notify-icon">${idea.notify === 'true' ? '🔔 On' : '🔕 Off'}</span>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    };

    elements.eventsContainer.innerHTML = `
        <div class="calendar-header-info">📅 Listado de tareas programadas</div>
        ${renderGroup('Hoy', groups.today)}
        ${renderGroup('Mañana', groups.tomorrow)}
        ${renderGroup('Próximamente', groups.future)}
        ${renderGroup('Pasadas', groups.past)}
    `;
}

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("Este navegador no soporta notificaciones de escritorio.");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            showToast('¡Notificaciones activadas!');
            showNotification('Borrachos.docx', 'Ahora recibirás avisos de tus eventos locales aquí.');
        }
    });
}

function showNotification(title, message, description = '', date = '') {
    // Format full message for toast and system notification
    const fullMessage = `${message}${description ? '\n' + description : ''}${date ? '\n📅 ' + date : ''}`;

    // In-page notification (Toast)
    showToast(message, title, description, date);

    // System notification
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: `${description}\n📅 ${date}`,
            icon: 'palpueblo.png'
        });
    }
}

function showToast(message, title = 'Info', description = '', date = '') {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="notify-icon">🔔</div>
        <div class="notify-body">
            <div class="notify-header">${title}</div>
            <div class="notify-msg" style="font-weight: 600;">${message}</div>
            ${description ? `<div class="notify-msg" style="font-size: 0.8rem; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">${escapeHtml(description)}</div>` : ''}
            ${date ? `<div class="notify-msg" style="font-size: 0.75rem; color: var(--accent-color); font-weight: 700;">📅 ${date}</div>` : ''}
        </div>
    `;

    elements.notificationContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 8000); // Increased time to 8s so users can read the description
}

function checkUpcomingEvents() {
    const now = new Date();
    // Use a small window (e.g. 2 seconds) to avoid missing if the interval drifts slightly
    // but sessionStorage will prevent duplicates within that window.

    STATE.ideas.forEach(idea => {
        if (!idea.date || idea.notify !== 'true') return;

        const targetDate = new Date(idea.date);
        const diffMs = targetDate.getTime() - now.getTime();

        // Trigger if we are within 2 seconds of the event time (exact enough)
        // and we haven't notified for this specific one in this session.
        if (diffMs <= 0 && diffMs > -5000) { // If it passed in the last 5 seconds
            const eventKey = `notified_exact_${idea.id}`;
            if (!sessionStorage.getItem(eventKey)) {
                const dateStr = targetDate.toLocaleString();
                showNotification('¡Es Hora! ' + idea.title, 'Tu idea programada ya llegó:', idea.description, dateStr);
                sessionStorage.setItem(eventKey, 'true');
            }
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
            }
        } else {
            STATE.ideas = parsed.ideas || [];
        }
    }
}

async function saveState() {
    if (STATE.isSharedSession) {
        if (STATE.sessionPassword) {
            try {
                const encryptedString = await encryptData(STATE.ideas, STATE.sessionPassword);
                const payload = {
                    theme: STATE.theme,
                    isSharedSession: true,
                    encryptedData: encryptedString
                };
                localStorage.setItem('ideaBoardData', JSON.stringify(payload));
            } catch (e) {
                console.error("Error saving shared state:", e);
            }
        }
        return;
    }
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
    if (elements.shareBtn) elements.shareBtn.innerText = isMobile ? '📤' : '📤 Compartir';
    if (elements.openSharedBtn) elements.openSharedBtn.innerText = isMobile ? '📂' : '📂 Abrir';
}

// --- Board Rendering ---

function renderBoard() {
    elements.progressList.innerHTML = '';
    elements.pausedList.innerHTML = '';

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
    const dateHtml = idea.date ? `<div class="event-time" style="font-size: 0.75rem; margin-top: 0.5rem;">📅 ${new Date(idea.date).toLocaleString()} ${idea.notify === 'true' ? '🔔' : ''}</div>` : '';

    div.innerHTML = `
        ${imageHtml}
        <div class="category-badge">${escapeHtml(idea.category || 'General')}</div>
        <div class="card-title">${escapeHtml(idea.title)}</div>
        <p class="card-desc">${escapeHtml(idea.description)}</p>
        ${dateHtml}
        <div class="card-actions">
            <button class="btn-icon" onclick="deleteIdea('${idea.id}')" title="Delete">🗑️</button>
            <button class="btn-icon" onclick="editIdea('${idea.id}')" title="Edit">✏️</button>
            <button class="btn-icon" onclick="toggleStatus('${idea.id}')" title="Move">⇄</button>
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
    document.getElementById('progressCount').innerText = list.filter(i => i.status === 'progress').length;
    document.getElementById('pausedCount').innerText = list.filter(i => i.status === 'paused').length;
}

// --- Item Management ---

function addIdea(e) {
    e.preventDefault();

    const id = document.getElementById('ideaId').value;
    const title = document.getElementById('ideaTitle').value;
    const description = document.getElementById('ideaDesc').value;
    const status = document.getElementById('ideaStatus').value;
    const category = document.getElementById('ideaCategory').value;
    const date = document.getElementById('ideaDate').value;
    const notify = document.getElementById('ideaNotify').value;
    const imageFile = elements.imageInput ? elements.imageInput.files[0] : null;

    let existingIdea = id ? STATE.ideas.find(i => i.id === id) : null;

    const ideaData = {
        id: id || Date.now().toString(),
        title,
        description,
        status,
        category,
        date,
        notify,
        image: existingIdea ? existingIdea.image : null,
        createdAt: existingIdea ? existingIdea.createdAt : new Date().toISOString()
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (event) {
            ideaData.image = event.target.result;
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
}

window.deleteIdea = function (id) {
    if (confirm('¿Eliminar idea?')) {
        STATE.ideas = STATE.ideas.filter(i => i.id !== id);
        saveState();
        renderBoard();
    }
};

window.editIdea = function (id) {
    const idea = STATE.ideas.find(i => i.id === id);
    if (!idea) return;

    document.getElementById('ideaId').value = idea.id;
    document.getElementById('ideaTitle').value = idea.title;
    document.getElementById('ideaDesc').value = idea.description;
    document.getElementById('ideaStatus').value = idea.status;
    document.getElementById('ideaCategory').value = idea.category || 'Personal';
    document.getElementById('ideaDate').value = idea.date || '';
    document.getElementById('ideaNotify').value = idea.notify || 'true';

    document.querySelector('.modal-title').innerText = 'Editar Idea';
    openModal(false);
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
    elements.modal.addEventListener('click', (e) => { if (e.target === elements.modal) closeModal(); });
    if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', closeModal);
    elements.ideaForm.addEventListener('submit', addIdea);

    if (elements.categoryList) {
        elements.categoryList.addEventListener('change', (e) => {
            if (e.target.name === 'category') setCategory(e.target.value);
        });
    }

    if (elements.shareBtn) elements.shareBtn.addEventListener('click', handleShareBoard);
    if (elements.openSharedBtn) elements.openSharedBtn.addEventListener('click', () => elements.sharedFileInput.click());
    if (elements.sharedFileInput) elements.sharedFileInput.addEventListener('change', handleOpenSharedBoard);

    if (elements.calendarBtn) elements.calendarBtn.addEventListener('click', openCalendar);
    if (elements.requestNotifyBtn) elements.requestNotifyBtn.addEventListener('click', requestNotificationPermission);
    elements.calendarModal.addEventListener('click', (e) => { if (e.target === elements.calendarModal) closeCalendar(); });

    window.addEventListener('resize', () => {
        updateThemeButtonText();
        updateShareButtonsText();
        updateCalendarButtonText();
    });
}

function setCategory(category) {
    STATE.currentCategory = category;
    const radio = document.querySelector(`input[name="category"][value="${category}"]`);
    if (radio) radio.checked = true;
    renderBoard();
}

// --- Crypto Helpers ---

async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    return window.crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptData(data, password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data)));
    return JSON.stringify({ salt: Array.from(salt), iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) });
}

async function decryptData(encryptedJson, password) {
    const data = JSON.parse(encryptedJson);
    const salt = new Uint8Array(data.salt);
    const iv = new Uint8Array(data.iv);
    const ciphertext = new Uint8Array(data.ciphertext);
    const key = await deriveKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted));
}

async function handleShareBoard() {
    const groupIdeas = STATE.ideas.filter(idea => idea.category === 'Grupales');
    if (groupIdeas.length === 0) { alert('No hay ideas en la categoría "Grupales".'); return; }
    const password = prompt('Escoge una contraseña:');
    if (!password) return;
    try {
        const encryptedData = await encryptData(groupIdeas, password);
        const blob = new Blob([encryptedData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'tablero_grupales.lock';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { alert('Error al encriptar.'); }
}

async function handleOpenSharedBoard(e) {
    const file = e.target.files[0];
    if (!file) return;
    const password = prompt('Introduce la contraseña:');
    if (!password) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async function (event) {
        try {
            const decryptedIdeas = await decryptData(event.target.result, password);
            STATE.sessionPassword = password;
            STATE.ideas = decryptedIdeas;
            STATE.isSharedSession = true;
            document.title = "Tablero Compartido";
            document.querySelector('header h1').innerHTML = "🔒 Tablero Compartido";
            document.querySelector('header h1').style.color = "#F87171";
            setCategory('all'); renderBoard();
        } catch (error) { alert('Datos incorrectos.'); }
        finally { e.target.value = ''; }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', init);
