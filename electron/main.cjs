const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  console.log('Creating Electron window...');
  
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, '../public/logo-256.png'), // App icon
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    autoHideMenuBar: true // Hide menu bar by default
  });

  // Load the app
  if (isDev) {
    console.log('Loading development URL...');
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading production file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready, showing...');
    mainWindow.show();
    mainWindow.focus(); // Ensure window gets focus
  });

  // Prevent window from closing immediately - just hide it instead
  mainWindow.on('close', (event) => {
    console.log('Window close requested...');
    // On Windows/Linux, actually quit the app when window is closed
    if (process.platform !== 'darwin') {
      console.log('Quitting application...');
      app.quit();
    } else {
      // On macOS, just hide the window
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Clean up when window is destroyed
  mainWindow.on('closed', () => {
    console.log('Window destroyed');
    // Don't call app.quit() here as it's handled in 'close' event
  });

  // Debug: Log when page finishes loading
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Page finished loading!');
    // Force show the window if it's not visible
    if (!mainWindow.isVisible()) {
      console.log('Window not visible, forcing show...');
      mainWindow.show();
    }
    
    // Additional debugging
    console.log('Window state after load:');
    console.log('- Visible:', mainWindow.isVisible());
    console.log('- Focused:', mainWindow.isFocused());
    console.log('- Minimized:', mainWindow.isMinimized());
    console.log('- Bounds:', mainWindow.getBounds());
  });

  // Debug: Log any loading failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription);
  });

  // Add window state debugging
  mainWindow.on('show', () => {
    console.log('Window shown');
  });

  mainWindow.on('hide', () => {
    console.log('Window hidden');
  });

  return mainWindow;
}

let mainWindow = null;

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('Electron app ready!');
  mainWindow = createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  console.log('All windows closed');
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    console.log('Quitting app due to all windows closed');
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  // On macOS, re-create window when dock icon is clicked and no windows exist
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('No windows exist, creating new window');
    mainWindow = createWindow();
  } else if (mainWindow && !mainWindow.isVisible()) {
    console.log('Window exists but hidden, showing it');
    mainWindow.show();
  }
});

// Remove default menu bar
if (!isDev) {
  Menu.setApplicationMenu(null);
}

// Add error handling for unhandled exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 