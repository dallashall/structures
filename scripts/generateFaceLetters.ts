/**
 * Generate face letter textures for debugging
 * Each face gets a different colored letter: T, Bm, L, R, F, Bk
 */
import sharp from 'sharp';
import { join } from 'path';

const SIZE = 16;

const faces = [
  { name: 'top', letter: 'T', color: '#00ff00' },      // Green
  { name: 'bottom', letter: 'Bm', color: '#8b4513' },  // Brown
  { name: 'left', letter: 'L', color: '#ff0000' },     // Red
  { name: 'right', letter: 'R', color: '#0000ff' },    // Blue
  { name: 'front', letter: 'F', color: '#ffff00' },    // Yellow
  { name: 'back', letter: 'Bk', color: '#ff00ff' },    // Magenta
];

async function generateFaceTextures() {
  console.log('🎨 Generating face letter textures...\n');

  for (const face of faces) {
    const fontSize = face.letter.length > 1 ? '6' : '8';
    const svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" fill="#2a2a2a"/>

  <!-- Letter -->
  <text x="8" y="${face.letter.length > 1 ? '10' : '11'}"
        text-anchor="middle"
        font-size="${fontSize}"
        fill="${face.color}"
        font-family="monospace"
        font-weight="bold">${face.letter}</text>
</svg>
`;

    const outputPath = join(process.cwd(), 'public', 'PixelBOX', `face_${face.name}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ ${face.name.padEnd(6)} (${face.letter.padEnd(2)}) -> face_${face.name}.png`);
  }

  console.log('\n✅ Face textures generated!');
}

generateFaceTextures().catch(console.error);
