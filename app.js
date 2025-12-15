/**
 * App Logic for Idea Board
 * Handles theme toggling, data persistence, and UI rendering.
 */

// State Management
const STATE = {
    ideas: [],
    theme: 'dark',
    currentCategory: 'all'
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
    imagePreview: document.getElementById('imagePreview'),
    categoryList: document.getElementById('categoryFilterList')
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
        elements.categoryList.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                const category = e.target.getAttribute('data-category');
                setCategory(category);
            }
        });
    }
}

function setCategory(category) {
    STATE.currentCategory = category;

    // Update UI active state
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderBoard();
}

// Start
document.addEventListener('DOMContentLoaded', init);
