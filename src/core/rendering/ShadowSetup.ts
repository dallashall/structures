/**
 * ShadowSetup - Stateless setup functions for shadow rendering
 *
 * Creates shadow generator on the directional light and a
 * near-invisible ground plane to receive shadows.
 */

import {
  ShadowGenerator,
  DirectionalLight,
  RenderTargetTexture,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Scene,
  Mesh,
} from '@babylonjs/core';

import type { RenderSettings } from '../../types';

export interface ShadowSystem {
  generator: ShadowGenerator;
  groundPlane: Mesh;
}

/**
 * Setup shadow system: generator + shadow-receiving ground plane
 * Returns null if shadows are disabled or directional light not found.
 */
export function setupShadows(scene: Scene, settings: RenderSettings): ShadowSystem | null {
  if (!settings.shadowsEnabled) return null;

  const dirLight = scene.getLightByName('dirLight') as DirectionalLight | null;
  if (!dirLight) {
    console.warn('DirectionalLight "dirLight" not found, shadows disabled');
    return null;
  }

  const generator = new ShadowGenerator(settings.shadowMapSize, dirLight);
  generator.useBlurExponentialShadowMap = true;
  generator.blurKernel = 8;
  generator.darkness = settings.shadowDarkness;
  generator.bias = 0.001;
  generator.normalBias = 0.02;

  // Render shadow map once, not every frame.
  // Call refreshShadowMap() when blocks change.
  const shadowMap = generator.getShadowMap();
  if (shadowMap) {
    shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  }

  // Near-invisible ground plane to receive shadows
  const groundPlane = MeshBuilder.CreateGround(
    'shadowGround',
    { width: 200, height: 200 },
    scene
  );
  groundPlane.position.y = 0;
  groundPlane.receiveShadows = true;

  const groundMat = new StandardMaterial('shadowGroundMat', scene);
  groundMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
  groundMat.specularColor = new Color3(0, 0, 0);
  groundMat.alpha = 0.01;
  groundPlane.material = groundMat;

  return { generator, groundPlane };
}

/**
 * Register a mesh as a shadow caster
 */
export function registerShadowCaster(shadowSystem: ShadowSystem | null, mesh: Mesh): void {
  if (!shadowSystem) return;
  shadowSystem.generator.addShadowCaster(mesh);
}

/**
 * Unregister a mesh as a shadow caster
 */
export function unregisterShadowCaster(shadowSystem: ShadowSystem | null, mesh: Mesh): void {
  if (!shadowSystem) return;
  shadowSystem.generator.removeShadowCaster(mesh);
}

/**
 * Trigger a one-time shadow map re-render.
 * Call after blocks are added/removed.
 */
export function refreshShadowMap(shadowSystem: ShadowSystem | null): void {
  if (!shadowSystem) return;
  const shadowMap = shadowSystem.generator.getShadowMap();
  if (shadowMap) {
    shadowMap.resetRefreshCounter();
  }
}

/**
 * Dispose shadow system
 */
export function disposeShadows(shadowSystem: ShadowSystem | null): void {
  if (!shadowSystem) return;
  shadowSystem.generator.dispose();
  shadowSystem.groundPlane.dispose();
}
