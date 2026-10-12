#!/usr/bin/env npx tsx

/**
 * Texture setup - downloads the pinned resource pack and builds public/atlas.png and atlas.json
 *
 * The pack is CC BY-NC-ND, so the repo holds no copy of it. This script downloads the exact
 * version named in resource-packs/<id>/pack-source.json from the author's Modrinth listing,
 * checks its SHA-512, and extracts the block textures into .cache/packs/<id>.
 *
 * It does nothing when both atlas files exist, unless --force is given.
 * A failure prints a warning and exits 0, so dev and build continue and the app shows flat colors.
 * TEXTURES_REQUIRED=1 turns a failure into exit 1, for deploys that must ship textures.
 */

import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { unzipSync } from 'fflate';

import type { PackManifest } from '../src/types/canonical';

const PACK_ID = 'squareful';
// Modrinth asks API and CDN clients to name themselves
const USER_AGENT = 'structures-blueprint-editor/0.1 (texture setup script)';

interface PackSource {
  title: string;
  version: string;
  page: string;
  url: string;
  sha512: string;
}

const root = process.cwd();
const packDir = path.join(root, 'resource-packs', PACK_ID);
const cacheDir = path.join(root, '.cache', 'packs');
const zipPath = path.join(cacheDir, `${PACK_ID}.zip`);
const sourceDir = path.join(cacheDir, PACK_ID);
const atlasPaths = [path.join(root, 'public', 'atlas.png'), path.join(root, 'public', 'atlas.json')];

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf-8')) as T;

const sha512 = (data: Uint8Array): string => createHash('sha512').update(data).digest('hex');

async function downloadZip(source: PackSource): Promise<Uint8Array> {
  if (fs.existsSync(zipPath)) {
    const cached = new Uint8Array(fs.readFileSync(zipPath));
    if (sha512(cached) === source.sha512) return cached;
  }

  console.log(`Downloading ${source.title} ${source.version} from ${source.page}`);
  const response = await fetch(source.url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }

  const data = new Uint8Array(await response.arrayBuffer());
  if (sha512(data) !== source.sha512) {
    throw new Error('Downloaded file does not match the SHA-512 in pack-source.json');
  }

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(zipPath, data);
  return data;
}

/**
 * Extract only the block textures the atlas reads. The zip root is the pack root.
 */
function extractTextures(zip: Uint8Array, textureBasePath: string): number {
  const prefix = `${textureBasePath}/`;
  const isBlockTexture = (file: { name: string }): boolean => file.name.startsWith(prefix);
  const files = unzipSync(zip, { filter: isBlockTexture });

  fs.rmSync(sourceDir, { recursive: true, force: true });
  let count = 0;
  for (const [name, data] of Object.entries(files)) {
    if (name.endsWith('/')) continue;
    const target = path.join(sourceDir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    count++;
  }
  return count;
}

function buildAtlas(): void {
  const result = spawnSync(
    'npx',
    ['tsx', 'scripts/buildTextureAtlas.ts', '--pack', PACK_ID, '--source', sourceDir],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(`Atlas build exited with status ${result.status}`);
  }
}

async function setup(): Promise<void> {
  const force = process.argv.includes('--force');
  if (!force && atlasPaths.every(fs.existsSync)) return;

  const source = readJson<PackSource>(path.join(packDir, 'pack-source.json'));
  const manifest = readJson<PackManifest>(path.join(packDir, 'pack-manifest.json'));

  const zip = await downloadZip(source);
  const count = extractTextures(zip, manifest.textureBasePath);
  if (count === 0) {
    throw new Error(`The pack zip has no files under ${manifest.textureBasePath}`);
  }
  console.log(`Extracted ${count} block textures to ${path.relative(root, sourceDir)}`);

  buildAtlas();
}

const handleFailure = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.TEXTURES_REQUIRED === '1') {
    console.error(`Texture setup failed: ${message}`);
    process.exit(1);
  }
  console.warn(`\nTexture setup failed: ${message}`);
  console.warn('The app will run with flat block colors. Retry with: npm run setup:textures\n');
};

setup().catch(handleFailure);
