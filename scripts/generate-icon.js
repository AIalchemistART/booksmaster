const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  const buildDir = path.join(__dirname, '..', 'build');
  
  // Create build directory if it doesn't exist
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  console.log('Generating icon from SVG...');
  
  // Generate PNG at 256x256 for Windows
  await sharp(svgPath)
    .resize(256, 256)
    .png()
    .toFile(path.join(buildDir, 'icon.png'));
  
  console.log('✓ Generated build/icon.png (256x256)');
  
  // Generate additional sizes for better quality
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(buildDir, 'icon@2x.png'));
  
  console.log('✓ Generated build/icon@2x.png (512x512)');
  
  console.log('\nNote: electron-builder will automatically convert PNG to ICO format.');
  console.log('The icon will be used for the app executable and installer.');
}

generateIcon().catch(console.error);
