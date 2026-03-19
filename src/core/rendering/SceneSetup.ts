/**
 * SceneSetup - Stateless setup functions for BabylonJS scene elements
 *
 * Pure functions that create scene elements (lighting, grid, axes).
 * No ongoing state management -- created resources live in the scene graph.
 */

import {
  HemisphericLight,
  DirectionalLight,
  Vector3,
  MeshBuilder,
  Color3,
  AxesViewer,
  Scene,
} from '@babylonjs/core';

/**
 * Setup scene lighting (hemisphere + directional)
 */
export function setupLighting(scene: Scene): void {
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), scene);
  dirLight.intensity = 0.6;
  dirLight.specular = new Color3(1, 1, 1);
}

/**
 * Setup ground grid for spatial reference
 */
export function setupGrid(scene: Scene): void {
  const gridSize = 100;
  const gridSpacing = 1;
  const lines: Vector3[][] = [];

  for (let z = -gridSize; z <= gridSize; z += gridSpacing) {
    lines.push([
      new Vector3(-gridSize, 0, z),
      new Vector3(gridSize, 0, z),
    ]);
  }

  for (let x = -gridSize; x <= gridSize; x += gridSpacing) {
    lines.push([
      new Vector3(x, 0, -gridSize),
      new Vector3(x, 0, gridSize),
    ]);
  }

  const gridLines = MeshBuilder.CreateLineSystem(
    'grid',
    { lines },
    scene
  );
  gridLines.color = new Color3(0.3, 0.3, 0.3);
  gridLines.alpha = 0.2;
  gridLines.position.y = 0;
}

/**
 * Replace grid with new one (dispose old, create new)
 */
export function updateGrid(scene: Scene): void {
  const oldGrid = scene.getMeshByName('grid');
  oldGrid?.dispose();
  setupGrid(scene);
}

/**
 * Setup coordinate axes helper (X=red, Y=green, Z=blue at origin)
 */
export function setupAxes(scene: Scene): AxesViewer {
  return new AxesViewer(scene, 3);
}
