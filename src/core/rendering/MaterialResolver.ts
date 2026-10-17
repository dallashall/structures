/**
 * MaterialResolver - The material for each block type, cached
 *
 * Source order: tinted texture (glass, grass, leaves), then the atlas, then the block's flat color.
 * A render setting picks StandardMaterial or PBR. Ghost previews always use StandardMaterial.
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

/**
 * Ghosts ignore scene lights, so every face shows the same tint under any lighting preset.
 * With lighting disabled, StandardMaterial outputs its emissive color alone.
 */
function applyUnlitColor(material: StandardMaterial, color: Color3): void {
  material.disableLighting = true;
  material.emissiveColor = color;
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
}

export class MaterialResolver {
  private scene: Scene;
  private pbrEnabled = false;
  private emissiveScale = 0.3;

  private materials = new Map<string, Material>();

  private ghostMaterials = new Map<string, StandardMaterial>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  setPBREnabled(enabled: boolean): void {
    if (this.pbrEnabled !== enabled) {
      this.pbrEnabled = enabled;
      for (const material of this.materials.values()) {
        material.dispose();
      }
      this.materials.clear();
    }
  }

  /**
   * Rebuilds every cached material when the scale changes
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

    if (this.materials.has(blockId)) {
      return this.materials.get(blockId)!;
    }

    const material = this.pbrEnabled
      ? this.createPBRBlockMaterial(blockId, block, blockName)
      : this.createStandardBlockMaterial(blockId, block, blockName);

    // Babylon's default of 4 leaves 2 slots after the hemispheric and directional lights.
    // The rest go to nearby emissive point lights.
    material.maxSimultaneousLights = 32;

    this.materials.set(blockId, material);
    return material;
  }

  resolveGhost(color: string): StandardMaterial {
    if (this.ghostMaterials.has(color)) {
      return this.ghostMaterials.get(color)!;
    }

    const material = new StandardMaterial(`ghost_${color}`, this.scene);
    applyUnlitColor(material, hexToColor3(color));
    material.alpha = 0.5;
    material.transparencyMode = 2;

    this.ghostMaterials.set(color, material);
    return material;
  }

  resolveDeleteGhost(color: string): StandardMaterial {
    const deleteKey = `delete_${color}`;

    if (this.ghostMaterials.has(deleteKey)) {
      return this.ghostMaterials.get(deleteKey)!;
    }

    const material = new StandardMaterial(`ghost_delete_${color}`, this.scene);
    const baseColor = hexToColor3(color);

    applyUnlitColor(material, new Color3(
      baseColor.r * 0.6 + 1.0 * 0.4,
      baseColor.g * 0.6,
      baseColor.b * 0.6
    ));
    material.alpha = 0.6;
    material.transparencyMode = 2;

    this.ghostMaterials.set(deleteKey, material);
    return material;
  }

  /**
   * Call when the atlas reloads
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

  private createStandardBlockMaterial(blockId: string, block: any, blockName: string): StandardMaterial {
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
      blockName.includes('torch') ||
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

  private createPBRBlockMaterial(blockId: string, block: any, blockName: string): PBRMaterial {
    const tintedTexture = textureResolver.getTintedTexture(blockId, 0);
    if (tintedTexture) {
      return this.createPBRTintedMaterial(blockId, blockName, block, tintedTexture);
    }

    const atlasMaterial = this.createPBRAtlasMaterial(blockId, block, blockName);
    if (atlasMaterial) return atlasMaterial;

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
      blockName.includes('torch') ||
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
