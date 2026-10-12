/**
 * ThumbnailCapture - Renders the structure from a fixed framing into a small JPEG
 *
 * The capture moves the view's own camera to the thumbnail framing, draws one frame into the
 * 3D view's canvas, copies it, then puts the camera back and draws again before returning.
 * The browser only shows the canvas after the task ends, so the extra frame never appears on screen.
 * This needs the engine's preserveDrawingBuffer, which Babylon3D sets, and it runs synchronously,
 * so detach can call it.
 *
 * The capture never changes scene.activeCamera. A camera change makes Babylon's prepass renderer
 * rebuild its targets for the new camera, and the view camera's SSAO pass then reads textures
 * that no longer exist. Thumbnails carry the view's post-processing as a result.
 *
 * During the capture the camera sees only meshes on THUMBNAIL_LAYER: blocks, the sky backdrop,
 * and the shadow ground. Axes, slice planes, and previews stay out of it.
 */

import { Vector3 } from '@babylonjs/core';
import type { ArcRotateCamera, Scene } from '@babylonjs/core';

import { DEFAULT_ALPHA, DEFAULT_BETA } from './CameraRig';

// Bit 28: outside Babylon's default mesh mask (0x0FFFFFFF), so no mesh carries it unless tagged.
// The view's own mask still sees tagged meshes through their low bits.
const THUMBNAIL_LAYER = 0x10000000;

const WIDTH = 320;
const HEIGHT = 200;
const ASPECT = WIDTH / HEIGHT;
// Margin around the bounding sphere, as a fraction of its radius
const PADDING = 1.08;
const JPEG_QUALITY = 0.85;

export interface Bounds {
  min: Vector3;
  max: Vector3;
}

/**
 * Thumbnails show only tagged meshes
 */
export function includeInThumbnail(mesh: { layerMask: number }): void {
  mesh.layerMask |= THUMBNAIL_LAYER;
}

/**
 * Distance at which a sphere of `radius` fits a crop of ASPECT taken from the middle of the canvas
 */
function fitDistance(radius: number, fov: number, canvasAspect: number): number {
  // A canvas wider than ASPECT crops its sides, so the full height bounds the view.
  // A narrower canvas crops top and bottom, which shrinks the usable vertical angle.
  const tanVertical = Math.tan(fov / 2) * Math.min(1, canvasAspect / ASPECT);
  return (radius * PADDING) / Math.sin(Math.atan(tanVertical));
}

type CameraPose = Pick<
  ArcRotateCamera,
  'alpha' | 'beta' | 'radius' | 'layerMask' | 'inertialAlphaOffset' | 'inertialBetaOffset' | 'inertialRadiusOffset'
> & { target: Vector3 };

const toPose = (camera: ArcRotateCamera): CameraPose => ({
  alpha: camera.alpha,
  beta: camera.beta,
  radius: camera.radius,
  target: camera.target.clone(),
  layerMask: camera.layerMask,
  inertialAlphaOffset: camera.inertialAlphaOffset,
  inertialBetaOffset: camera.inertialBetaOffset,
  inertialRadiusOffset: camera.inertialRadiusOffset,
});

// setTarget would rebuild alpha, beta, and radius from the old position, so the target is copied in place
const applyPose = (camera: ArcRotateCamera, { target, ...pose }: CameraPose): void => {
  camera.target.copyFrom(target);
  Object.assign(camera, pose);
};

export class ThumbnailCapture {
  constructor(
    private readonly scene: Scene,
    private readonly camera: ArcRotateCamera,
  ) {}

  /**
   * JPEG data URL of `bounds` seen from the default viewing angle, or null when the canvas cannot be read
   */
  capture(bounds: Bounds): string | null {
    const source = this.scene.getEngine().getRenderingCanvas();
    if (!source || source.width === 0 || source.height === 0) return null;

    const viewPose = toPose(this.camera);
    const radius = Math.max(0.5, Vector3.Distance(bounds.min, bounds.max) / 2);

    try {
      // Inertia offsets are zeroed so the frame lands exactly on the thumbnail pose
      applyPose(this.camera, {
        alpha: DEFAULT_ALPHA,
        beta: DEFAULT_BETA,
        radius: fitDistance(radius, this.camera.fov, source.width / source.height),
        target: Vector3.Center(bounds.min, bounds.max),
        layerMask: THUMBNAIL_LAYER,
        inertialAlphaOffset: 0,
        inertialBetaOffset: 0,
        inertialRadiusOffset: 0,
      });
      this.scene.render();
      return this.cropToDataUrl(source);
    } finally {
      applyPose(this.camera, viewPose);
      this.scene.render();
    }
  }

  // Center crop to ASPECT, scaled down to WIDTH x HEIGHT
  private cropToDataUrl(source: HTMLCanvasElement): string | null {
    const sourceAspect = source.width / source.height;
    const cropWidth = sourceAspect > ASPECT ? source.height * ASPECT : source.width;
    const cropHeight = sourceAspect > ASPECT ? source.height : source.width / ASPECT;

    const target = document.createElement('canvas');
    target.width = WIDTH;
    target.height = HEIGHT;
    const context = target.getContext('2d');
    if (!context) return null;

    context.drawImage(
      source,
      (source.width - cropWidth) / 2,
      (source.height - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      WIDTH,
      HEIGHT,
    );
    return target.toDataURL('image/jpeg', JPEG_QUALITY);
  }
}
