/**
 * CameraRig - Frames, orbits, and positions the 3D camera
 *
 * Provides preset views, zoom, reset, and structure-focused framing.
 * Accepts dimensions directly rather than querying projections.
 */

import {
  ArcRotateCamera,
  Scene,
} from '@babylonjs/core';
import { toBabylonVector } from './babylonUtils';

import type { Dimensions } from '../../types';

export class CameraRig {
  private camera: ArcRotateCamera;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    const defaultDimensions = { width: 10, height: 10, depth: 10 };

    const center = toBabylonVector({
      x: defaultDimensions.width / 2,
      y: defaultDimensions.depth / 2,
      z: defaultDimensions.height / 2,
    });

    this.camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4,
      Math.PI / 3,
      20,
      center,
      scene
    );

    this.camera.attachControl(canvas, true);

    // Configure limits
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 100;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.1;

    // Smooth movements
    this.camera.inertia = 0.9;
    this.camera.angularSensibilityX = 1000;
    this.camera.angularSensibilityY = 1000;
    this.camera.panningSensibility = 50;
    this.camera.wheelPrecision = 50;
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  /**
   * Update camera target to center of build area
   */
  updateTarget(dimensions: Dimensions): void {
    const center = toBabylonVector({
      x: dimensions.width / 2,
      y: dimensions.depth / 2,
      z: dimensions.height / 2,
    });
    this.camera.setTarget(center);
  }

  /**
   * Focus camera on structure based on its dimensions
   */
  focusOnStructure(dimensions: Dimensions): void {
    const center = toBabylonVector({
      x: dimensions.width / 2,
      y: dimensions.depth / 2,
      z: dimensions.height / 2,
    });

    this.camera.setTarget(center);
    const maxDimension = Math.max(dimensions.width, dimensions.height, dimensions.depth);
    this.camera.radius = maxDimension * 2;
  }

  /**
   * Set camera to a preset view
   *
   * Our coordinate system: X=width, Y=depth, Z=height (Z-up, right-handed)
   * Babylon system: X, Z, Y (Y-up, left-handed)
   */
  setCameraView(view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'): void {
    const presets = {
      left: { alpha: 0, beta: Math.PI / 2 },
      right: { alpha: Math.PI, beta: Math.PI / 2 },
      front: { alpha: -Math.PI / 2, beta: Math.PI / 2 },
      back: { alpha: Math.PI / 2, beta: Math.PI / 2 },
      top: { alpha: -Math.PI / 2, beta: 0.01 },
      bottom: { alpha: -Math.PI / 2, beta: Math.PI - 0.01 },
    };

    const preset = presets[view];
    this.camera.alpha = preset.alpha;
    this.camera.beta = preset.beta;
  }

  /**
   * Zoom camera in or out
   */
  zoomCamera(delta: number): void {
    const newRadius = this.camera.radius + delta;
    this.camera.radius = Math.max(
      this.camera.lowerRadiusLimit || 2,
      Math.min(this.camera.upperRadiusLimit || 100, newRadius)
    );
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    this.camera.alpha = Math.PI / 4;
    this.camera.beta = Math.PI / 3;
    this.camera.radius = 20;
  }
}
