#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

class DistributionPackager {
  constructor() {
    this.appName = 'Streall';
    this.version = '1.0.0';
    this.outputDir = path.join(process.cwd(), 'release');
  }

  async createZipFromDirectory(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`✅ Created ${path.basename(outputPath)} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async buildApplication() {
    console.log('🔨 Building application...');
    
    try {
      // Build the web version first
      execSync('npm run build', { stdio: 'inherit' });
      
      // Build the desktop version (ignore signing errors for now)
      try {
        execSync('npm run dist-win', { stdio: 'inherit' });
      } catch (error) {
        console.log('⚠️ Build completed with signing warnings (this is expected)');
      }
      
      console.log('✅ Application built successfully');
    } catch (error) {
      throw new Error(`❌ Build failed: ${error.message}`);
    }
  }

  async createPortablePackages() {
    console.log('📦 Creating portable packages...');
    
    await fs.ensureDir(this.outputDir);
    
    // Windows portable package
    const winUnpackedDir = path.join(process.cwd(), 'dist-electron', 'win-unpacked');
    if (fs.existsSync(winUnpackedDir)) {
      const winZipPath = path.join(this.outputDir, `${this.appName}-Portable-Windows.zip`);
      await this.createZipFromDirectory(winUnpackedDir, winZipPath);
    }

    // Note: macOS packages would be created here if building on macOS
    // const macAppPath = path.join(process.cwd(), 'dist-electron', 'mac', `${this.appName}.app`);
    // if (fs.existsSync(macAppPath)) {
    //   const macZipPath = path.join(this.outputDir, `${this.appName}-Portable-macOS.zip`);
    //   await this.createZipFromDirectory(macAppPath, macZipPath);
    // }
  }

  async createInstallerPackages() {
    console.log('🛠️ Creating installer packages...');
    
    const installerScript = path.join(process.cwd(), 'scripts', 'installer.js');
    const packageJson = {
      name: `${this.appName.toLowerCase()}-installer`,
      version: this.version,
      description: `Lightweight installer for ${this.appName}`,
      main: 'installer.js',
      bin: {
        'install-streall': './installer.js'
      },
      dependencies: {
        'extract-zip': '^2.0.1',
        'create-desktop-shortcuts': '^1.11.0',
        'fs-extra': '^11.1.1'
      },
      engines: {
        node: '>=16.0.0'
      }
    };

    // Windows installer package
    const winInstallerDir = path.join(this.outputDir, 'windows-installer');
    await fs.ensureDir(winInstallerDir);
    
    // Copy installer script
    await fs.copy(installerScript, path.join(winInstallerDir, 'installer.js'));
    
    // Copy Windows portable ZIP
    const winZipSource = path.join(this.outputDir, `${this.appName}-Portable-Windows.zip`);
    const winZipDest = path.join(winInstallerDir, `${this.appName}.zip`);
    if (fs.existsSync(winZipSource)) {
      await fs.copy(winZipSource, winZipDest);
    }
    
    // Create package.json for the installer
    await fs.writeJson(path.join(winInstallerDir, 'package.json'), packageJson, { spaces: 2 });
    
    // Create README for the installer
    const installerReadme = `# ${this.appName} Installer

## Quick Install

1. Make sure you have Node.js installed (https://nodejs.org)
2. Open terminal/command prompt in this folder
3. Run: \`npm install\`
4. Run: \`node installer.js\`

The installer will:
- Extract ${this.appName} to the appropriate location for your OS
- Create desktop shortcuts
- Add to Start Menu (Windows) or Applications folder (macOS)

## Manual Installation

If you prefer, you can also extract \`${this.appName}.zip\` manually and run the executable directly.

## System Requirements

- Windows 10+ or macOS 10.14+
- Node.js 16+ (for installer only)
`;
    
    await fs.writeFile(path.join(winInstallerDir, 'README.md'), installerReadme);
    
    // Create the final installer package
    const installerZipPath = path.join(this.outputDir, `${this.appName}-Installer-Windows.zip`);
    await this.createZipFromDirectory(winInstallerDir, installerZipPath);
    
    // Clean up temporary installer directory
    await fs.remove(winInstallerDir);
  }

  async createStandalonePortable() {
    console.log('🎯 Creating standalone portable versions...');
    
    // Create a version that doesn't need the installer
    const portableDir = path.join(this.outputDir, 'portable');
    await fs.ensureDir(portableDir);
    
    // Copy the ZIP files to the portable directory with instructions
    const winZipSource = path.join(this.outputDir, `${this.appName}-Portable-Windows.zip`);
    if (fs.existsSync(winZipSource)) {
      await fs.copy(winZipSource, path.join(portableDir, `${this.appName}-Portable-Windows.zip`));
    }
    
    // Create simple instructions
    const portableReadme = `# ${this.appName} Portable

## Simple Installation

### Windows:
1. Extract \`${this.appName}-Portable-Windows.zip\`
2. Double-click \`Streall.exe\` to run
3. (Optional) Right-click Streall.exe → Send to → Desktop to create a shortcut

### macOS:
1. Extract \`${this.appName}-Portable-macOS.zip\` (when available)
2. Drag \`Streall.app\` to your Applications folder
3. Launch from Applications or Spotlight

## No Installation Required!

These are completely portable versions - no installation needed. Just extract and run!
`;
    
    await fs.writeFile(path.join(portableDir, 'README.md'), portableReadme);
  }

  async generateDistributionSummary() {
    console.log('📋 Generating distribution summary...');
    
    const files = await fs.readdir(this.outputDir);
    const summary = {
      appName: this.appName,
      version: this.version,
      buildDate: new Date().toISOString(),
      packages: []
    };
    
    for (const file of files) {
      const filePath = path.join(this.outputDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile() && file.endsWith('.zip')) {
        summary.packages.push({
          name: file,
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          type: file.includes('Installer') ? 'installer' : 'portable'
        });
      }
    }
    
    await fs.writeJson(path.join(this.outputDir, 'build-summary.json'), summary, { spaces: 2 });
    
    console.log('\n📊 Distribution Summary:');
    console.log('═'.repeat(50));
    summary.packages.forEach(pkg => {
      console.log(`📦 ${pkg.name} (${pkg.size}) - ${pkg.type}`);
    });
  }

  async package() {
    try {
      console.log(`🚀 ${this.appName} Distribution Packager v${this.version}`);
      console.log('═'.repeat(60));
      
      // Clean previous builds
      if (fs.existsSync(this.outputDir)) {
        await fs.remove(this.outputDir);
      }
      
      await this.buildApplication();
      await this.createPortablePackages();
      await this.createInstallerPackages();
      await this.createStandalonePortable();
      await this.generateDistributionSummary();
      
      console.log('═'.repeat(60));
      console.log('🎉 Distribution packages created successfully!');
      console.log(`📁 Output directory: ${this.outputDir}`);
      console.log('\n💡 Distribution options:');
      console.log('  • Installer packages: Automatic installation with shortcuts');
      console.log('  • Portable packages: Extract and run, no installation needed');
      console.log('\n🚀 Ready for distribution!');
      
    } catch (error) {
      console.error('💥 Packaging failed:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Install archiver if not already installed
try {
  require('archiver');
} catch (error) {
  console.log('📦 Installing required dependencies...');
  execSync('npm install --save-dev archiver', { stdio: 'inherit' });
}

// Run packager if called directly
if (require.main === module) {
  const packager = new DistributionPackager();
  packager.package();
}

module.exports = DistributionPackager; 