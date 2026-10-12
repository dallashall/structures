// Serves a page that bakes one prefiltered .env sky per lighting preset into public/environment/.
// The page computes each cube face on the CPU, then prefilters and encodes on the GPU.
// Open http://localhost:8095 in a browser. The server exits when every file is written.
// Run: npm run generate:env
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SKY_PRESETS, SUN_TRAVEL_DIRECTION } from '../src/core/rendering/SkyPresets';

const PORT = 8095;
// Must match the @babylonjs/core major version that loads the files
const BABYLON_CDN = 'https://cdn.jsdelivr.net/npm/babylonjs@7.54.3/babylon.js';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/environment');
// Cube face size. 256 is enough for the rough, non-metallic block materials.
const SIZE = 256;

const length = Math.hypot(SUN_TRAVEL_DIRECTION.x, SUN_TRAVEL_DIRECTION.y, SUN_TRAVEL_DIRECTION.z);
const sunDir = {
  x: -SUN_TRAVEL_DIRECTION.x / length,
  y: -SUN_TRAVEL_DIRECTION.y / length,
  z: -SUN_TRAVEL_DIRECTION.z / length,
};

const page = `<!doctype html><html><head><meta charset="utf-8"><title>Bake env skies</title>
<style>body{font-family:system-ui;margin:16px}#log{white-space:pre-line}</style>
</head><body><h1>Baking env skies</h1><canvas id="c" width="16" height="16"></canvas><p id="log">loading Babylon…</p>
<!-- Encoding waits on animation frames, which a background tab never delivers -->
<script>window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);</script>
<script src="${BABYLON_CDN}"></script>
<script>
const PRESETS = ${JSON.stringify(SKY_PRESETS)};
const SUN_DIR = ${JSON.stringify(sunDir)};
const SIZE = ${SIZE};
const log = (t) => { document.getElementById('log').textContent += '\\n' + t; };
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const rgb = (c) => [c.r, c.g, c.b];
// Unit direction of the second light lobe, rotated around the vertical axis from the sun's azimuth
function glowDirection(p) {
  const azimuth = Math.atan2(SUN_DIR.z, SUN_DIR.x) + p.glowAzimuthOffset;
  return [Math.cos(azimuth) * Math.cos(p.glowElevation), Math.sin(p.glowElevation), Math.sin(azimuth) * Math.cos(p.glowElevation)];
}
// Radiance seen along unit direction d (Y-up)
function sky(d, p, glowDir) {
  const above = d[1] > 0;
  const t = above ? Math.pow(d[1], 0.6) : Math.pow(-d[1], 0.5);
  const far = rgb(above ? p.zenith : p.ground);
  const horizon = rgb(p.horizon);
  const toward = d[0] * SUN_DIR.x + d[1] * SUN_DIR.y + d[2] * SUN_DIR.z;
  // Key side versus fill side: a smooth lobe over the whole sphere
  const key = smoothstep(-0.35, 1.0, toward);
  const keyTint = rgb(p.keyTint);
  const fillTint = rgb(p.fillTint);
  const halo = Math.pow(Math.max(toward, 0), p.haloPower) * p.haloStrength;
  const disc = smoothstep(Math.cos(p.sunSize * 2), Math.cos(p.sunSize), toward);
  const towardGlow = d[0] * glowDir[0] + d[1] * glowDir[1] + d[2] * glowDir[2];
  const glow = Math.pow(Math.max(towardGlow, 0), p.glowPower) * p.glowStrength;
  const sun = rgb(p.sunColor);
  const glowColor = rgb(p.glowColor);
  return horizon.map((h, i) =>
    lerp(h, far[i], t) * lerp(fillTint[i], keyTint[i], key) + sun[i] * (halo + disc * p.sunIntensity) + glowColor[i] * glow);
}
// Direction of the texel at face coordinates (s, t) in [-1, 1], per the WebGL cube map face table.
// Face order matches TEXTURE_CUBE_MAP_POSITIVE_X + i: +X, -X, +Y, -Y, +Z, -Z.
const FACE_DIRECTIONS = [
  (s, t) => [1, -t, -s],
  (s, t) => [-1, -t, s],
  (s, t) => [s, 1, t],
  (s, t) => [s, -1, -t],
  (s, t) => [s, -t, 1],
  (s, t) => [-s, -t, -1],
];
function cubeFaces(p) {
  const glowDir = glowDirection(p);
  return FACE_DIRECTIONS.map((direction) => {
    const data = new Float32Array(SIZE * SIZE * 4);
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const d = direction(2 * (col + 0.5) / SIZE - 1, 2 * (row + 0.5) / SIZE - 1);
        const len = Math.hypot(d[0], d[1], d[2]);
        const color = sky([d[0] / len, d[1] / len, d[2] / len], p, glowDir);
        const i = (row * SIZE + col) * 4;
        data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = 1;
      }
    }
    return data;
  });
}
async function bake() {
  const canvas = document.getElementById('c');
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);
  for (const id of Object.keys(PRESETS)) {
    const cube = new BABYLON.RawCubeTexture(scene, cubeFaces(PRESETS[id]), SIZE, BABYLON.Constants.TEXTUREFORMAT_RGBA, BABYLON.Constants.TEXTURETYPE_FLOAT, false, false);
    log(id + ': built faces');
    await new BABYLON.HDRFiltering(engine, { quality: BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH }).prefilter(cube);
    log(id + ': prefiltered');
    const create = BABYLON.CreateEnvTextureAsync ?? BABYLON.EnvironmentTextureTools.CreateEnvTextureAsync;
    const buffer = await create(cube);
    const res = await fetch('/write?id=' + id, { method: 'POST', body: buffer });
    log(id + ': ' + Math.round(buffer.byteLength / 1024) + ' KB, ' + (await res.text()));
    cube.dispose();
  }
  await fetch('/done', { method: 'POST' });
  log('done');
}
bake().catch((e) => log('failed: ' + (e.stack || e)));
</script></body></html>`;

mkdirSync(OUT, { recursive: true });

const handleRequest = (req: IncomingMessage, res: ServerResponse): void => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(page);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/write') {
    const id = url.searchParams.get('id');
    if (!id || !(id in SKY_PRESETS)) {
      res.writeHead(400).end('unknown id');
      return;
    }
    const chunks: Buffer[] = [];
    const handleData = (chunk: Buffer): void => { chunks.push(chunk); };
    const handleEnd = (): void => {
      const file = path.join(OUT, `${id}.env`);
      writeFileSync(file, Buffer.concat(chunks));
      console.log(`wrote ${path.relative(process.cwd(), file)}`);
      res.end('written');
    };
    req.on('data', handleData);
    req.on('end', handleEnd);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/done') {
    res.end('bye');
    const exit = (): void => { process.exit(0); };
    const closeServer = (): void => { server.close(exit); };
    setTimeout(closeServer, 200);
    return;
  }

  res.writeHead(404).end();
};

const server = createServer(handleRequest);

const announce = (): void => {
  console.log(`open http://localhost:${PORT} in a browser to bake ${Object.keys(SKY_PRESETS).join(', ')}`);
};
server.listen(PORT, announce);
