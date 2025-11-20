function toggleSearch(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const code = `
    (function() {
      try {
        const id = 'electron-custom-search-bar';
        let bar = document.getElementById(id);
        
        if (bar) {
          bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
          if (bar.style.display === 'flex') {
             const input = document.getElementById('electron-search-input');
             if(input) { input.focus(); input.select(); }
          }
          return;
        }

        bar = document.createElement('div');
        bar.id = id;
        Object.assign(bar.style, {
          position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#2b2b2b', padding: '10px', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: '1px solid #555',
          fontFamily: 'system-ui, sans-serif'
        });

        const input = document.createElement('input');
        input.id = 'electron-search-input';
        input.placeholder = 'Find...';
        Object.assign(input.style, {
          padding: '6px 8px', borderRadius: '4px', border: '1px solid #555',
          backgroundColor: '#1e1e1e', color: '#fff', outline: 'none', width: '180px',
          fontSize: '14px'
        });

        const btnGroup = document.createElement('div');
        Object.assign(btnGroup.style, { display: 'flex', gap: '4px' });

        const createBtn = (text, onClick) => {
          const btn = document.createElement('button');
          btn.innerText = text;
          btn.onclick = onClick;
          Object.assign(btn.style, {
            background: 'transparent', border: '1px solid #444', color: '#ccc',
            cursor: 'pointer', padding: '4px 8px', borderRadius: '4px',
            fontSize: '12px', fontWeight: 'bold'
          });
          btn.onmouseover = () => btn.style.background = '#444';
          btn.onmouseout = () => btn.style.background = 'transparent';
          return btn;
        };

        const doSearch = (rev) => {
           const val = input.value;
           if(val) {
              // 1. Perform the find
              const found = window.find(val, false, rev, true);
              
              // 2. Force Scroll to View
              if (found) {
                 const selection = window.getSelection();
                 if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    // Get the actual element wrapping the text
                    const el = range.startContainer.parentElement;
                    
                    // Smoothly scroll that specific element to the center of the screen
                    if(el) {
                        el.scrollIntoView({
                            behavior: 'smooth', 
                            block: 'center', 
                            inline: 'center'
                        });
                        
                        // Optional: Flash a highlight effect
                        const originalBg = el.style.backgroundColor;
                        el.style.transition = "background-color 0.3s";
                        el.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
                        setTimeout(() => {
                            el.style.backgroundColor = originalBg;
                        }, 500);
                    }
                 }
              }
           }
        };

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
             e.preventDefault();
             doSearch(e.shiftKey);
          }
          if (e.key === 'Escape') bar.style.display = 'none';
        });

        btnGroup.appendChild(createBtn('▲', () => doSearch(true)));
        btnGroup.appendChild(createBtn('▼', () => doSearch(false)));
        
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        Object.assign(closeBtn.style, {
           background: 'transparent', border: 'none', color: '#888', 
           cursor: 'pointer', marginLeft: '8px', fontSize: '16px'
        });
        closeBtn.onclick = () => bar.style.display = 'none';

        bar.appendChild(input);
        bar.appendChild(btnGroup);
        bar.appendChild(closeBtn);
        
        document.body.appendChild(bar);
        input.focus();

      } catch (e) {
        console.error("Search Bar Error:", e);
      }
    })();
  `

  mainWindow.webContents.executeJavaScript(code).catch((err) => {
    console.log('Failed to inject search bar:', err)
  })
}

module.exports = { toggleSearch }
