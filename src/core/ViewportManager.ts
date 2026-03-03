import { EventEmitter } from './EventEmitter';
import type { Vector3D, CameraState } from '../types';

/**
 * ViewportManager - Manages 3D camera state
 *
 * Singleton that stores camera position, target, and zoom level.
 * Emits events when camera state changes.
 */
class ViewportManager extends EventEmitter {
  private static instance: ViewportManager;

  private cameraState: CameraState = {
    position: { x: 10, y: 10, z: 10 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
  };

  private constructor() {
    super();
  }

  static getInstance(): ViewportManager {
    if (!ViewportManager.instance) {
      ViewportManager.instance = new ViewportManager();
    }
    return ViewportManager.instance;
  }

  /**
   * Set complete camera state
   */
  setCamera(position: Vector3D, target: Vector3D, zoom: number = 1.0): void {
    this.cameraState = { position, target, zoom };
    this.emit('camera:changed', this.cameraState);
  }

  /**
   * Get current camera state
   */
  getCamera(): CameraState {
    return { ...this.cameraState };
  }

  /**
   * Update only camera position
   */
  setCameraPosition(position: Vector3D): void {
    this.cameraState.position = position;
    this.emit('camera:changed', this.cameraState);
  }

  /**
   * Update only camera target
   */
  setCameraTarget(target: Vector3D): void {
    this.cameraState.target = target;
    this.emit('camera:changed', this.cameraState);
  }

  /**
   * Update only zoom level
   */
  setZoom(zoom: number): void {
    this.cameraState.zoom = Math.max(0.1, Math.min(10, zoom));
    this.emit('camera:changed', this.cameraState);
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    this.cameraState = {
      position: { x: 10, y: 10, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1.0,
    };
    this.emit('camera:changed', this.cameraState);
  }

  /**
   * Focus camera on a specific point
   */
  focusOn(target: Vector3D, distance: number = 10): void {
    // Calculate camera position maintaining current angle but at specified distance
    const currentOffset = {
      x: this.cameraState.position.x - this.cameraState.target.x,
      y: this.cameraState.position.y - this.cameraState.target.y,
      z: this.cameraState.position.z - this.cameraState.target.z,
    };

    const currentDistance = Math.sqrt(
      currentOffset.x ** 2 + currentOffset.y ** 2 + currentOffset.z ** 2
    );

    const scale = distance / (currentDistance || 1);

    this.cameraState = {
      position: {
        x: target.x + currentOffset.x * scale,
        y: target.y + currentOffset.y * scale,
        z: target.z + currentOffset.z * scale,
      },
      target,
      zoom: this.cameraState.zoom,
    };

    this.emit('camera:changed', this.cameraState);
  }
}

export const viewportManager = ViewportManager.getInstance();
