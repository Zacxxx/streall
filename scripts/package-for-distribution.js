#!/usr/bin/env node

import fs from 'fs-extra';
import archiver from 'archiver';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const config = {
  appName: 'Streall',
  version: '1.0.0',
  platforms: ['win32', 'darwin', 'linux'],
  outputDir: path.join(projectRoot, 'dist-packages'),
  tempDir: path.join(projectRoot, 'temp-package'),
  
  // Source directories after build
  sources: {
    win32: path.join(projectRoot, 'dist-electron', 'win-unpacked'),
    darwin: path.join(projectRoot, 'dist-electron', 'mac'),
    linux: path.join(projectRoot, 'dist-electron', 'linux-unpacked')
  },
  
  // Installer script
  installerScript: path.join(__dirname, 'installer.cjs'),
  
  // Package info
  description: 'Streall - Premium Desktop Streaming Experience',
  website: 'https://streall.app',
  
  // File patterns to exclude from portable packages
  excludePatterns: [
    '*.log',
    '*.tmp',
    'crash*',
    'debug.log'
  ]
};

async function detectPlatform() {
  const platform = process.platform;
  console.log(`🔍 Detected platform: ${platform}`);
  
  switch (platform) {
    case 'win32':
      return 'win32';
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function buildApplication() {
  console.log('🔨 Building application...');
  
  try {
    // Build web assets first
    console.log('  📦 Building web assets...');
    await execAsync('npm run build', { cwd: projectRoot });
    
    // Build electron app for current platform
    const platform = await detectPlatform();
    let buildCommand;
    
    switch (platform) {
      case 'win32':
        buildCommand = 'npx electron-builder --win';
        break;
      case 'darwin':
        buildCommand = 'npx electron-builder --mac';
        break;
      case 'linux':
        buildCommand = 'npx electron-builder --linux';
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    console.log(`  🖥️  Building desktop app for ${platform}...`);
    await execAsync(buildCommand, { cwd: projectRoot });
    
    console.log('✅ Application build completed');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    throw error;
  }
}

async function createZipArchive(sourceDir, outputPath, platform) {
  return new Promise((resolve, reject) => {
    console.log(`  📦 Creating ZIP archive: ${path.basename(outputPath)}`);
    
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Best compression
    });
    
    let totalFiles = 0;
    let processedFiles = 0;
    
    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`     ✅ Archive created: ${sizeMB}MB (${totalFiles} files)`);
      resolve();
    });
    
    archive.on('error', (err) => {
      console.error('     ❌ Archive error:', err);
      reject(err);
    });
    
    archive.on('entry', () => {
      processedFiles++;
      if (processedFiles % 100 === 0) {
        console.log(`     📄 Processed ${processedFiles}/${totalFiles} files...`);
      }
    });
    
    archive.pipe(output);
    
    // Count total files first
    const countFiles = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          countFiles(path.join(dir, item.name));
        } else {
          totalFiles++;
        }
      }
    };
    
    countFiles(sourceDir);
    console.log(`     📊 Total files to archive: ${totalFiles}`);
    
    // Add all files to archive
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function createInstallerPackage(portableZipPath, outputPath, platform) {
  console.log(`  🎁 Creating installer package: ${path.basename(outputPath)}`);
  
  const tempInstallerDir = path.join(config.tempDir, 'installer');
  await fs.ensureDir(tempInstallerDir);
  
  try {
    // Copy installer script
    const installerDestPath = path.join(tempInstallerDir, 'installer.cjs');
    await fs.copy(config.installerScript, installerDestPath);
    
    // Copy portable ZIP
    const zipDestPath = path.join(tempInstallerDir, `${config.appName.toLowerCase()}-portable.zip`);
    await fs.copy(portableZipPath, zipDestPath);
    
    // Create package.json for installer
    const packageJsonPath = path.join(tempInstallerDir, 'package.json');
    const packageJson = {
      name: `${config.appName.toLowerCase()}-installer`,
      version: config.version,
      description: `${config.description} - Installer`,
      main: 'installer.cjs',
      bin: {
        [`${config.appName.toLowerCase()}-install`]: 'installer.cjs'
      },
      files: [
        'installer.cjs',
        `${config.appName.toLowerCase()}-portable.zip`
      ],
      dependencies: {
        'extract-zip': '^2.0.1',
        'create-desktop-shortcuts': '^1.11.0',
        'fs-extra': '^11.1.1'
      },
      preferGlobal: true,
      os: [platform]
    };
    
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    
    // Create README for installer
    const readmePath = path.join(tempInstallerDir, 'README.md');
    const readmeContent = `# ${config.appName} Installer

## Installation

\`\`\`bash
npm install -g .
${config.appName.toLowerCase()}-install
\`\`\`

Or run directly:

\`\`\`bash
node installer.cjs
\`\`\`

## What this installer does:

1. 📁 Extracts ${config.appName} to your system's Applications folder
2. 🖥️ Creates desktop shortcut
3. 📋 Adds Start Menu entry (Windows) or Applications entry (macOS/Linux)
4. ✅ Sets up the application for easy access

## Manual Installation

If you prefer to install manually:

1. Extract the \`${config.appName.toLowerCase()}-portable.zip\` file
2. Move the extracted folder to your preferred location
3. Run the application executable

## System Requirements

- ${platform === 'win32' ? 'Windows 10 or later' : platform === 'darwin' ? 'macOS 10.14 or later' : 'Linux (64-bit)'}
- 500MB free disk space
- Internet connection for content streaming

## Support

Visit ${config.website} for support and documentation.
`;
    
    await fs.writeFile(readmePath, readmeContent);
    
    // Create installer ZIP
    await createZipArchive(tempInstallerDir, outputPath, platform);
    
    console.log(`     ✅ Installer package created`);
  } finally {
    // Clean up temp directory
    await fs.remove(tempInstallerDir);
  }
}

async function packageForDistribution() {
  console.log('🚀 Starting Streall Distribution Packaging\n');
  
  const startTime = Date.now();
  const platform = await detectPlatform();
  
  try {
    // Setup directories
    await fs.ensureDir(config.outputDir);
    await fs.ensureDir(config.tempDir);
    
    // Clean previous builds
    console.log('🧹 Cleaning previous packages...');
    await fs.emptyDir(config.outputDir);
    
    // Build application
    await buildApplication();
    
    // Check if build output exists
    const sourceDir = config.sources[platform];
    if (!await fs.pathExists(sourceDir)) {
      throw new Error(`Build output not found: ${sourceDir}`);
    }
    
    console.log('\n📦 Creating distribution packages...\n');
    
    // Create portable package
    const portableZipName = `${config.appName}-v${config.version}-${platform}-portable.zip`;
    const portableZipPath = path.join(config.outputDir, portableZipName);
    
    console.log('1️⃣ Creating portable package...');
    await createZipArchive(sourceDir, portableZipPath, platform);
    
    // Create installer package
    const installerZipName = `${config.appName}-v${config.version}-${platform}-installer.zip`;
    const installerZipPath = path.join(config.outputDir, installerZipName);
    
    console.log('\n2️⃣ Creating installer package...');
    await createInstallerPackage(portableZipPath, installerZipPath, platform);
    
    // Generate distribution info
    console.log('\n📊 Generating package information...');
    
    const packages = [];
    const packageFiles = await fs.readdir(config.outputDir);
    
    for (const file of packageFiles) {
      const filePath = path.join(config.outputDir, file);
      const stats = await fs.stat(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      packages.push({
        name: file,
        size: `${sizeMB}MB`,
        path: filePath,
        type: file.includes('installer') ? 'installer' : 'portable'
      });
    }
    
    // Create distribution manifest
    const manifest = {
      appName: config.appName,
      version: config.version,
      platform: platform,
      buildDate: new Date().toISOString(),
      packages: packages,
             installation: {
         installer: `Extract and run: node installer.cjs`,
         portable: `Extract and run the application directly`,
        requirements: {
          os: platform === 'win32' ? 'Windows 10+' : platform === 'darwin' ? 'macOS 10.14+' : 'Linux 64-bit',
          memory: '4GB RAM recommended',
          storage: '500MB free space',
          network: 'Internet connection required'
        }
      }
    };
    
    const manifestPath = path.join(config.outputDir, 'distribution-info.json');
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    
    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n🎉 Distribution packaging completed!\n');
    console.log('📋 Package Summary:');
    console.log(`   Platform: ${platform}`);
    console.log(`   Version: ${config.version}`);
    console.log(`   Build time: ${elapsed}s\n`);
    
    console.log('📦 Created packages:');
    packages.forEach(pkg => {
      const icon = pkg.type === 'installer' ? '🎁' : '📱';
      console.log(`   ${icon} ${pkg.name} (${pkg.size})`);
    });
    
    console.log(`\n📁 Output directory: ${config.outputDir}`);
    console.log('\n🚀 Ready for distribution!\n');
    
         console.log('💡 Usage Instructions:');
     console.log('   • Installer: Extract and run "node installer.cjs"');
     console.log('   • Portable: Extract and run the app directly');
     console.log('   • Share the appropriate package with users\n');
    
  } catch (error) {
    console.error('\n❌ Packaging failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    if (await fs.pathExists(config.tempDir)) {
      await fs.remove(config.tempDir);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  packageForDistribution().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default packageForDistribution; 