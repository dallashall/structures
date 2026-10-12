import { EventEmitter } from './EventEmitter';
import type { AtlasMetadata, LoadedTexture } from '../types';
import { blockRegistry } from './BlockRegistry';

/**
 * TextureResolver - Loads public/atlas.png and public/atlas.json, which scripts/setupTextures.ts builds.
 * When either file is missing the status reads 'missing' and every renderer draws flat colors.
 *
 * Events:
 * - atlas:ready - When the atlas image and metadata are both available
 * - atlas:error - When the atlas fails to load. Blocks then draw in flat colors.
 */

export type AtlasStatus = 'loading' | 'ready' | 'missing';

class TextureResolver extends EventEmitter {
  private static instance: TextureResolver;

  private atlas: LoadedTexture | null = null;
  private atlasMetadata: AtlasMetadata | null = null;
  private loadingPromise: Promise<void> | null = null;
  private atlasStatus: AtlasStatus = 'loading';

  // Keyed by `${blockId}_${faceIndex}`
  private tintedTextureCache = new Map<string, HTMLCanvasElement>();

  private constructor() {
    super();
    this.loadAtlas();
  }

  static getInstance(): TextureResolver {
    if (!TextureResolver.instance) {
      TextureResolver.instance = new TextureResolver();
    }
    return TextureResolver.instance;
  }

  private async loadAtlas(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadAtlasInternal();
    return this.loadingPromise;
  }

  private async loadAtlasInternal(): Promise<void> {
    try {
      const metadataResponse = await fetch('/atlas.json');
      if (!metadataResponse.ok) {
        throw new Error(`Failed to load atlas metadata: ${metadataResponse.statusText}`);
      }
      this.atlasMetadata = await metadataResponse.json();

      const atlasImage = new Image();
      atlasImage.crossOrigin = 'anonymous';

      const loadImage = (resolve: () => void, reject: (error: unknown) => void): void => {
        const handleLoad = (): void => resolve();
        const handleError = (): void => reject(new Error('Failed to load atlas image'));
        atlasImage.onload = handleLoad;
        atlasImage.onerror = handleError;
        atlasImage.src = '/atlas.png';
      };
      await new Promise<void>(loadImage);

      this.atlas = {
        id: 'atlas',
        path: '/atlas.png',
        image: atlasImage,
        width: atlasImage.width,
        height: atlasImage.height,
        loaded: true,
      };

      this.atlasStatus = 'ready';
      this.emit('atlas:ready', this.atlas);
    } catch (error) {
      this.atlasStatus = 'missing';
      this.emit('atlas:error', error);
      console.error('Failed to load texture atlas:', error);
      throw error;
    }
  }

  getAtlasStatus(): AtlasStatus {
    return this.atlasStatus;
  }

  getAtlas(): LoadedTexture | null {
    return this.atlas;
  }

  getAtlasMetadata(): AtlasMetadata | null {
    return this.atlasMetadata;
  }

  isAtlasLoaded(): boolean {
    return this.atlas !== null && this.atlas.loaded;
  }

  getBlockFaceUV(blockId: string): Array<{ u0: number; v0: number; u1: number; v1: number }> | null {
    if (!this.atlasMetadata) return null;
    const blockUV = this.atlasMetadata.blockFaceUV[blockId];
    if (!blockUV) return null;
    return blockUV.faceUV;
  }

  /**
   * Babylon's box needs its left and right faces swapped and rotated, so the atlas keeps a separate UV set for 3D
   */
  getBlockFaceUV3D(blockId: string): Array<{ u0: number; v0: number; u1: number; v1: number }> | null {
    if (!this.atlasMetadata) return null;
    const blockUV = this.atlasMetadata.blockFaceUV3D[blockId];
    if (!blockUV) return null;
    return blockUV.faceUV;
  }

  /**
   * Pixel rectangle in the atlas image. A block the atlas lacks but that tinting covers
   * gets the rectangle of its tinted canvas from getTintedTexture instead.
   */
  getBlockFaceCoords(blockId: string, faceIndex: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (!this.atlasMetadata) return null;

    const blockUV = this.atlasMetadata.blockFaceUV[blockId];
    if (!blockUV) {
      return this.getTintedTextureCoords(blockId, faceIndex);
    }

    const faceUV = blockUV.faceUV[faceIndex];
    if (!faceUV) return null;

    const size = this.atlasMetadata.atlasSize;

    return {
      x: faceUV.u0 * size,
      y: faceUV.v0 * size,
      width: (faceUV.u1 - faceUV.u0) * size,
      height: (faceUV.v1 - faceUV.v0) * size,
    };
  }

  /**
   * Stained glass shares the plain glass texture and takes its color from the block registry.
   * Leaves and grass plants ship grayscale and need the biome tint.
   */
  private getTintedTextureCoords(blockId: string, faceIndex: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (!this.atlasMetadata) return null;

    const blockIdLower = blockId.toLowerCase();
    const blockName = blockIdLower.replace('minecraft:', '');

    const isGlass = blockName.includes('glass');
    const isLeaves = blockName.includes('leaves');
    const isGrass = blockName === 'grass' ||
                    blockName === 'tall_grass' ||
                    blockName === 'short_grass' ||
                    blockName === 'fern' ||
                    blockName === 'large_fern';

    if (!isGlass && !isLeaves && !isGrass) return null;

    let baseBlockId: string;
    let tintColor: string;

    if (isGlass) {
      baseBlockId = 'minecraft:glass';
      const block = blockRegistry.getBlock(blockId);
      if (!block) return null;
      tintColor = block.color;
    } else if (isLeaves) {
      baseBlockId = blockId;
      tintColor = '#48B518'; // Minecraft's default foliage green
    } else if (isGrass) {
      baseBlockId = blockId;
      tintColor = '#91BD59'; // Minecraft's default grass green
    } else {
      return null;
    }

    const baseUV = this.atlasMetadata.blockFaceUV[baseBlockId];
    if (!baseUV) return null;

    const faceUV = baseUV.faceUV[faceIndex];
    if (!faceUV) return null;

    const cacheKey = `${blockId}_${faceIndex}`;
    let tintedCanvas = this.tintedTextureCache.get(cacheKey);

    if (!tintedCanvas) {
      const created = this.createTintedTexture(faceUV, tintColor);
      if (created) {
        this.tintedTextureCache.set(cacheKey, created);
        tintedCanvas = created;
      }
    }

    if (!tintedCanvas) return null;

    // The tinted canvas holds exactly one texture
    return {
      x: 0,
      y: 0,
      width: tintedCanvas.width,
      height: tintedCanvas.height,
    };
  }

  /**
   * Multiplies the grayscale texture by the tint, as Minecraft does, then restores the texture's alpha,
   * which the multiply fill would otherwise make opaque.
   */
  private createTintedTexture(
    faceUV: { u0: number; v0: number; u1: number; v1: number },
    color: string
  ): HTMLCanvasElement | null {
    if (!this.atlas || !this.atlasMetadata) return null;

    const size = this.atlasMetadata.atlasSize;
    const textureSize = 16;

    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const sourceX = faceUV.u0 * size;
    const sourceY = faceUV.v0 * size;
    const sourceWidth = (faceUV.u1 - faceUV.u0) * size;
    const sourceHeight = (faceUV.v1 - faceUV.v0) * size;

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      this.atlas.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      textureSize,
      textureSize
    );

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, textureSize, textureSize);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(
      this.atlas.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      textureSize,
      textureSize
    );

    ctx.globalCompositeOperation = 'source-over';

    return canvas;
  }

  // Canvas2D view to Babylon box face index
  getFaceIndexForView(view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'): number {
    const faceMap: Record<string, number> = {
      'front': 0,  // +Z (south)
      'back': 1,   // -Z (north)
      'right': 2,  // +X (east)
      'left': 3,   // -X (west)
      'top': 4,    // +Y (top)
      'bottom': 5, // -Y (bottom)
    };
    return faceMap[view] ?? 0;
  }

  async waitForAtlas(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
  }

  getTintedTexture(blockId: string, faceIndex: number = 0): HTMLCanvasElement | null {
    const cacheKey = `${blockId}_${faceIndex}`;
    const cached = this.tintedTextureCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Only single-texture blocks tint. grass_block has its own colored faces, so it is matched out by name.
    const blockIdLower = blockId.toLowerCase();
    const blockName = blockIdLower.replace('minecraft:', '');

    const needsTinting =
      blockName.includes('glass') ||
      blockName.includes('leaves') ||
      (blockName === 'grass' ||
       blockName === 'tall_grass' ||
       blockName === 'short_grass' ||
       blockName === 'fern' ||
       blockName === 'large_fern');

    if (!needsTinting || !this.atlasMetadata) {
      return null;
    }

    let baseBlockId = blockId;
    let tintColor: string;

    if (blockIdLower.includes('glass')) {
      baseBlockId = 'minecraft:glass';
      const block = blockRegistry.getBlock(blockId);
      if (!block) return null;
      tintColor = block.color;
    } else if (blockIdLower.includes('leaves')) {
      tintColor = '#48B518'; // Minecraft's default foliage green
    } else if (blockIdLower.includes('grass')) {
      tintColor = '#91BD59'; // Minecraft's default grass green
    } else {
      return null;
    }

    const baseUV = this.atlasMetadata.blockFaceUV[baseBlockId];
    if (!baseUV) return null;

    const faceUV = baseUV.faceUV[faceIndex];
    if (!faceUV) return null;

    const tintedCanvas = this.createTintedTexture(faceUV, tintColor);
    if (tintedCanvas) {
      this.tintedTextureCache.set(cacheKey, tintedCanvas);
      return tintedCanvas;
    }

    return null;
  }
}

export const textureResolver = TextureResolver.getInstance();
