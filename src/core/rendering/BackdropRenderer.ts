/**
 * BackdropRenderer - Draws the scene background behind the blocks
 *
 * Modes:
 * - color: no backdrop mesh. The lighting preset's clearColor shows.
 * - skybox: the preset's environment texture on an inside-out sphere.
 * - ground: the same texture with ground projection. Its lower half becomes a floor at world y = 0.
 */

import {
  BackgroundMaterial,
  Color3,
  CubeTexture,
  Mesh,
  MeshBuilder,
  Scene,
  Texture,
} from '@babylonjs/core';

import type { BackgroundMode } from '../../types';
import { includeInThumbnail } from './ThumbnailCapture';

// Sphere diameter. It must stay inside the camera far plane (BabylonJS default maxZ is 10000).
const BACKDROP_SIZE = 1000;
// Ground projection treats the sky as captured this many world units (blocks) above the floor.
// Lower values make the floor look closer.
const PROJECTED_GROUND_HEIGHT = 10;
// Radius of the projected floor disc, centered on the world origin.
// It exceeds CameraRig's upperRadiusLimit (100), so the camera never leaves the disc.
const PROJECTED_GROUND_RADIUS = 500;

export class BackdropRenderer {
  private mesh: Mesh;
  private material: BackgroundMaterial;

  constructor(scene: Scene) {
    this.material = new BackgroundMaterial('backdropMat', scene);
    this.material.backFaceCulling = false;
    // Without these, BackgroundMaterial tints the texture toward its primary color
    this.material.useRGBColor = false;
    this.material.primaryColor = Color3.White();
    this.material.projectedGroundHeight = PROJECTED_GROUND_HEIGHT;
    this.material.projectedGroundRadius = PROJECTED_GROUND_RADIUS;

    this.mesh = MeshBuilder.CreateSphere(
      'backdrop',
      { diameter: BACKDROP_SIZE, segments: 32, sideOrientation: Mesh.BACKSIDE },
      scene,
    );
    this.mesh.infiniteDistance = true;
    includeInThumbnail(this.mesh);
    this.mesh.isPickable = false;
    this.mesh.material = this.material;
    this.mesh.setEnabled(false);
  }

  /**
   * Show an environment texture as the backdrop.
   * The backdrop samples a clone: SKYBOX_MODE would break the original for PBR lighting.
   */
  setTexture(environment: CubeTexture | null): void {
    this.material.reflectionTexture?.dispose();

    if (!environment) {
      this.material.reflectionTexture = null;
      return;
    }

    const reflection = environment.clone();
    reflection.coordinatesMode = Texture.SKYBOX_MODE;
    this.material.reflectionTexture = reflection;
  }

  setMode(mode: BackgroundMode): void {
    this.material.enableGroundProjection = mode === 'ground';
    this.mesh.setEnabled(mode !== 'color');
  }

  destroy(): void {
    this.material.reflectionTexture?.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
