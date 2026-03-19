/**
 * MaterialResolver - Resolves which BabylonJS material to apply for a given block
 *
 * Handles the 3-tier fallback: tinted texture -> atlas -> color.
 * Caches materials per block type and ghost/delete variants.
 */

import {
  StandardMaterial,
  Color3,
  Texture,
  Scene,
} from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { textureManager } from '../TextureManager';
import { hexToColor3 } from './babylonUtils';

export class MaterialResolver {
  private scene: Scene;

  // Cached materials (one per block type)
  private materials = new Map<string, StandardMaterial>();

  // Cached ghost materials (semi-transparent versions for preview)
  private ghostMaterials = new Map<string, StandardMaterial>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Resolve the material for a block type (using atlas texture, tinted texture, or color fallback)
   */
  resolve(blockId: string): StandardMaterial {
    const block = blockRegistry.getBlock(blockId);
    if (!block) {
      console.warn(`Block not found in registry: ${blockId}`);
      return this.createColorMaterial('unknown', '#7f7f7f');
    }

    // Extract block name for type checking
    const blockIdLower = blockId.toLowerCase();
    const blockName = blockIdLower.replace('minecraft:', '');

    // Check cache first
    if (this.materials.has(blockId)) {
      return this.materials.get(blockId)!;
    }

    const material = new StandardMaterial(`material_${blockId}`, this.scene);

    // Try tinted texture first (for glass, grass, leaves)
    const tintedTexture = textureManager.getTintedTexture(blockId, 0);
    if (tintedTexture) {
      // Create BabylonJS texture from tinted canvas
      const babylonTexture = new Texture(
        tintedTexture.toDataURL(),
        this.scene,
        false,
        false,
        Texture.NEAREST_SAMPLINGMODE
      );

      material.diffuseTexture = babylonTexture;

      // Handle transparency based on block type
      if (blockName.includes('glass')) {
        // Glass: uniform semi-transparency
        material.alpha = 0.15;
        material.backFaceCulling = true;
        material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        material.needDepthPrePass = true;
        material.specularColor = new Color3(0.3, 0.3, 0.3);
      } else if (blockName.includes('leaves') ||
                 blockName === 'grass' ||
                 blockName === 'tall_grass' ||
                 blockName === 'short_grass' ||
                 blockName === 'fern') {
        // Leaves and grass plants: per-pixel alpha from tinted texture
        babylonTexture.hasAlpha = true;
        material.useAlphaFromDiffuseTexture = true;
        material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
        material.backFaceCulling = false;
        material.needDepthPrePass = true;
        material.specularColor = new Color3(0.2, 0.2, 0.2);
      }

      this.materials.set(blockId, material);
      return material;
    }

    // Create per-block atlas material (allows customization per block)
    const atlasMaterial = this.createAtlasMaterial(blockId, block, blockName);
    if (atlasMaterial) {
      this.materials.set(blockId, atlasMaterial);
      return atlasMaterial;
    }

    // Fallback to color if atlas not available
    material.diffuseColor = hexToColor3(block.color);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    this.materials.set(blockId, material);
    return material;
  }

  /**
   * Resolve ghost material (semi-transparent version for preview)
   */
  resolveGhost(color: string): StandardMaterial {
    if (this.ghostMaterials.has(color)) {
      return this.ghostMaterials.get(color)!;
    }

    const material = new StandardMaterial(`ghost_${color}`, this.scene);
    material.diffuseColor = hexToColor3(color);
    material.specularColor = new Color3(0.3, 0.3, 0.3);
    material.alpha = 0.5;
    material.transparencyMode = 2;

    this.ghostMaterials.set(color, material);
    return material;
  }

  /**
   * Resolve delete ghost material (semi-transparent with red tint)
   */
  resolveDeleteGhost(color: string): StandardMaterial {
    const deleteKey = `delete_${color}`;

    if (this.ghostMaterials.has(deleteKey)) {
      return this.ghostMaterials.get(deleteKey)!;
    }

    const material = new StandardMaterial(`ghost_delete_${color}`, this.scene);
    const baseColor = hexToColor3(color);

    // Mix original color with red (60% original, 40% red)
    material.diffuseColor = new Color3(
      baseColor.r * 0.6 + 1.0 * 0.4,
      baseColor.g * 0.6,
      baseColor.b * 0.6
    );

    material.specularColor = new Color3(0.3, 0.1, 0.1);
    material.emissiveColor = new Color3(0.2, 0, 0);
    material.alpha = 0.6;
    material.transparencyMode = 2;

    this.ghostMaterials.set(deleteKey, material);
    return material;
  }

  /**
   * Clear all cached materials (call on atlas reload)
   */
  clearAllCaches(): void {
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();

    for (const material of this.ghostMaterials.values()) {
      material.dispose();
    }
    this.ghostMaterials.clear();
  }

  /**
   * Create a per-block atlas material
   */
  private createAtlasMaterial(blockId: string, block: any, blockName: string): StandardMaterial | null {
    const atlas = textureManager.getAtlas();
    if (!atlas || !atlas.loaded) {
      return null;
    }

    const material = new StandardMaterial(`atlas_${blockId}`, this.scene);

    const babylonTexture = new Texture(
      atlas.path,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );

    babylonTexture.hasAlpha = true;
    babylonTexture.getAlphaFromRGB = false;

    material.diffuseTexture = babylonTexture;
    material.specularColor = new Color3(0.2, 0.2, 0.2);

    const needsAlphaCutout =
      blockName.includes('vine') ||
      blockName.includes('fence') ||
      blockName.includes('door') ||
      blockName.includes('trapdoor');

    if (needsAlphaCutout) {
      material.useAlphaFromDiffuseTexture = true;
      material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
      material.backFaceCulling = false;
      material.needDepthPrePass = true;
    } else if (block.isTransparent) {
      material.useAlphaFromDiffuseTexture = true;
      material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
      material.needDepthPrePass = true;
    }

    return material;
  }

  /**
   * Create a simple color-based material
   */
  private createColorMaterial(id: string, color: string): StandardMaterial {
    const material = new StandardMaterial(`material_${id}`, this.scene);
    material.diffuseColor = hexToColor3(color);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    return material;
  }

  destroy(): void {
    this.clearAllCaches();
  }
}
