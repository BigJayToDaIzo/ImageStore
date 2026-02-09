const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

const PORT = 4321;
const URL = `http://localhost:${PORT}`;

// Start the Astro server
function startServer() {
  // In packaged builds, asarUnpack puts dist/server/ on the real filesystem
  // at app.asar.unpacked instead of app.asar
  const appRoot = path.join(__dirname, '..');
  const serverRoot = appRoot.replace('app.asar', 'app.asar.unpacked');
  const distPath = path.join(serverRoot, 'dist', 'server', 'entry.mjs');

  serverProcess = spawn('node', [distPath], {
    cwd: serverRoot,
    env: { ...process.env, HOST: 'localhost', PORT: String(PORT) },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(URL);
      if (response.ok) return true;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  return false;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'ImageStore',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Wait for server then load
  const ready = await waitForServer();
  if (ready) {
    mainWindow.loadURL(URL);
  } else {
    mainWindow.loadURL(`data:text/html,<h1>Failed to start server</h1><p>Please restart the application.</p>`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
