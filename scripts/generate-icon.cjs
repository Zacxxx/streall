const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  try {
    const svgPath = path.join(__dirname, '../public/logo.svg');
    const png256Path = path.join(__dirname, '../public/logo-256.png');
    const png512Path = path.join(__dirname, '../public/logo-512.png');
    
    console.log('Generating app icons from SVG...');
    
    // Generate 256x256 for Windows
    await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toFile(png256Path);
    
    console.log('✅ Generated logo-256.png (Windows)');
    
    // Generate 512x512 for macOS
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(png512Path);
    
    console.log('✅ Generated logo-512.png (macOS)');
    console.log('🍎 macOS icon meets minimum 512x512 requirement');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcon(); 