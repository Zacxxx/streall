const { app, BrowserWindow, Menu, session } = require('electron');
const path = require('path');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const isDev = process.env.NODE_ENV === 'development';

// Initialize Ghostery Ad Blocker
async function initializeAdBlocker() {
  try {
    console.log('🛡️ Initializing Ghostery Ad Blocker...');
    
    // Create blocker from multiple filter lists (same as used by uBlock Origin)
    const blocker = await ElectronBlocker.fromLists(fetch, [
      'https://easylist.to/easylist/easylist.txt', // EasyList
      'https://easylist.to/easylist/easyprivacy.txt', // EasyPrivacy
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt', // uBlock filters
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt', // Badware risks
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt', // Privacy
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt', // Resource abuse
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt' // Unbreak
    ], {
      enableCompression: true,
    });

    // Enable blocker for all sessions
    blocker.enableBlockingInSession(session.defaultSession);
    
    // Log blocking statistics
    blocker.on('request-blocked', (request) => {
      console.log('🚫 Blocked:', request.url);
    });
    
    blocker.on('request-redirected', (request) => {
      console.log('↩️ Redirected:', request.url);
    });

    console.log('✅ Ghostery Ad Blocker initialized successfully!');
    console.log(`📊 Loaded ${blocker.getFilters().length} filter rules`);
    
    return blocker;
  } catch (error) {
    console.error('❌ Failed to initialize ad blocker:', error);
    return null;
  }
}

function createWindow() {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, '../public/logo-256.png'), // App icon
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    app.quit();
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize ad blocker first
  await initializeAdBlocker();
  
  // Then create the window
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Remove default menu bar
if (!isDev) {
  Menu.setApplicationMenu(null);
} 