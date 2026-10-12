/**
 * ShadowSetup - Shadows from the directional light onto blocks and a near-invisible ground plane
 *
 * The shadow map renders once per refreshShadowMap() call, not every frame. Callers refresh after blocks change.
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
import type { AbstractMesh } from '@babylonjs/core';

import type { RenderSettings } from '../../types';
import { includeInThumbnail } from './ThumbnailCapture';

export interface ShadowSystem {
  generator: ShadowGenerator;
  groundPlane: Mesh;
}

/**
 * Null when shadows are off or the scene has no 'dirLight'
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

  const shadowMap = generator.getShadowMap();
  if (shadowMap) {
    shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  }

  const groundPlane = MeshBuilder.CreateGround(
    'shadowGround',
    { width: 200, height: 200 },
    scene
  );
  groundPlane.position.y = 0;
  groundPlane.receiveShadows = true;
  includeInThumbnail(groundPlane);

  const groundMat = new StandardMaterial('shadowGroundMat', scene);
  groundMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
  groundMat.specularColor = new Color3(0, 0, 0);
  groundMat.alpha = 0.01;
  groundPlane.material = groundMat;

  return { generator, groundPlane };
}

/**
 * Callers register each mesh once.
 *
 * Appends to the render list directly. ShadowGenerator.addShadowCaster scans the whole list
 * for duplicates and walks the scene for child meshes, so registering N blocks costs O(N²).
 */
export function registerShadowCaster(shadowSystem: ShadowSystem | null, mesh: AbstractMesh): void {
  const shadowMap = shadowSystem?.generator.getShadowMap();
  if (!shadowMap) return;
  shadowMap.renderList ??= [];
  shadowMap.renderList.push(mesh);
}

/**
 * One pass over the render list. ShadowGenerator.removeShadowCaster splices one mesh per scan, which costs O(N²) for N removals.
 */
export function unregisterShadowCasters(shadowSystem: ShadowSystem | null, meshes: Set<AbstractMesh>): void {
  const renderList = shadowSystem?.generator.getShadowMap()?.renderList;
  if (!renderList || meshes.size === 0) return;
  const isKept = (mesh: AbstractMesh): boolean => !meshes.has(mesh);
  const kept = renderList.filter(isKept);
  renderList.length = 0;
  renderList.push(...kept);
}

export function refreshShadowMap(shadowSystem: ShadowSystem | null): void {
  if (!shadowSystem) return;
  const shadowMap = shadowSystem.generator.getShadowMap();
  if (shadowMap) {
    shadowMap.resetRefreshCounter();
  }
}

export function disposeShadows(shadowSystem: ShadowSystem | null): void {
  if (!shadowSystem) return;
  shadowSystem.generator.dispose();
  shadowSystem.groundPlane.dispose();
}
