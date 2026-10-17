/**
 * EmissiveLighting - A point light at each luminous block, colored from the block's registry color
 *
 * Each light fades linearly to zero at the block's Minecraft light level, as Minecraft light drops one level per block.
 * Babylon adds overlapping lights where Minecraft takes the brightest. An inverse-square falloff turns that sum
 * into a blowout on a block ringed by wall torches half a block away, and linear falloff keeps it bounded.
 */

import { Light, PointLight, Color3, Scene } from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { isLuminousBlock, getLightLevel } from './PBRCategoryMap';
import { toBabylonVector, centerInCell, positionKey, hexToColor3 } from './babylonUtils';

import type { BlockData } from '../../types';

const DEFAULT_LIGHT_COLOR = new Color3(1, 0.9, 0.7);

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
      // An unlit campfire gives no light
      if (blockData.blockState?.lit === false || (blockData.blockState?.lit as unknown) === 'false') continue;

      const key = positionKey(blockData.position);
      luminousKeys.add(key);

      if (this.lights.has(key)) continue;

      const block = blockRegistry.getBlock(blockData.blockType);
      const color = block ? hexToColor3(block.color) : DEFAULT_LIGHT_COLOR;
      const babylonPos = toBabylonVector(centerInCell(blockData.position));

      const light = new PointLight(`emissive_${key}`, babylonPos, this.scene);
      light.diffuse = color;
      light.intensity = this.intensity;
      light.range = getLightLevel(blockData.blockType);
      light.falloffType = Light.FALLOFF_STANDARD;
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
