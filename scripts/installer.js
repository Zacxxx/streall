#!/usr/bin/env node

const extractZip = require('extract-zip');
const createDesktopShortcut = require('create-desktop-shortcuts');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class StreamlineInstaller {
  constructor() {
    this.appName = 'Streall';
    this.version = '1.0.0';
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';
    this.isMac = this.platform === 'darwin';
    
    // Define installation paths
    this.installPaths = this.getInstallPaths();
    this.zipPath = this.findZipFile();
  }

  getInstallPaths() {
    const homedir = os.homedir();
    
    if (this.isWindows) {
      return {
        install: path.join(homedir, 'AppData', 'Local', this.appName),
        executable: 'Streall.exe',
        desktop: path.join(homedir, 'Desktop'),
        startMenu: path.join(homedir, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs')
      };
    } else if (this.isMac) {
      return {
        install: path.join(homedir, 'Applications', this.appName),
        executable: 'Streall.app',
        desktop: path.join(homedir, 'Desktop'),
        applications: path.join(homedir, 'Applications')
      };
    } else {
      // Linux fallback
      return {
        install: path.join(homedir, '.local', 'share', this.appName),
        executable: 'Streall',
        desktop: path.join(homedir, 'Desktop')
      };
    }
  }

  findZipFile() {
    const possibleNames = [
      `${this.appName}-Portable-${this.platform}.zip`,
      `${this.appName}-Portable.zip`,
      `${this.appName}.zip`
    ];

    for (const name of possibleNames) {
      const fullPath = path.join(process.cwd(), name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Check in dist-electron folder
    const distPath = path.join(process.cwd(), 'dist-electron', `${this.appName}-Portable.zip`);
    if (fs.existsSync(distPath)) {
      return distPath;
    }

    return null;
  }

  async checkRequirements() {
    console.log('🔍 Checking installation requirements...');
    
    if (!this.zipPath) {
      throw new Error(`❌ Could not find installation package. Please ensure ${this.appName}.zip is in the current directory.`);
    }

    console.log(`✅ Found installation package: ${path.basename(this.zipPath)}`);
    console.log(`📋 Target platform: ${this.platform}`);
    console.log(`📁 Install location: ${this.installPaths.install}`);
  }

  async createDirectories() {
    console.log('📁 Creating installation directories...');
    
    try {
      await fs.ensureDir(this.installPaths.install);
      console.log(`✅ Created: ${this.installPaths.install}`);
    } catch (error) {
      throw new Error(`❌ Failed to create installation directory: ${error.message}`);
    }
  }

  async extractApplication() {
    console.log('📦 Extracting application files...');
    
    try {
      await extractZip(this.zipPath, { dir: this.installPaths.install });
      console.log('✅ Application extracted successfully');
      
      // Verify executable exists
      const execPath = path.join(this.installPaths.install, this.installPaths.executable);
      if (!fs.existsSync(execPath)) {
        // Try to find the executable in subdirectories
        const files = await fs.readdir(this.installPaths.install);
        for (const file of files) {
          const subPath = path.join(this.installPaths.install, file, this.installPaths.executable);
          if (fs.existsSync(subPath)) {
            // Move files up one level
            const subDir = path.join(this.installPaths.install, file);
            const subFiles = await fs.readdir(subDir);
            
            for (const subFile of subFiles) {
              await fs.move(
                path.join(subDir, subFile),
                path.join(this.installPaths.install, subFile)
              );
            }
            
            await fs.remove(subDir);
            break;
          }
        }
      }
      
    } catch (error) {
      throw new Error(`❌ Failed to extract application: ${error.message}`);
    }
  }

  async createShortcuts() {
    console.log('🔗 Creating shortcuts...');
    
    const executablePath = path.join(this.installPaths.install, this.installPaths.executable);
    
    if (!fs.existsSync(executablePath)) {
      console.warn(`⚠️ Executable not found at ${executablePath}, skipping shortcuts`);
      return;
    }

    try {
      // Desktop shortcut
      const desktopShortcut = {
        windows: {
          filePath: executablePath,
          outputPath: path.join(this.installPaths.desktop, `${this.appName}.lnk`),
          name: this.appName,
          comment: 'Streaming content browser application'
        },
        osx: {
          filePath: executablePath,
          outputPath: path.join(this.installPaths.desktop, `${this.appName}.app`),
          name: this.appName
        }
      };

      if (this.isWindows) {
        createDesktopShortcut(desktopShortcut.windows);
        console.log('✅ Desktop shortcut created');
        
        // Start Menu shortcut
        const startMenuShortcut = {
          filePath: executablePath,
          outputPath: path.join(this.installPaths.startMenu, `${this.appName}.lnk`),
          name: this.appName,
          comment: 'Streaming content browser application'
        };
        
        createDesktopShortcut(startMenuShortcut);
        console.log('✅ Start Menu shortcut created');
        
      } else if (this.isMac) {
        // On macOS, create a symlink to Applications folder
        const appPath = path.join(this.installPaths.applications, `${this.appName}.app`);
        
        if (!fs.existsSync(appPath)) {
          await fs.ensureSymlink(executablePath, appPath);
          console.log('✅ Added to Applications folder');
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not create shortcuts: ${error.message}`);
    }
  }

  async cleanup() {
    // Optional: Remove the zip file after installation
    // Commented out to let user decide
    // console.log('🧹 Cleaning up...');
    // await fs.remove(this.zipPath);
  }

  async install() {
    try {
      console.log(`🚀 ${this.appName} Lightweight Installer v${this.version}`);
      console.log('═'.repeat(50));
      
      await this.checkRequirements();
      await this.createDirectories();
      await this.extractApplication();
      await this.createShortcuts();
      await this.cleanup();
      
      console.log('═'.repeat(50));
      console.log('🎉 Installation completed successfully!');
      console.log(`📍 Installed to: ${this.installPaths.install}`);
      
      if (this.isWindows) {
        console.log('🔗 Shortcuts created on Desktop and Start Menu');
        console.log('💡 You can now run Streall from the Start Menu or Desktop');
      } else if (this.isMac) {
        console.log('🔗 Added to Applications folder');
        console.log('💡 You can now run Streall from Applications or Spotlight');
      }
      
      console.log(`\n🎬 Launch ${this.appName} and enjoy streaming!`);
      
    } catch (error) {
      console.error('💥 Installation failed:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Run installer if called directly
if (require.main === module) {
  const installer = new StreamlineInstaller();
  installer.install();
}

module.exports = StreamlineInstaller; 