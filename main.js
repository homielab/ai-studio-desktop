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
const REPO_URL = 'https://github.com/homielab/ai-studio-desktop/issues'

let mainWindow
let tray
let shortcutsWindow = null
let isQuitting = false

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
      contextIsolation: true
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
    title: 'Google AI Studio (Unofficial)',
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.dis

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CommandOrControl+Shift+N',
          click: () => {
            const newChatUrl = 'https://aistudio.google.com/prompts/new_chat'
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
              detail: `Version: ${app.getVersion()}\n\nA lightweight desktop client for Google AI Studio.\n\nDeveloped by Homielab.\nNot affiliated with Google.`,
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

  const filter = { urls: ['*://*.google.com/*', '*://accounts.google.com/*'] }
  session.defaultSession.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      details.requestHeaders['User-Agent'] = CHROME_USER_AGENT
      if (details.requestHeaders['Sec-CH-UA'])
        delete details.requestHeaders['Sec-CH-UA']
      if (details.requestHeaders['Sec-CH-UA-Mobile'])
        delete details.requestHeaders['Sec-CH-UA-Mobile']
      if (details.requestHeaders['Sec-CH-UA-Platform'])
        delete details.requestHeaders['Sec-CH-UA-Platform']
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT)
  mainWindow.loadURL('https://aistudio.google.com/')

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('accounts.google.com') ||
      url.includes('aistudio.google.com')
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

    const newChatUrl = 'https://aistudio.google.com/prompts/new_chat'
    if (mainWindow.webContents.getURL() !== newChatUrl) {
      mainWindow.loadURL(newChatUrl)
    }

    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        setTimeout(() => {
            const input = document.querySelector('textarea, [contenteditable="true"]');
            if (input) {
                input.focus();
                input.click(); 
            }
        }, 500); 
      `)
    })
  })

  const flagPath = path.join(app.getPath('userData'), '.first-run-complete')

  if (!fs.existsSync(flagPath)) {
    try {
      fs.writeFileSync(flagPath, 'true')

      setTimeout(() => {
        createShortcutsWindow()
      }, 1000)
    } catch (e) {
      console.error('Could not write first-run flag:', e)
    }
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
