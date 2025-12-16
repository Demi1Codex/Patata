(function () {
    console.log('Patata Quick Idea Creator loaded');
    const btn = document.createElement('button');
    btn.id = 'quickIdeaBtn';
    btn.textContent = '✏️ Idea Rápida';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = 9999;
    btn.style.padding = '8px 12px';
    btn.style.background = '#3b82f6';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    btn.style.cursor = 'pointer';
    document.body.appendChild(btn);

    const modal = document.createElement('div');
    modal.id = 'quickIdeaModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'none';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 10000;
    modal.innerHTML = `
    <div style="background:#fff;padding:20px;border-radius:8px;max-width:90%;width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
      <h3 style="margin-top:0;">Crear Idea</h3>
      <input id="quickIdeaTitle" type="text" placeholder="Título" style="width:100%;margin-bottom:8px;padding:6px;"/>
      <textarea id="quickIdeaDesc" placeholder="Descripción" rows="3" style="width:100%;margin-bottom:8px;padding:6px;"></textarea>
      <div style="text-align:right;">
        <button id="quickIdeaCancel" style="margin-right:8px;">Cancelar</button>
        <button id="quickIdeaSubmit">Crear</button>
      </div>
    </div>`;
    document.body.appendChild(modal);

    btn.addEventListener('click', () => { modal.style.display = 'flex'; });
    document.getElementById('quickIdeaCancel').addEventListener('click', () => { modal.style.display = 'none'; });
    document.getElementById('quickIdeaSubmit').addEventListener('click', () => {
        const title = document.getElementById('quickIdeaTitle').value.trim();
        const desc = document.getElementById('quickIdeaDesc').value.trim();
        if (!title) { alert('El título es obligatorio'); return; }
        const script = document.createElement('script');
        script.textContent = `
      (function(){
        const idea = { title: ${JSON.stringify(title)}, description: ${JSON.stringify(desc)} };
        const form = document.getElementById('ideaForm');
        if (form) {
          document.getElementById('ideaTitle').value = ${JSON.stringify(title)};
          document.getElementById('ideaDesc').value = ${JSON.stringify(desc)};
          form.dispatchEvent(new Event('submit'));
        } else if (window.STATE) {
          const newIdea = { id: Date.now().toString(), title: ${JSON.stringify(title)}, description: ${JSON.stringify(desc)}, status: 'progress', category: 'General', image: null, createdAt: new Date().toISOString() };
          window.STATE.ideas.push(newIdea);
          if (window.saveState) window.saveState();
        }
      })();
    `;
        document.head.appendChild(script);
        script.remove();
        modal.style.display = 'none';
        document.getElementById('quickIdeaTitle').value = '';
        document.getElementById('quickIdeaDesc').value = '';
    });
})();
