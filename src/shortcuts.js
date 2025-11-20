const { BrowserWindow } = require('electron')

let shortcutsWindow = null

function createShortcutsWindow(mainWindow) {
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

module.exports = { createShortcutsWindow }
