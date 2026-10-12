import { EventEmitter } from './EventEmitter';
import type { AtlasMetadata, LoadedTexture } from '../types';
import { blockRegistry } from './BlockRegistry';

/**
 * TextureResolver - Manages texture atlas and block UV mapping
 *
 * Singleton class that provides:
 * - Texture atlas loading (Minecraft-style stitched textures)
 * - Atlas metadata with UV coordinates per block face
 * - Fallback to colors when atlas unavailable
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

  // Cache for dynamically generated tinted textures
  private tintedTextureCache = new Map<string, HTMLCanvasElement>();

  private constructor() {
    super();
    // Auto-load atlas on construction
    this.loadAtlas();
  }

  static getInstance(): TextureResolver {
    if (!TextureResolver.instance) {
      TextureResolver.instance = new TextureResolver();
    }
    return TextureResolver.instance;
  }

  /**
   * Load the pre-computed texture atlas and metadata
   */
  private async loadAtlas(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadAtlasInternal();
    return this.loadingPromise;
  }

  private async loadAtlasInternal(): Promise<void> {
    try {
      // Load metadata first
      const metadataResponse = await fetch('/atlas.json');
      if (!metadataResponse.ok) {
        throw new Error(`Failed to load atlas metadata: ${metadataResponse.statusText}`);
      }
      this.atlasMetadata = await metadataResponse.json();

      // Load atlas image
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

  /**
   * Get the loaded atlas image
   */
  getAtlas(): LoadedTexture | null {
    return this.atlas;
  }

  /**
   * Get atlas metadata
   */
  getAtlasMetadata(): AtlasMetadata | null {
    return this.atlasMetadata;
  }

  /**
   * Check if atlas is loaded
   */
  isAtlasLoaded(): boolean {
    return this.atlas !== null && this.atlas.loaded;
  }

  /**
   * Get UV coordinates for a block's faces (for 2D Canvas rendering)
   * Returns face UV array for BabylonJS faceUV option
   */
  getBlockFaceUV(blockId: string): Array<{ u0: number; v0: number; u1: number; v1: number }> | null {
    if (!this.atlasMetadata) return null;
    const blockUV = this.atlasMetadata.blockFaceUV[blockId];
    if (!blockUV) return null;
    return blockUV.faceUV;
  }

  /**
   * Get UV coordinates for a block's faces (for 3D Babylon rendering)
   * Uses swapped and rotated textures for left/right faces
   */
  getBlockFaceUV3D(blockId: string): Array<{ u0: number; v0: number; u1: number; v1: number }> | null {
    if (!this.atlasMetadata) return null;
    const blockUV = this.atlasMetadata.blockFaceUV3D[blockId];
    if (!blockUV) return null;
    return blockUV.faceUV;
  }

  /**
   * Get texture coordinates for a specific block face (for Canvas2D)
   * Returns pixel coordinates in the atlas image
   * Falls back to tinted base texture for missing glass variants
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
      // Texture not in atlas - try to create tinted variant for glass blocks
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
   * Get or create tinted texture coordinates for blocks missing from atlas
   * Used for glass variants that share a base texture but need different colors
   * Also used for grass and leaves that need biome tinting
   */
  private getTintedTextureCoords(blockId: string, faceIndex: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (!this.atlasMetadata) return null;

    // Check if this block needs tinting (single-texture blocks only)
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

    // Determine base texture and tint color
    let baseBlockId: string;
    let tintColor: string;

    if (isGlass) {
      // Glass blocks use base glass texture with custom color
      baseBlockId = 'minecraft:glass';
      const block = blockRegistry.getBlock(blockId);
      if (!block) return null;
      tintColor = block.color;
    } else if (isLeaves) {
      // Leaves use their own texture with green tint
      baseBlockId = blockId;
      tintColor = '#48B518'; // Minecraft's default foliage green
    } else if (isGrass) {
      // Grass uses its own texture with green tint
      baseBlockId = blockId;
      tintColor = '#91BD59'; // Minecraft's default grass green
    } else {
      return null;
    }

    // Try to find base texture in atlas
    const baseUV = this.atlasMetadata.blockFaceUV[baseBlockId];
    if (!baseUV) return null;

    const faceUV = baseUV.faceUV[faceIndex];
    if (!faceUV) return null;

    // Create or get cached tinted texture
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

    // Return coordinates for the tinted canvas (full canvas = one texture)
    return {
      x: 0,
      y: 0,
      width: tintedCanvas.width,
      height: tintedCanvas.height,
    };
  }

  /**
   * Create a tinted version of a base texture
   * Combines base texture with a color tint
   * Color underneath, grayscale texture on top (Minecraft-style tinting)
   */
  private createTintedTexture(
    faceUV: { u0: number; v0: number; u1: number; v1: number },
    color: string
  ): HTMLCanvasElement | null {
    if (!this.atlas || !this.atlasMetadata) return null;

    const size = this.atlasMetadata.atlasSize;
    const textureSize = 16; // Standard Minecraft texture size

    // Create canvas for tinted texture
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Extract base texture from atlas
    const sourceX = faceUV.u0 * size;
    const sourceY = faceUV.v0 * size;
    const sourceWidth = (faceUV.u1 - faceUV.u0) * size;
    const sourceHeight = (faceUV.v1 - faceUV.v0) * size;

    ctx.imageSmoothingEnabled = false;

    // Draw the base texture first (preserves alpha channel)
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

    // Apply color tint using multiply blend (preserves alpha)
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, textureSize, textureSize);

    // Restore alpha from original texture (in case multiply affected it)
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

  /**
   * Get face index for a view direction
   * Maps Canvas2D views to BabylonJS face indices
   */
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

  /**
   * Wait for atlas to load (for initialization)
   */
  async waitForAtlas(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
  }

  /**
   * Get tinted texture canvas for a block
   * Returns the cached canvas or creates it if needed
   * Used by renderers to get the actual image data for tinted textures
   * Supports grass, leaves, and glass tinting
   */
  getTintedTexture(blockId: string, faceIndex: number = 0): HTMLCanvasElement | null {
    const cacheKey = `${blockId}_${faceIndex}`;
    const cached = this.tintedTextureCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Check if this block needs tinting (single-texture blocks only)
    // Exclude multi-face blocks like grass_block, podzol, mycelium
    const blockIdLower = blockId.toLowerCase();
    const blockName = blockIdLower.replace('minecraft:', '');

    const needsTinting =
      blockName.includes('glass') || // Glass and stained glass variants
      blockName.includes('leaves') || // All leaf types
      (blockName === 'grass' || // Grass plant (exact match, not grass_block)
       blockName === 'tall_grass' ||
       blockName === 'short_grass' ||
       blockName === 'fern' ||
       blockName === 'large_fern');

    if (!needsTinting || !this.atlasMetadata) {
      return null;
    }

    // Determine base texture and tint color
    let baseBlockId = blockId;
    let tintColor: string;

    if (blockIdLower.includes('glass')) {
      // Glass blocks use base glass texture with custom color from block registry
      baseBlockId = 'minecraft:glass';
      const block = blockRegistry.getBlock(blockId);
      if (!block) return null;
      tintColor = block.color;
    } else if (blockIdLower.includes('leaves')) {
      // Leaves use their own texture with green tint
      tintColor = '#48B518'; // Minecraft's default foliage green
    } else if (blockIdLower.includes('grass')) {
      // Grass uses its own texture with green tint
      tintColor = '#91BD59'; // Minecraft's default grass green
    } else {
      return null;
    }

    // Get UV coordinates from atlas
    const baseUV = this.atlasMetadata.blockFaceUV[baseBlockId];
    if (!baseUV) return null;

    const faceUV = baseUV.faceUV[faceIndex];
    if (!faceUV) return null;

    // Create tinted texture (color underneath, grayscale texture on top)
    const tintedCanvas = this.createTintedTexture(faceUV, tintColor);
    if (tintedCanvas) {
      this.tintedTextureCache.set(cacheKey, tintedCanvas);
      return tintedCanvas;
    }

    return null;
  }
}

export const textureResolver = TextureResolver.getInstance();
