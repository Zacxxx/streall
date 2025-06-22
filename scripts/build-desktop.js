const { build } = require('electron-builder');
const path = require('path');

async function buildDesktop() {
  try {
    console.log('🚀 Building desktop application...');
    
    await build({
      config: {
        appId: 'com.streall.app',
        productName: 'Streall',
        directories: {
          output: 'dist-electron'
        },
        files: [
          'dist/**/*',
          'electron/**/*',
          'node_modules/**/*'
        ],
        compression: 'normal',
        publish: null,
        win: {
          target: [
            {
              target: 'portable',
              arch: ['x64']
            }
          ],
          forceCodeSigning: false
        },
        mac: {
          category: 'public.app-category.entertainment',
          target: [
            {
              target: 'dmg',
              arch: ['x64', 'arm64']
            }
          ]
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        }
      }
    });
    
    console.log('✅ Desktop application built successfully!');
    console.log('📁 Check the dist-electron folder for your builds');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildDesktop(); 