import { EventEmitter } from './EventEmitter';
import type { AtlasMetadata, LoadedTexture } from '../types';

/**
 * TextureManager - Manages texture atlas and block UV mapping
 *
 * Singleton class that provides:
 * - Texture atlas loading (Minecraft-style stitched textures)
 * - Atlas metadata with UV coordinates per block face
 * - Fallback to colors when atlas unavailable
 *
 * Events:
 * - atlas:loaded - When the atlas finishes loading
 * - atlas:error - When the atlas fails to load
 */
class TextureManager extends EventEmitter {
  private static instance: TextureManager;

  private atlas: LoadedTexture | null = null;
  private atlasMetadata: AtlasMetadata | null = null;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {
    super();
    // Auto-load atlas on construction
    this.loadAtlas();
  }

  static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
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
      const metadataResponse = await fetch('/pixelbox-atlas.json');
      if (!metadataResponse.ok) {
        throw new Error(`Failed to load atlas metadata: ${metadataResponse.statusText}`);
      }
      this.atlasMetadata = await metadataResponse.json();

      // Load atlas image
      const atlasImage = new Image();
      atlasImage.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        atlasImage.onload = () => resolve();
        atlasImage.onerror = () => reject(new Error('Failed to load atlas image'));
        atlasImage.src = '/pixelbox-atlas.png';
      });

      this.atlas = {
        id: 'pixelbox-atlas',
        path: '/pixelbox-atlas.png',
        image: atlasImage,
        width: atlasImage.width,
        height: atlasImage.height,
        loaded: true,
      };

      this.emit('atlas:loaded', this.atlas);
      console.log('✅ Texture atlas loaded:', {
        size: `${this.atlas.width}x${this.atlas.height}`,
        textures: this.atlasMetadata?.textureCount || 0,
      });
    } catch (error) {
      this.emit('atlas:error', error);
      console.error('❌ Failed to load texture atlas:', error);
      throw error;
    }
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
   */
  getBlockFaceCoords(blockId: string, faceIndex: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (!this.atlasMetadata) return null;

    const blockUV = this.atlasMetadata.blockFaceUV[blockId];
    if (!blockUV) return null;

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
}

export const textureManager = TextureManager.getInstance();
