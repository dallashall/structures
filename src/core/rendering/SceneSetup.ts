/**
 * SceneSetup - Stateless setup functions for BabylonJS scene elements
 *
 * Pure functions that create scene elements (lighting, axes).
 * No ongoing state management -- created resources live in the scene graph.
 */

import {
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  AxesViewer,
  Scene,
} from '@babylonjs/core';

import { SUN_TRAVEL_DIRECTION } from './SkyPresets';

/**
 * Setup scene lighting (hemisphere + directional)
 */
export function setupLighting(scene: Scene): void {
  // Ambient fill light
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.6;

  // Key light — positioned above and to the side for visible shadows
  const sunTravel = new Vector3(SUN_TRAVEL_DIRECTION.x, SUN_TRAVEL_DIRECTION.y, SUN_TRAVEL_DIRECTION.z);
  const dirLight = new DirectionalLight('dirLight', sunTravel.normalize(), scene);
  dirLight.position = new Vector3(20, 40, 20);
  dirLight.intensity = 1.5;
  dirLight.specular = new Color3(1, 1, 1);

  // Shadow frustum needs to cover the structure area
  dirLight.shadowMinZ = 0.1;
  dirLight.shadowMaxZ = 100;
}

/**
 * Setup coordinate axes helper (X=red, Y=green, Z=blue at origin)
 */
export function setupAxes(scene: Scene): AxesViewer {
  return new AxesViewer(scene, 3);
}
