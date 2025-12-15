/**
 * App Logic for Idea Board
 * Handles theme toggling, data persistence, and UI rendering.
 */

// State Management
const STATE = {
    ideas: [],
    theme: 'dark'
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
    imagePreview: document.getElementById('imagePreview')
};

// --- Initialization ---

function init() {
    loadState();
    applyTheme();
    renderBoard();
    setupEventListeners();
}

// --- Data Persistence ---

function loadState() {
    const savedData = localStorage.getItem('ideaBoardData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        STATE.ideas = parsed.ideas || [];
        STATE.theme = parsed.theme || 'dark';
    }
}

function saveState() {
    localStorage.setItem('ideaBoardData', JSON.stringify(STATE));
    // In a real backend app, this would be a POST/PUT request to a file/DB
    console.log('Data saved to local storage (simulating file save).');
}

// --- Theme Management ---

function applyTheme() {
    document.documentElement.setAttribute('data-theme', STATE.theme);
    const icon = STATE.theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    if (elements.themeToggle) elements.themeToggle.innerText = icon;
}

function toggleTheme() {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
}

// --- Board Rendering ---

function renderBoard() {
    // Clear lists
    elements.progressList.innerHTML = '';
    elements.pausedList.innerHTML = '';

    STATE.ideas.forEach(idea => {
        const card = createIdeaCard(idea);
        if (idea.status === 'progress') {
            elements.progressList.appendChild(card);
        } else {
            elements.pausedList.appendChild(card);
        }
    });

    updateCounts();
}

function createIdeaCard(idea) {
    const div = document.createElement('div');
    div.className = `idea-card ${idea.status}`;
    div.id = idea.id;

    const imageHtml = idea.image ? `<img src="${idea.image}" class="card-image" alt="Idea attachment">` : '';

    div.innerHTML = `
        ${imageHtml}
        <div class="card-title">${escapeHtml(idea.title)}</div>
        <p class="card-desc">${escapeHtml(idea.description)}</p>
        <div class="card-actions">
            <button class="btn-icon" onclick="deleteIdea('${idea.id}')" title="Delete">
                🗑️
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

function updateCounts() {
    const progressCount = STATE.ideas.filter(i => i.status === 'progress').length;
    const pausedCount = STATE.ideas.filter(i => i.status === 'paused').length;

    document.getElementById('progressCount').innerText = progressCount;
    document.getElementById('pausedCount').innerText = pausedCount;
}

// --- Item Management ---

function addIdea(e) {
    e.preventDefault();

    const title = document.getElementById('ideaTitle').value;
    const description = document.getElementById('ideaDesc').value;
    const status = document.getElementById('ideaStatus').value;
    const imageFile = document.getElementById('ideaImage').files[0];

    const newIdea = {
        id: Date.now().toString(),
        title,
        description,
        status,
        image: null,
        createdAt: new Date().toISOString()
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (event) {
            newIdea.image = event.target.result; // Save base64 string
            saveIdeaAndClose(newIdea);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveIdeaAndClose(newIdea);
    }
}

function saveIdeaAndClose(idea) {
    STATE.ideas.push(idea);
    saveState();
    renderBoard();
    closeModal();
    elements.ideaForm.reset();
}

// Global functions for inline onclick handlers
window.deleteIdea = function (id) {
    if (confirm('Are you sure you want to delete this idea?')) {
        STATE.ideas = STATE.ideas.filter(i => i.id !== id);
        saveState();
        renderBoard();
    }
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

function openModal() {
    elements.modal.classList.add('open');
    document.getElementById('ideaTitle').focus();
}

function closeModal() {
    elements.modal.classList.remove('open');
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
}

// Start
document.addEventListener('DOMContentLoaded', init);
