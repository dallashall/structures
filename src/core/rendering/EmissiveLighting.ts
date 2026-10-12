/**
 * EmissiveLighting - A point light at each luminous block, colored from the block's registry color
 *
 * Babylon's PointLight.range decides both which meshes a light affects (canAffectMesh) and its falloff.
 * Babylon picks lights per base mesh, not per instance, so a short range drops a light from a base whose
 * nearest instances sit right beside it. INCLUSION_RANGE is large so every base includes every light,
 * and the glTF 1/r² falloff handles attenuation.
 */

import { PointLight, Color3, Scene } from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { isLuminousBlock } from './PBRCategoryMap';
import { toBabylonVector, centerInCell, positionKey, hexToColor3 } from './babylonUtils';

import type { BlockData } from '../../types';

const DEFAULT_LIGHT_COLOR = new Color3(1, 0.9, 0.7);

const INCLUSION_RANGE = 50;

export class EmissiveLighting {
  private scene: Scene;
  private lights = new Map<string, PointLight>();
  private intensity: number;

  constructor(scene: Scene, intensity: number) {
    this.scene = scene;
    this.intensity = intensity;
  }

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
      // Light.FALLOFF_GLTF: 1/r² with a smooth cutoff at range
      light.falloffType = 2;
      this.lights.set(key, light);
    }

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
