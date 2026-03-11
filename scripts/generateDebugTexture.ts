/**
 * Generate a debug texture with directional arrows
 * This helps visualize texture orientation on cube faces
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';

const SIZE = 16;

// Create SVG with arrows pointing UP
const svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" fill="#444444"/>

  <!-- Top label -->
  <text x="8" y="4" text-anchor="middle" font-size="3" fill="#00ff00" font-family="monospace">TOP</text>

  <!-- Arrow pointing UP (green) -->
  <line x1="8" y1="12" x2="8" y2="6" stroke="#00ff00" stroke-width="1"/>
  <polygon points="8,5 6,7 10,7" fill="#00ff00"/>

  <!-- Left arrow pointing RIGHT (red - X axis) -->
  <line x1="2" y1="8" x2="5" y2="8" stroke="#ff0000" stroke-width="0.5"/>
  <polygon points="5,8 4,7.5 4,8.5" fill="#ff0000"/>

  <!-- Right arrow pointing INTO PAGE (blue - Y axis) -->
  <circle cx="13" cy="8" r="1.5" stroke="#0000ff" stroke-width="0.5" fill="none"/>
  <circle cx="13" cy="8" r="0.5" fill="#0000ff"/>
</svg>
`;

async function generateDebugTexture() {
  console.log('🎨 Generating debug texture with directional arrows...');

  const outputPath = join(process.cwd(), 'public', 'PixelBOX', 'debug_arrows.png');

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`✓ Debug texture saved: ${outputPath}`);
  console.log('\nTexture legend:');
  console.log('  - GREEN arrow points UP (top of texture)');
  console.log('  - RED arrow points RIGHT (X axis)');
  console.log('  - BLUE circle represents INTO PAGE (Y axis)');
  console.log('  - Text "TOP" marks the top edge');
}

generateDebugTexture().catch(console.error);
