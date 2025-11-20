const {
  app,
  BrowserWindow,
  shell,
  session,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
  dialog
} = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
  return
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('disable-site-isolation-trials')

const REPO_URL = 'https://github.com/homielab/ai-studio-desktop/issues'
const URL_AISTUDIO = 'https://aistudio.google.com'
const URL_AISTUDIO_NEW_CHAT = `${URL_AISTUDIO}/prompts/new_chat`
const URL_GEMINI = 'https://gemini.google.com'
const URL_GEMINI_NEW_CHAT = `${URL_GEMINI}/app`
const isMac = process.platform === 'darwin'

const modePath = path.join(app.getPath('userData'), '.mode')
let currentMode = 'aistudio'

try {
  if (fs.existsSync(modePath)) {
    currentMode = fs.readFileSync(modePath, 'utf8').trim()
  }
} catch (e) {
  console.error('Failed to load mode', e)
}

const getFirefoxUserAgent = () => {
  if (process.platform === 'darwin') {
    return 'Macintosh; Intel Mac OS X 10.15'
  } else if (process.platform === 'win32') {
    return 'Windows NT 10.0; Win64; x64'
  } else {
    return 'X11; Linux x86_64'
  }
}

const getChromeUserAgent = () => {
  if (process.platform === 'darwin') {
    return `Macintosh; Intel Mac OS X 10_15_7`
  } else if (process.platform === 'win32') {
    return `Windows NT 10.0; Win64; x64`
  } else {
    return `X11; Linux x86_64`
  }
}

const FIREFOX_USER_AGENT = `Mozilla/5.0 (${getFirefoxUserAgent()}; rv:145.0) Gecko/20100101 Firefox/145.0`
const CHROME_USER_AGENT = `Mozilla/5.0 (${getChromeUserAgent()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`

let mainWindow
let tray
let shortcutsWindow = null
let isQuitting = false

function toggleSearch() {
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

function switchMode() {
  if (currentMode === 'aistudio') {
    currentMode = 'gemini'
  } else {
    currentMode = 'aistudio'
  }

  fs.writeFileSync(modePath, currentMode)

  const targetUrl = currentMode === 'aistudio' ? URL_AISTUDIO : URL_GEMINI
  mainWindow.loadURL(targetUrl)

  mainWindow.setTitle(
    currentMode === 'aistudio'
      ? 'Google AI Studio (Unofficial)'
      : 'Google Gemini (Unofficial)'
  )
}

function performNewChat() {
  const newChatUrl =
    currentMode === 'aistudio' ? URL_AISTUDIO_NEW_CHAT : URL_GEMINI_NEW_CHAT
  mainWindow.loadURL(newChatUrl)
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      setTimeout(() => { 
          const input = document.querySelector('textarea, [contenteditable="true"], .ql-editor'); 
          if (input) { input.focus(); input.click(); } 
      }, 800); 
    `)
  })
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About',
    message: 'Google AI Studio (Unofficial)',
    detail: `Version: ${app.getVersion()}\n\nMode: ${
      currentMode === 'aistudio' ? 'AI Studio' : 'Gemini'
    }\n\nDeveloped by Homielab.com\nNot affiliated with Google.`,
    buttons: ['OK'],
    icon: path.join(__dirname, 'icon.png')
  })
}

function createShortcutsWindow() {
  if (shortcutsWindow) {
    shortcutsWindow.focus()
    return
  }

  shortcutsWindow = new BrowserWindow({
    width: 500,
    height: 460,
    title: 'Keyboard Shortcuts',
    autoHideMenuBar: true,
    parent: mainWindow,
    modal: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })

  shortcutsWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      event.preventDefault()
      shortcutsWindow.close()
    }
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; background-color: #f5f5f5; color: #333; user-select: none; cursor: default; }
        @media (prefers-color-scheme: dark) {
          body { background-color: #222; color: #eee; }
          th { border-bottom: 1px solid #444 !important; }
          .key { background-color: #444 !important; border: 1px solid #555 !important; color: #eee; }
        }
        h2 { margin-top: 0; margin-bottom: 20px; font-size: 1.2em; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
        th { color: #888; font-weight: 600; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; }
        tr:last-child td { border-bottom: none; }
        .key { background-color: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 2px 6px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-weight: bold; font-size: 0.85em; box-shadow: 0 2px 0 rgba(0,0,0,0.1); }
        .footer { text-align: center; margin-top: 25px; font-size: 0.8em; color: #999; }
      </style>
    </head>
    <body>
      <h2>⌨️ Shortcuts Guide</h2>
      <table>
        <tr><th>Action</th><th>Shortcut</th></tr>
        <tr><td>Toggle Window</td><td><span class="key">Ctrl</span> + <span class="key">Shift</span> + <span class="key">A</span></td></tr>
        <tr><td>New Chat</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">N</span></td></tr>
        <tr><td>Switch Mode</td><td>(Menu) View -> Switch Mode</td></tr>
        <tr><td>Always on Top</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">T</span></td></tr>
        <tr><td>Quit App</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">Q</span></td></tr>
      </table>
      <div class="footer">(Press ESC to close)</div>
    </body>
    </html>
  `
  const base64Html = Buffer.from(htmlContent).toString('base64')
  shortcutsWindow.loadURL(`data:text/html;base64,${base64Html}`)
  shortcutsWindow.on('closed', () => {
    shortcutsWindow = null
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title:
      currentMode === 'aistudio'
        ? 'Google AI Studio (Unofficial)'
        : 'Google Gemini (Unofficial)',
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      userAgent: CHROME_USER_AGENT
    }
  })

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: 'About Google AI Studio (Unofficial)',
                click: showAbout
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              {
                label: 'Quit',
                accelerator: 'Command+Q',
                click: () => {
                  isQuitting = true
                  app.quit()
                }
              }
            ]
          }
        ]
      : []),

    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CommandOrControl+N',
          click: performNewChat
        },
        { type: 'separator' },
        ...(isMac
          ? [{ role: 'close' }]
          : [
              {
                label: 'Quit',
                accelerator: 'Ctrl+Q',
                click: () => {
                  isQuitting = true
                  app.quit()
                }
              }
            ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Switch Mode (AI Studio / Gemini)', click: switchMode },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          accelerator: 'CommandOrControl+T',
          click: () => {
            const isTop = mainWindow.isAlwaysOnTop()
            mainWindow.setAlwaysOnTop(!isTop)
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CommandOrControl+F',
          click: toggleSearch
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts', click: createShortcutsWindow },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: async () => {
            try {
              const result = await autoUpdater.checkForUpdates()
              if (result && result.updateInfo.version === app.getVersion()) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'No Updates',
                  message: `You are on the latest version (${app.getVersion()}).`,
                  buttons: ['OK']
                })
              }
            } catch (error) {
              dialog.showErrorBox(
                'Update Check Failed',
                error.message || 'An unknown error occurred.'
              )
            }
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal(REPO_URL)
          }
        },
        { type: 'separator' },
        {
          label: 'Reset App Data',
          click: async () => {
            const { response } = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Reset & Restart'],
              defaultId: 1,
              title: 'Reset App Data?',
              message: 'Are you sure you want to reset all app data?',
              detail: 'This will sign you out and reset settings.',
              cancelId: 0
            })

            if (response === 1) {
              await session.defaultSession.clearCache()
              await session.defaultSession.clearStorageData()
              try {
                if (
                  fs.existsSync(
                    path.join(app.getPath('userData'), '.first-run-complete')
                  )
                )
                  fs.unlinkSync(
                    path.join(app.getPath('userData'), '.first-run-complete')
                  )
                if (fs.existsSync(path.join(app.getPath('userData'), '.mode')))
                  fs.unlinkSync(path.join(app.getPath('userData'), '.mode'))
              } catch (e) {}
              app.relaunch()
              app.exit(0)
            }
          }
        },
        ...(isMac
          ? []
          : [{ type: 'separator' }, { label: 'About', click: showAbout }])
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  const filter = { urls: ['*://accounts.google.com/*'] }
  session.defaultSession.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      details.requestHeaders['User-Agent'] = FIREFOX_USER_AGENT
      if (details.requestHeaders['sec-ch-ua'])
        delete details.requestHeaders['sec-ch-ua']
      if (details.requestHeaders['sec-ch-ua-mobile'])
        delete details.requestHeaders['sec-ch-ua-mobile']
      if (details.requestHeaders['sec-ch-ua-platform'])
        delete details.requestHeaders['sec-ch-ua-platform']
      if (details.requestHeaders['X-User-Agent'])
        delete details.requestHeaders['X-User-Agent']
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT)
  mainWindow.loadURL(currentMode === 'aistudio' ? URL_AISTUDIO : URL_GEMINI)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('accounts.google.com') ||
      url.includes('aistudio.google.com') ||
      url.includes('gemini.google.com')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          userAgent: CHROME_USER_AGENT
        }
      }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png')

  try {
    let nImage = nativeImage.createFromPath(iconPath)

    nImage = nImage.resize({ width: 16, height: 16 })

    tray = new Tray(nImage)

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])

    tray.setToolTip('Google AI Studio (Unofficial)')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  } catch (e) {
    console.log('Tray icon failed to load:', e)
  }
}

function setupAutoUpdater() {
  autoUpdater.logger = require('electron-log')
  autoUpdater.logger.transports.file.level = 'info'
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message:
          'A new version has been downloaded. Restart the app to apply the updates?',
        buttons: ['Restart', 'Later']
      })
      .then((result) => {
        if (result.response === 0) {
          isQuitting = true
          if (tray) {
            tray.destroy()
          }
          autoUpdater.quitAndInstall(true, true)
        }
      })
  })
}

app.on('ready', () => {
  //* fs.unlinkSync(path.join(app.getPath('userData'), '.first-run-complete'));
  app.userAgentFallback = CHROME_USER_AGENT
  createWindow()
  createTray()

  setupAutoUpdater()

  globalShortcut.register('Control+Shift+A', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  globalShortcut.register('Control+Shift+N', () => {
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()

    const newChatUrl =
      currentMode === 'aistudio' ? URL_AISTUDIO_NEW_CHAT : URL_GEMINI_NEW_CHAT

    if (mainWindow.webContents.getURL() !== newChatUrl) {
      mainWindow.loadURL(newChatUrl)
    }

    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        setTimeout(() => {
            const input = document.querySelector('textarea, [contenteditable="true"], .ql-editor');
            if (input) {
                input.focus();
                input.click(); 
            }
        }, 800); 
      `)
    })
  })

  const flagPath = path.join(app.getPath('userData'), '.first-run-complete')

  if (!fs.existsSync(flagPath)) {
    try {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Google AI Studio', 'Google Gemini'],
        defaultId: 0,
        title: 'Choose Your Interface',
        message: 'Welcome! Which interface do you want to use?',
        detail: 'You can switch between them later in the View menu.',
        icon: path.join(__dirname, 'icon.png')
      })

      currentMode = choice === 1 ? 'gemini' : 'aistudio'

      fs.writeFileSync(modePath, currentMode)

      const targetUrl = currentMode === 'aistudio' ? URL_AISTUDIO : URL_GEMINI
      mainWindow.loadURL(targetUrl)
      mainWindow.setTitle(
        currentMode === 'aistudio'
          ? 'Google AI Studio (Unofficial)'
          : 'Google Gemini (Unofficial)'
      )

      fs.writeFileSync(flagPath, 'true')

      setTimeout(() => {
        createShortcutsWindow()
      }, 1000)
    } catch (e) {
      console.error('First run error:', e)
    }
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
