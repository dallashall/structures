/**
 * EnvironmentSetup - Stateless setup functions for IBL environment lighting
 *
 * Loads the prefiltered sky baked for each lighting preset (scripts/generateEnvironments.ts).
 * Without an environment texture, metallic PBR surfaces appear black.
 */

import {
  CubeTexture,
  Scene,
} from '@babylonjs/core';

import { environmentUrl } from './SkyPresets';

import type { LightingPreset } from '../../types';

/**
 * Load the preset's environment texture.
 * Resolves with null when the file fails to load, so a missing file never stalls the caller.
 * Post-processing pipelines must NOT be created until the first load resolves,
 * otherwise BabylonJS's internal RGBD decode post-process will collide
 * with the DefaultRenderingPipeline and produce "Cannot read 'scale'" errors.
 */
export function loadEnvironment(scene: Scene, preset: LightingPreset): Promise<CubeTexture | null> {
  return new Promise((resolve) => {
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
  });
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

/**
 * Update environment intensity without reloading the texture
 */
export function updateEnvironmentIntensity(scene: Scene, intensity: number): void {
  scene.environmentIntensity = intensity;
}
