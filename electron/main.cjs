const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    title: 'Control de Horas',
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true
    }
  });

  // Load the built app index.html
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  // Set standard app menu
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Imprimir',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.print();
          }
        },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload' },
        { label: 'Forzar recarga', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Restablecer zoom', role: 'resetZoom' },
        { label: 'Aumentar zoom', role: 'zoomIn' },
        { label: 'Reducir zoom', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Pantalla completa', role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
