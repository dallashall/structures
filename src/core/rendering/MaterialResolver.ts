/**
 * MaterialResolver - Resolves which BabylonJS material to apply for a given block
 *
 * Handles the 3-tier fallback: tinted texture -> atlas -> color.
 * Supports both StandardMaterial and PBR material paths.
 * Caches materials per block type and ghost/delete variants.
 */

import {
  StandardMaterial,
  PBRMaterial,
  Color3,
  Texture,
  Scene,
  Material,
} from '@babylonjs/core';
import type { BaseTexture } from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { textureResolver } from '../TextureResolver';
import { hexToColor3 } from './babylonUtils';
import { resolvePBRCategory, isLuminousBlock } from './PBRCategoryMap';

export class MaterialResolver {
  private scene: Scene;
  private pbrEnabled = false;
  private emissiveScale = 0.3;

  // Cached materials (one per block type)
  private materials = new Map<string, Material>();

  // Cached ghost materials (semi-transparent versions for preview, always StandardMaterial)
  private ghostMaterials = new Map<string, StandardMaterial>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Enable or disable PBR materials. Clears cache when toggled.
   */
  setPBREnabled(enabled: boolean): void {
    if (this.pbrEnabled !== enabled) {
      this.pbrEnabled = enabled;
      // Cache must be cleared since material types change
      for (const material of this.materials.values()) {
        material.dispose();
      }
      this.materials.clear();
    }
  }

  /**
   * Set the emissive scale applied to luminous block materials.
   * Call when lighting preset changes. Clears cache to force rebuild.
   */
  setEmissiveScale(scale: number): void {
    if (this.emissiveScale !== scale) {
      this.emissiveScale = scale;
      for (const material of this.materials.values()) {
        material.dispose();
      }
      this.materials.clear();
    }
  }

  /**
   * Resolve the material for a block type (using atlas texture, tinted texture, or color fallback)
   */
  resolve(blockId: string): Material {
    const block = blockRegistry.getBlock(blockId);
    if (!block) {
      console.warn(`Block not found in registry: ${blockId}`);
      return this.pbrEnabled
        ? this.createPBRColorMaterial('unknown', '#7f7f7f')
        : this.createColorMaterial('unknown', '#7f7f7f');
    }

    const blockIdLower = blockId.toLowerCase();
    const blockName = blockIdLower.replace('minecraft:', '');

    // Check cache first
    if (this.materials.has(blockId)) {
      return this.materials.get(blockId)!;
    }

    const material = this.pbrEnabled
      ? this.createPBRBlockMaterial(blockId, block, blockName)
      : this.createStandardBlockMaterial(blockId, block, blockName);

    // Allow more simultaneous lights (default 4 only leaves 2 slots after
    // hemispheric + directional; 8 leaves 6 for nearby emissive point lights)
    material.maxSimultaneousLights = 32;

    this.materials.set(blockId, material);
    return material;
  }

  /**
   * Resolve ghost material (semi-transparent version for preview)
   * Ghost materials always use StandardMaterial regardless of PBR setting.
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
   * Clear all cached materials (call on atlas reload or PBR toggle)
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

  // ---- Standard Material Path ----

  private createStandardBlockMaterial(blockId: string, block: any, blockName: string): StandardMaterial {
    // Try tinted texture first (for glass, grass, leaves)
    const tintedTexture = textureResolver.getTintedTexture(blockId, 0);
    let material: StandardMaterial;

    if (tintedTexture) {
      material = this.createStandardTintedMaterial(blockId, blockName, tintedTexture);
    } else {
      const atlasMaterial = this.createStandardAtlasMaterial(blockId, block, blockName);
      material = atlasMaterial ?? this.createColorMaterial(blockId, block.color);
    }

    if (isLuminousBlock(blockName)) {
      this.applyGlow(material, material.diffuseTexture, block.color);
    }

    return material;
  }

  private createStandardTintedMaterial(
    blockId: string,
    blockName: string,
    tintedTexture: HTMLCanvasElement
  ): StandardMaterial {
    const material = new StandardMaterial(`material_${blockId}`, this.scene);
    const babylonTexture = new Texture(
      tintedTexture.toDataURL(),
      this.scene, false, false,
      Texture.NEAREST_SAMPLINGMODE
    );

    material.diffuseTexture = babylonTexture;

    if (blockName.includes('glass')) {
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
      babylonTexture.hasAlpha = true;
      material.useAlphaFromDiffuseTexture = true;
      material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
      material.backFaceCulling = false;
      material.needDepthPrePass = true;
      material.specularColor = new Color3(0.2, 0.2, 0.2);
    }

    return material;
  }

  private createStandardAtlasMaterial(blockId: string, block: any, blockName: string): StandardMaterial | null {
    const atlas = textureResolver.getAtlas();
    if (!atlas || !atlas.loaded) return null;

    const material = new StandardMaterial(`atlas_${blockId}`, this.scene);
    const babylonTexture = new Texture(
      atlas.path, this.scene, false, false,
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

  private createColorMaterial(id: string, color: string): StandardMaterial {
    const material = new StandardMaterial(`material_${id}`, this.scene);
    material.diffuseColor = hexToColor3(color);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    return material;
  }

  // ---- PBR Material Path ----

  private createPBRBlockMaterial(blockId: string, block: any, blockName: string): PBRMaterial {
    // Try tinted texture first (for glass, grass, leaves)
    const tintedTexture = textureResolver.getTintedTexture(blockId, 0);
    if (tintedTexture) {
      return this.createPBRTintedMaterial(blockId, blockName, block, tintedTexture);
    }

    // Try atlas
    const atlasMaterial = this.createPBRAtlasMaterial(blockId, block, blockName);
    if (atlasMaterial) return atlasMaterial;

    // Fallback to color
    return this.createPBRColorMaterial(blockId, block.color);
  }

  private createPBRTintedMaterial(
    blockId: string,
    blockName: string,
    block: any,
    tintedTexture: HTMLCanvasElement
  ): PBRMaterial {
    const preset = resolvePBRCategory(blockId);
    const material = new PBRMaterial(`pbr_${blockId}`, this.scene);
    const babylonTexture = new Texture(
      tintedTexture.toDataURL(),
      this.scene, false, false,
      Texture.NEAREST_SAMPLINGMODE
    );

    material.albedoTexture = babylonTexture;
    material.metallic = preset.metallic;
    material.roughness = preset.roughness;

    if (blockName.includes('glass')) {
      material.alpha = 0.15;
      material.backFaceCulling = true;
      material.transparencyMode = PBRMaterial.MATERIAL_ALPHABLEND;
      material.needDepthPrePass = true;
    } else if (blockName.includes('leaves') ||
               blockName === 'grass' ||
               blockName === 'tall_grass' ||
               blockName === 'short_grass' ||
               blockName === 'fern') {
      babylonTexture.hasAlpha = true;
      material.useAlphaFromAlbedoTexture = true;
      material.transparencyMode = PBRMaterial.MATERIAL_ALPHABLEND;
      material.backFaceCulling = false;
      material.needDepthPrePass = true;
    }

    if (isLuminousBlock(blockName)) {
      this.applyGlow(material, babylonTexture, block.color);
    }

    return material;
  }

  private createPBRAtlasMaterial(blockId: string, block: any, blockName: string): PBRMaterial | null {
    const atlas = textureResolver.getAtlas();
    if (!atlas || !atlas.loaded) return null;

    const preset = resolvePBRCategory(blockId);
    const material = new PBRMaterial(`pbr_atlas_${blockId}`, this.scene);
    const babylonTexture = new Texture(
      atlas.path, this.scene, false, false,
      Texture.NEAREST_SAMPLINGMODE
    );

    babylonTexture.hasAlpha = true;
    babylonTexture.getAlphaFromRGB = false;

    material.albedoTexture = babylonTexture;
    material.metallic = preset.metallic;
    material.roughness = preset.roughness;

    const needsAlphaCutout =
      blockName.includes('vine') ||
      blockName.includes('fence') ||
      blockName.includes('door') ||
      blockName.includes('trapdoor');

    if (needsAlphaCutout) {
      material.useAlphaFromAlbedoTexture = true;
      material.transparencyMode = PBRMaterial.MATERIAL_ALPHABLEND;
      material.backFaceCulling = false;
      material.needDepthPrePass = true;
    } else if (block.isTransparent) {
      material.useAlphaFromAlbedoTexture = true;
      material.transparencyMode = PBRMaterial.MATERIAL_ALPHABLEND;
      material.needDepthPrePass = true;
    }

    if (isLuminousBlock(blockName)) {
      this.applyGlow(material, babylonTexture, block.color);
    }

    return material;
  }

  private createPBRColorMaterial(id: string, color: string): PBRMaterial {
    const preset = resolvePBRCategory(id);
    const material = new PBRMaterial(`pbr_${id}`, this.scene);
    material.albedoColor = hexToColor3(color);
    material.metallic = preset.metallic;
    material.roughness = preset.roughness;

    if (isLuminousBlock(id)) {
      this.applyGlow(material, null, color);
    }

    return material;
  }

  /**
   * Make a luminous block glow with its own texture, so the pattern stays visible
   * instead of washing out under a flat tint. A scale above 1 pushes the face past
   * the bloom threshold. A scale at or below 0 leaves the block lit like any other.
   */
  private applyGlow(
    material: PBRMaterial | StandardMaterial,
    texture: BaseTexture | null,
    color: string,
  ): void {
    if (this.emissiveScale <= 0) return;

    if (texture) {
      material.emissiveTexture = texture;
      material.emissiveColor = Color3.White().scale(this.emissiveScale);
    } else {
      material.emissiveColor = hexToColor3(color).scale(this.emissiveScale);
    }
  }

  destroy(): void {
    this.clearAllCaches();
  }
}
