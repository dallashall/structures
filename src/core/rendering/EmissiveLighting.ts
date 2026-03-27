/**
 * EmissiveLighting - PointLight management for luminous blocks
 *
 * Creates and manages BabylonJS PointLights at luminous block positions
 * so they illuminate surrounding surfaces. Light color is derived from
 * the block's color in the registry. Intensity is controlled by the
 * active lighting preset.
 *
 * LIGHT RANGE STRATEGY:
 * PointLight.range in BabylonJS controls BOTH mesh-inclusion checks
 * (canAffectMesh) and visual falloff. With instanced meshes, BabylonJS
 * selects lights per-base-mesh, not per-instance. A small range causes
 * lights to be excluded from distant base meshes entirely, even if some
 * instances ARE close. We use a large range (50) so all meshes include
 * all lights, and rely on the GLTF 1/r² falloff for natural attenuation.
 */

import { PointLight, Color3, Scene } from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { isLuminousBlock } from './PBRCategoryMap';
import { toBabylonVector, centerInCell, positionKey, hexToColor3 } from './babylonUtils';

import type { BlockData } from '../../types';

const DEFAULT_LIGHT_COLOR = new Color3(1, 0.9, 0.7);

// Large range ensures all meshes include point lights in their shader.
// Visual attenuation is handled by the GLTF 1/r² falloff + intensity.
const INCLUSION_RANGE = 50;

export class EmissiveLighting {
  private scene: Scene;
  private lights = new Map<string, PointLight>();
  private intensity: number;

  constructor(scene: Scene, intensity: number) {
    this.scene = scene;
    this.intensity = intensity;
  }

  /**
   * Sync point lights with current block state.
   * Creates lights for new luminous blocks, removes lights for removed blocks.
   */
  syncLights(allBlocks: BlockData[]): void {
    const luminousKeys = new Set<string>();

    for (const blockData of allBlocks) {
      if (!isLuminousBlock(blockData.blockType)) continue;

      const key = positionKey(blockData.position);
      luminousKeys.add(key);

      if (this.lights.has(key)) continue;

      const block = blockRegistry.getBlock(blockData.blockType);
      const color = block ? hexToColor3(block.color) : DEFAULT_LIGHT_COLOR;
      const babylonPos = toBabylonVector(centerInCell(blockData.position));

      const light = new PointLight(`emissive_${key}`, babylonPos, this.scene);
      light.diffuse = color;
      light.intensity = this.intensity;
      light.range = INCLUSION_RANGE;
      light.falloffType = 2; // FALLOFF_GLTF: 1/r² with smooth envelope
      this.lights.set(key, light);
    }

    // Remove lights for blocks that no longer exist
    for (const [key, light] of this.lights.entries()) {
      if (!luminousKeys.has(key)) {
        light.dispose();
        this.lights.delete(key);
      }
    }
  }

  setIntensity(intensity: number): void {
    this.intensity = intensity;
    for (const light of this.lights.values()) {
      light.intensity = intensity;
    }
  }

  clearAll(): void {
    for (const light of this.lights.values()) {
      light.dispose();
    }
    this.lights.clear();
  }

  dispose(): void {
    this.clearAll();
  }
}
