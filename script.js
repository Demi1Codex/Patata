////////////////////////////////////////////////////////////////////////////////
// STATE MANAGEMENT
////////////////////////////////////////////////////////////////////////////////

const STORAGE_KEY = 'borrachos_docx_ideas';
const THEME_KEY = 'borrachos_docx_theme';

// Default state
let ideas = [];

/**
 * Load data from localStorage
 */
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            ideas = JSON.parse(data);
        } catch (e) {
            console.error('Error parsing data', e);
            ideas = [];
        }
    }
}

/**
 * Save data to localStorage
 */
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
}

////////////////////////////////////////////////////////////////////////////////
// THEME MANAGEMENT
////////////////////////////////////////////////////////////////////////////////

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    
    // Simple text change or SVG swap. Let's use text/emoji for now as per minimal requirement
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

////////////////////////////////////////////////////////////////////////////////
// UI RENDERING
////////////////////////////////////////////////////////////////////////////////

function renderBoard() {
    const progressCol = document.getElementById('col-progress');
    const pausedCol = document.getElementById('col-paused');
    
    if (!progressCol || !pausedCol) return;
    
    progressCol.innerHTML = '';
    pausedCol.innerHTML = '';
    
    const progressIdeas = ideas.filter(i => i.status === 'progress');
    const pausedIdeas = ideas.filter(i => i.status === 'paused');
    
    // Update counts
    document.getElementById('count-progress').textContent = progressIdeas.length;
    document.getElementById('count-paused').textContent = pausedIdeas.length;

    renderColumn(progressCol, progressIdeas);
    renderColumn(pausedCol, pausedIdeas);
}

function renderColumn(container, list) {
    if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No hay ideas aquí...';
        container.appendChild(empty);
        return;
    }

    list.forEach(idea => {
        const card = document.createElement('div');
        card.className = `idea-card ${idea.status}`;
        card.dataset.id = idea.id;
        
        let imageHtml = '';
        if (idea.image) {
            imageHtml = `<img src="${idea.image}" alt="Imagen de idea" class="card-image" onerror="this.style.display='none'">`;
        }

        card.innerHTML = `
            ${imageHtml}
            <div class="card-content">
                <h3 class="card-title">${escapeHtml(idea.title)}</h3>
                <p class="card-desc">${escapeHtml(idea.description)}</p>
                <div class="card-actions">
                    <button class="btn-icon btn-delete" onclick="deleteIdea('${idea.id}')" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
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

////////////////////////////////////////////////////////////////////////////////
// ACTIONS
////////////////////////////////////////////////////////////////////////////////

function openModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('open');
    document.getElementById('idea-title').focus();
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open');
    document.getElementById('idea-form').reset();
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('idea-title').value.trim();
    const desc = document.getElementById('idea-desc').value.trim();
    const image = document.getElementById('idea-image').value.trim();
    const status = document.getElementById('idea-status').value; // 'progress' or 'paused'
    
    if (!title) return; // Validation
    
    const newIdea = {
        id: Date.now().toString(), // Simple ID
        title,
        description: desc,
        image,
        status,
        createdAt: new Date().toISOString()
    };
    
    ideas.push(newIdea);
    saveData();
    renderBoard();
    closeModal();
}

function deleteIdea(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta idea?')) {
        ideas = ideas.filter(i => i.id !== id);
        saveData();
        renderBoard();
    }
}

// Global scope exposure for inline onclicks
window.deleteIdea = deleteIdea;

////////////////////////////////////////////////////////////////////////////////
// INITIALIZATION
////////////////////////////////////////////////////////////////////////////////

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTheme();
    renderBoard();
    
    // Event Listeners
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
    document.getElementById('add-idea-btn').addEventListener('click', openModal);
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);
    document.getElementById('idea-form').addEventListener('submit', handleFormSubmit);
    
    // Close modal if clicking outside
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
            closeModal();
        }
    });
});
