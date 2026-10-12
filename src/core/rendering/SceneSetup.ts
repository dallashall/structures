import {
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  AxesViewer,
  Scene,
} from '@babylonjs/core';

import { SUN_TRAVEL_DIRECTION } from './SkyPresets';

export function setupLighting(scene: Scene): void {
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.6;

  // Placed above and to the side so shadows fall visibly beside blocks
  const sunTravel = new Vector3(SUN_TRAVEL_DIRECTION.x, SUN_TRAVEL_DIRECTION.y, SUN_TRAVEL_DIRECTION.z);
  const dirLight = new DirectionalLight('dirLight', sunTravel.normalize(), scene);
  dirLight.position = new Vector3(20, 40, 20);
  dirLight.intensity = 1.5;
  dirLight.specular = new Color3(1, 1, 1);

  // The shadow frustum must cover the largest structure
  dirLight.shadowMinZ = 0.1;
  dirLight.shadowMaxZ = 100;
}

/**
 * Babylon's axes viewer colors X red, Y green, and Z blue in Babylon axes, so green is the model's vertical Z
 */
export function setupAxes(scene: Scene): AxesViewer {
  return new AxesViewer(scene, 3);
}
