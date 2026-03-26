/**
 * EnvironmentSetup - Stateless setup functions for IBL environment lighting
 *
 * Creates and configures scene environment texture for PBR material reflections.
 * Without an environment texture, metallic PBR surfaces appear black.
 */

import {
  CubeTexture,
  Scene,
} from '@babylonjs/core';

const ENVIRONMENT_URL = '/environment/neutral.env';

/**
 * Setup IBL environment texture for PBR reflections
 * Falls back gracefully if the .env file cannot be loaded.
 */
export function setupEnvironment(scene: Scene, intensity: number): void {
  try {
    const envTexture = CubeTexture.CreateFromPrefilteredData(
      ENVIRONMENT_URL,
      scene
    );
    scene.environmentTexture = envTexture;
    scene.environmentIntensity = intensity;
  } catch (error) {
    console.warn('Failed to load environment texture, PBR reflections will be limited:', error);
  }
}

/**
 * Update environment intensity without reloading the texture
 */
export function updateEnvironmentIntensity(scene: Scene, intensity: number): void {
  scene.environmentIntensity = intensity;
}
