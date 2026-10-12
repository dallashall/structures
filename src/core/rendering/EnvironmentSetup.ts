/**
 * EnvironmentSetup - Image-based lighting from the prefiltered sky baked for each preset (scripts/generateEnvironments.ts)
 *
 * Without an environment texture, metallic PBR surfaces render black.
 */

import {
  CubeTexture,
  Scene,
} from '@babylonjs/core';

import { environmentUrl } from './SkyPresets';

import type { LightingPreset } from '../../types';

/**
 * Resolves with null when the file fails to load, so a missing file never stalls the caller.
 * Create post-processing only after the first load resolves. Babylon's internal RGBD decode
 * post-process otherwise collides with DefaultRenderingPipeline and throws "Cannot read 'scale'".
 */
export function loadEnvironment(scene: Scene, preset: LightingPreset): Promise<CubeTexture | null> {
  const loadTexture = (resolve: (texture: CubeTexture | null) => void): void => {
    const handleTextureReady = (): void => { resolve(envTexture); };

    const handleTextureError = (message?: string): void => {
      console.warn('Failed to load environment texture, PBR reflections will be limited:', message);
      envTexture.dispose();
      resolve(null);
    };

    // Mirrors CubeTexture.CreateFromPrefilteredData, which takes no error callback.
    // Delayed loading would defer the request until a material first samples the texture.
    const delayedLoading = scene.useDelayedTextureLoading;
    scene.useDelayedTextureLoading = false;
    const envTexture = new CubeTexture(
      environmentUrl(preset), scene, null, false, null,
      null, handleTextureError, undefined, true, null, true,
    );
    scene.useDelayedTextureLoading = delayedLoading;

    if (envTexture.isReady()) {
      handleTextureReady();
    } else {
      envTexture.onLoadObservable.addOnce(handleTextureReady);
    }
  };

  return new Promise(loadTexture);
}

/**
 * Make a loaded texture the scene environment and dispose the one it replaces
 */
export function applyEnvironment(scene: Scene, texture: CubeTexture, intensity: number): void {
  const previous = scene.environmentTexture;
  scene.environmentTexture = texture;
  scene.environmentIntensity = intensity;
  if (previous && previous !== texture) previous.dispose();
}

export function updateEnvironmentIntensity(scene: Scene, intensity: number): void {
  scene.environmentIntensity = intensity;
}
