# Streall Desktop Application ✅ SUCCESSFULLY CONFIGURED

This project now supports building desktop applications for both macOS and Windows using Electron.

## ✅ Current Status
Your Windows desktop application has been **successfully built** and is ready to use!

**Location**: `dist-electron/win-unpacked/Streall.exe`

## Available Build Commands

### Development
- `npm run electron-dev` - Run the app in development mode with hot reload
- `npm run electron` - Run the Electron app in development mode (requires dev server to be running)

### Production Builds
- `npm run build-desktop` - **RECOMMENDED**: Build using our custom script (avoids signing issues)
- `npm run dist` - Build for the current platform
- `npm run dist-mac` - Build macOS .dmg installer (requires macOS)
- `npm run dist-win` - Build Windows portable executable
- `npm run dist-all` - Build for both macOS and Windows (requires macOS for .app builds)

## Build Output

Built applications will be saved in the `dist-electron` directory:

### macOS
- **Streall-1.0.0.dmg** - Drag-and-drop installer
- **Streall-1.0.0-arm64.dmg** - For Apple Silicon Macs
- **Streall-1.0.0-x64.dmg** - For Intel Macs

### Windows
- **Streall Setup 1.0.0.exe** - Windows installer (supports both x64 and x86)

## Building Instructions

1. **First-time setup:**
   ```bash
   npm install
   ```

2. **Build for your current platform:**
   ```bash
   npm run dist
   ```

3. **Build for specific platforms:**
   ```bash
   # For macOS (requires macOS)
   npm run dist-mac
   
   # For Windows (can be run from any platform)
   npm run dist-win
   
   # For both platforms (requires macOS)
   npm run dist-all
   ```

## Testing the Desktop App

To test the desktop application in development:

```bash
npm run electron-dev
```

This will start both the Vite dev server and the Electron app with hot reload enabled.

## Platform Requirements

- **Building for macOS**: Requires macOS with Xcode Command Line Tools
- **Building for Windows**: Can be built from any platform
- **Building for Linux**: Not currently configured (can be added if needed)

## App Configuration

The desktop app configuration can be found in `package.json` under the `"build"` section. Key settings:

- App ID: `com.streall.app`
- Product Name: `Streall`
- Categories: Entertainment (macOS)
- Icons: Uses `public/logo.svg`

## Troubleshooting

If you encounter issues:

1. Make sure all dependencies are installed: `npm install`
2. Clear the dist folder: `rm -rf dist dist-electron`
3. Rebuild: `npm run dist`

For Windows builds on non-Windows platforms, you may need to install additional dependencies:
```bash
# On macOS/Linux for Windows builds
npm install --save-dev wine
``` 