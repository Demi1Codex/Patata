document.getElementById('create').addEventListener('click', async () => {
    const title = document.getElementById('title').value.trim();
    const desc = document.getElementById('desc').value.trim();
    const category = document.getElementById('category').value; // Get selected category

    if (!title) {
        alert('Por favor, escribe un título para la idea.');
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check if tab is valid
        if (!tab || !tab.id) {
            alert('Error: No se pudo identificar la pestaña activa.');
            return;
        }

        // Execute script
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (titleStr, descStr, categoryStr) => {
                // Ensure we are in the context of the Patata app
                if (!window.STATE || !window.STATE.ideas) {
                    return { success: false, error: 'No se encontró el tablero en esta página. Asegúrate de estar en la página de Patata (index.html).' };
                }

                try {
                    const newIdea = {
                        id: Date.now().toString(),
                        title: titleStr,
                        description: descStr,
                        status: 'progress',
                        category: categoryStr, // Use passed category
                        image: null,
                        createdAt: new Date().toISOString()
                    };

                    window.STATE.ideas.push(newIdea);

                    if (window.saveState) {
                        window.saveState();
                        if (window.renderBoard) window.renderBoard(); // Update UI if page is visible
                    }
                    return { success: true };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            },
            args: [title, desc, category]
        });

        // Handle result
        if (result && result[0]) {
            const response = result[0].result;
            if (response && response.success) {
                window.close();
            } else {
                alert(response.error || 'Error desconocido al procesar la idea.');
            }
        }

    } catch (err) {
        console.error(err);
        // This catch block handles the "Cannot access contents of page" error (permissions)
        const msg = err.message || err.toString();

        if (msg.includes('Cannot access contents of the page') || msg.includes('access to file URLs')) {
            alert('ERROR DE PERMISOS:\n\nChrome impide que la extensión acceda a esta página de archivo local.\n\nSOLUCIÓN:\n1. Ve a chrome://extensions\n2. Busca "Patata Quick Idea Creator"\n3. Activa "Permitir acceso a URLs de archivo" (Allow access to file URLs).\n4. Recarga esta página y prueba de nuevo.');
        } else {
            alert('Error de conexión con la página:\n' + msg);
        }
    }
});
