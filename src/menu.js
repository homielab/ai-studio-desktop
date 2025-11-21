const { Menu, shell, dialog, session } = require('electron')
const { autoUpdater } = require('electron-updater')
const { REPO_URL, isMac } = require('./config')
const path = require('path')
const fs = require('fs')

function createMenu({
  app,
  mainWindow,
  switchMode,
  performNewChat,
  toggleSearch,
  createShortcutsWindow,
  showAbout,
  onQuit
}) {
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
                click: onQuit
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
                click: onQuit
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
          click: () => toggleSearch(mainWindow)
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => createShortcutsWindow(mainWindow)
        },
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
        }
      ]
    }
  ]

  if (!isMac) {
    template[3].submenu.push(
      { type: 'separator' },
      { label: 'About', click: showAbout }
    )
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

module.exports = { createMenu }
