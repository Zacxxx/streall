const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  try {
    const svgPath = path.join(__dirname, '../public/logo.svg');
    const icoPath = path.join(__dirname, '../public/logo-256.ico');
    
    console.log('Generating 256x256 ICO from SVG...');
    
    // Read SVG and convert to ICO
    await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toFile(icoPath.replace('.ico', '.png'));
    
    console.log('✅ Generated logo-256.png');
    console.log('Note: For a proper ICO file, you may need to use a dedicated ICO converter.');
    console.log('For now, you can use the PNG file or convert it online.');
    
  } catch (error) {
    console.error('❌ Error generating icon:', error);
  }
}

generateIcon(); 