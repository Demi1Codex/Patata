document.getElementById('create').addEventListener('click', async () => {
    const title = document.getElementById('title').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const notify = date ? 'true' : 'false';

    if (!title) {
        alert('Por favor, escribe un título para la idea.');
        return;
    }

    const newIdea = {
        id: Date.now().toString(),
        title: title,
        description: desc,
        status: 'progress',
        category: category,
        date: date || null,
        notify: notify,
        image: null,
        createdAt: new Date().toISOString()
    };

    const TARGET_URL = 'https://demi1codex.github.io/Patata/';

    try {
        // 1. Find if Patata is already open
        const tabs = await chrome.tabs.query({ url: TARGET_URL + '*' });
        let targetTab = tabs.length > 0 ? tabs[0] : null;

        // 2. If not open, open it in background
        if (!targetTab) {
            targetTab = await chrome.tabs.create({ url: TARGET_URL, active: false });

            // Wait for it to load
            await new Promise((resolve) => {
                const listener = (tabId, changeInfo) => {
                    if (tabId === targetTab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
            });
        }

        // 3. Keep waiting a bit if it was just opened or found to ensure JS is ready
        if (!targetTab || !targetTab.id) {
            alert('Error: No se pudo conectar con la pestaña de Patata.');
            return;
        }

        // 4. Inject script
        const result = await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: (ideaData) => {
                const STATE_KEY = 'ideaBoardData';
                let currentState = { ideas: [], theme: 'dark', isSharedSession: false };

                try {
                    const stored = localStorage.getItem(STATE_KEY);
                    if (stored) {
                        currentState = JSON.parse(stored);
                    }
                } catch (e) {
                    console.error('Error reading localStorage:', e);
                }

                if (!currentState.ideas || !Array.isArray(currentState.ideas)) {
                    currentState.ideas = [];
                }

                currentState.ideas.push(ideaData);

                localStorage.setItem(STATE_KEY, JSON.stringify(currentState));

                if (window.STATE) {
                    window.STATE.ideas = currentState.ideas;
                    if (window.renderBoard) {
                        window.renderBoard();
                    }
                }

                return { success: true };
            },
            args: [newIdea]
        });

        if (result && result[0] && result[0].result && result[0].result.success) {
            window.close();
        } else {
            alert('Hubo un error al guardar la idea. Intenta de nuevo.');
        }

    } catch (err) {
        console.error(err);
        alert('Error: ' + err.toString());
    }
});
