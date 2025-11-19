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

const REPO_URL = 'https://github.com/homielab/ai-studio-desktop/issues'
const URL_AISTUDIO = 'https://aistudio.google.com/'
const URL_GEMINI = 'https://gemini.google.com/'

const modePath = path.join(app.getPath('userData'), '.mode')
let currentMode = 'aistudio' // Default fallback

try {
  if (fs.existsSync(modePath)) {
    currentMode = fs.readFileSync(modePath, 'utf8').trim()
  }
} catch (e) {
  console.error('Failed to load mode', e)
}

const FIREFOX_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0'

const getChromeUserAgent = () => {
  const version = '142.0.0.0'
  if (process.platform === 'darwin') {
    // macOS
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`
  } else if (process.platform === 'win32') {
    // Windows
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`
  } else {
    // Linux
    return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`
  }
}

const CHROME_USER_AGENT = getChromeUserAgent()

let mainWindow
let tray
let shortcutsWindow = null
let isQuitting = false

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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      userAgent: CHROME_USER_AGENT
    }
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
        .key { 
            background-color: #fff; 
            border: 1px solid #ccc; 
            border-radius: 4px; 
            padding: 2px 6px; 
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; 
            font-weight: bold; 
            font-size: 0.85em;
            box-shadow: 0 2px 0 rgba(0,0,0,0.1);
        }
        .footer { text-align: center; margin-top: 25px; font-size: 0.8em; color: #999; }
      </style>
    </head>
    <body>
      <h2>⌨️ Shortcuts Guide</h2>
      <table>
        <tr><th>Action</th><th>Shortcut</th></tr>
        <tr><td>Toggle Window</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">Shift</span> + <span class="key">A</span></td></tr>
        <tr><td>New Chat</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">Shift</span> + <span class="key">N</span></td></tr>
        <tr><td>Toggle "Always on Top"</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">T</span></td></tr>
        <tr><td>Quit App</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">Q</span></td></tr>
        <tr><td>Zoom In/Out</td><td><span class="key">Cmd/Ctrl</span> + <span class="key">+/-</span></td></tr>
      </table>
      <div class="footer">
        (Press ESC to close)
      </div>
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
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CommandOrControl+Shift+N',
          click: () => {
            const newChatUrl =
              currentMode === 'aistudio'
                ? 'https://aistudio.google.com/prompts/new_chat'
                : 'https://gemini.google.com/app'
            mainWindow.loadURL(newChatUrl)
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CommandOrControl+Q',
          click: () => {
            isQuitting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Switch Mode (AI Studio / Gemini)',
          click: switchMode
        },
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
        { role: 'selectAll' }
      ]
    },

    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: createShortcutsWindow
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify()
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              message: 'Checking for updates...',
              buttons: ['OK']
            })
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
              detail:
                'This will sign you out, clear cache, and reset your settings to default (First Run).',
              cancelId: 0
            })

            if (response === 1) {
              await session.defaultSession.clearCache()
              await session.defaultSession.clearStorageData()

              try {
                const firstRunPath = path.join(
                  app.getPath('userData'),
                  '.first-run-complete'
                )
                const modeFile = path.join(app.getPath('userData'), '.mode')
                if (fs.existsSync(firstRunPath)) fs.unlinkSync(firstRunPath)
                if (fs.existsSync(modeFile)) fs.unlinkSync(modeFile)
              } catch (e) {
                console.error(e)
              }

              app.relaunch()
              app.exit(0)
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
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Google AI Studio (Unofficial)',
              detail: `Version: ${app.getVersion()}\n\nMode: ${
                currentMode === 'aistudio' ? 'AI Studio' : 'Gemini'
              }\n\nDeveloped by Homielab.\nNot affiliated with Google.`,
              buttons: ['OK'],
              icon: path.join(__dirname, 'icon.png')
            })
          }
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

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
          autoUpdater.quitAndInstall()
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

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()

    const newChatUrl =
      currentMode === 'aistudio'
        ? 'https://aistudio.google.com/prompts/new_chat'
        : 'https://gemini.google.com/app'

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
      // 1. Ask the user for their preferred mode
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Google AI Studio', 'Google Gemini'],
        defaultId: 0,
        title: 'Choose Your Interface',
        message: 'Welcome! Which interface do you want to use?',
        detail: 'You can switch between them later in the View menu.',
        icon: path.join(__dirname, 'icon.png')
      })

      // 2. Update mode based on choice (0 = AI Studio, 1 = Gemini)
      currentMode = choice === 1 ? 'gemini' : 'aistudio'

      // 3. Save preference
      fs.writeFileSync(modePath, currentMode)

      // 4. Reload window with the chosen URL
      const targetUrl = currentMode === 'aistudio' ? URL_AISTUDIO : URL_GEMINI
      mainWindow.loadURL(targetUrl)
      mainWindow.setTitle(
        currentMode === 'aistudio'
          ? 'Google AI Studio (Unofficial)'
          : 'Google Gemini (Unofficial)'
      )

      // 5. Mark first run as complete
      fs.writeFileSync(flagPath, 'true')

      // 6. Show shortcuts guide
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
