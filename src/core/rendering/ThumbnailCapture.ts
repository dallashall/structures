/**
 * ThumbnailCapture - Renders the structure from a fixed framing camera into a small JPEG
 *
 * The capture draws one frame into the 3D view's own canvas with a separate camera, copies it,
 * then draws the view's camera again before returning. The browser only shows the canvas after
 * the task ends, so the extra frame never appears on screen. This needs the engine's
 * preserveDrawingBuffer, which Babylon3D sets, and it runs synchronously, so detach can call it.
 *
 * The thumbnail camera renders only meshes on THUMBNAIL_LAYER: blocks, the sky backdrop, and
 * the shadow ground. Axes, grid lines, slice planes, and previews stay out of it.
 * Post-processing is attached to the view's camera only, so thumbnails skip it.
 */

import { ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { Camera, Scene } from '@babylonjs/core';

import { DEFAULT_ALPHA, DEFAULT_BETA } from './CameraRig';

// Bit 28: outside Babylon's default mesh mask (0x0FFFFFFF), so no mesh carries it unless tagged.
// The view's camera keeps the default mask, which still sees tagged meshes through their low bits.
export const THUMBNAIL_LAYER = 0x10000000;

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
 * Tag a mesh so the thumbnail camera renders it
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

export class ThumbnailCapture {
  constructor(private readonly scene: Scene) {}

  /**
   * JPEG data URL of `bounds` seen from the default viewing angle, or null when the canvas cannot be read
   */
  capture(bounds: Bounds): string | null {
    const engine = this.scene.getEngine();
    const source = engine.getRenderingCanvas();
    const viewCamera = this.scene.activeCamera;
    if (!source || !viewCamera || source.width === 0 || source.height === 0) return null;

    const center = Vector3.Center(bounds.min, bounds.max);
    const radius = Math.max(0.5, Vector3.Distance(bounds.min, bounds.max) / 2);
    const camera = new ArcRotateCamera('thumbnailCamera', DEFAULT_ALPHA, DEFAULT_BETA, 1, center, this.scene);
    camera.layerMask = THUMBNAIL_LAYER;
    camera.fov = viewCamera.fov;
    camera.minZ = viewCamera.minZ;
    camera.maxZ = viewCamera.maxZ;
    camera.radius = fitDistance(radius, camera.fov, source.width / source.height);

    try {
      this.renderWith(camera);
      return this.cropToDataUrl(source);
    } finally {
      this.renderWith(viewCamera);
      camera.dispose();
    }
  }

  private renderWith(camera: Camera): void {
    this.scene.activeCamera = camera;
    this.scene.render();
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
