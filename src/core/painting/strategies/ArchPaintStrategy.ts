import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils } from './ShapeUtils';
import { editorStateManager } from '../../EditorStateManager';

/**
 * ArchPaintStrategy - Pure curved arch painting
 *
 * Creates semicircular arches (not rectangle + semicircle).
 * Drag interaction: start = left edge, end = right edge
 * Default: 180° semicircle arch
 *
 * Supports:
 * - Outline vs filled based on shapeFillMode
 * - Depth painting for creating arch tunnels
 */
export class ArchPaintStrategy implements PaintStrategy {
  private dragStart: Vector3D | null = null;

  /**
   * Start a drag operation (call on mousedown)
   */
  startDrag(position: Vector3D): void {
    // Clear any previous drag state to prevent state leakage
    this.dragStart = null;
    this.dragStart = position;
  }

  /**
   * End a drag operation and clear state (call on mouseup)
   */
  endDrag(): void {
    this.dragStart = null;
  }

  /**
   * Check if currently in a drag operation
   */
  isDragging(): boolean {
    return this.dragStart !== null;
  }

  calculateOperations(
    endPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    _constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] {
    // If no drag started, just paint a single point
    if (!this.dragStart) {
      if (
        endPosition.x < 0 ||
        endPosition.x >= dimensions.width ||
        endPosition.y < 0 ||
        endPosition.y >= dimensions.height ||
        endPosition.z < 0 ||
        endPosition.z >= dimensions.depth
      ) {
        return [];
      }

      return [
        {
          position: endPosition,
          blockType: selectedBlockId,
        },
      ];
    }

    // Calculate arch parameters
    const { center, radius } = this.calculateArchParams(this.dragStart, endPosition);

    // Minimum radius check (arch too narrow)
    if (radius < 2) {
      return [];
    }

    // Determine plane
    const plane = ShapeUtils.determinePlane(this.dragStart, endPosition);

    // Calculate arch angle based on drag direction
    const { startAngle, endAngle } = this.calculateArchAngles(
      this.dragStart,
      endPosition,
      center,
      plane
    );

    // Get positions based on fill mode
    const shapeFillMode = editorStateManager.getShapeFillMode();
    let positions: Vector3D[];

    if (shapeFillMode === 'filled') {
      positions = ShapeUtils.calculateArchFilled(
        center,
        radius,
        startAngle,
        endAngle,
        plane,
        dimensions
      );
    } else {
      positions = ShapeUtils.calculateArchOutline(
        center,
        radius,
        startAngle,
        endAngle,
        plane,
        dimensions
      );
    }

    // Apply depth if enabled
    const depthConfig = editorStateManager.getDepthConfig();
    if (depthConfig.enabled) {
      const constrainAxis = ShapeUtils.getPerpendicularAxis(plane);
      positions = ShapeUtils.applyDepth(
        positions,
        depthConfig,
        constrainAxis,
        dimensions,
        this.getBlockAtPosition
      );
    }

    // Convert positions to operations
    return positions.map((position) => ({
      position,
      blockType: selectedBlockId,
    }));
  }

  /**
   * Calculate arch center and radius from start and end points
   */
  private calculateArchParams(
    start: Vector3D,
    end: Vector3D
  ): { center: Vector3D; radius: number } {
    // Center is midpoint between start and end
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const centerZ = (start.z + end.z) / 2;
    const center = {
      x: Math.round(centerX),
      y: Math.round(centerY),
      z: Math.round(centerZ),
    };

    // Radius is half the distance between start and end
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const radius = distance / 2;

    return { center, radius };
  }

  /**
   * Calculate arch angles based on drag direction
   * Default: semicircle (180°) from left to right
   */
  private calculateArchAngles(
    start: Vector3D,
    _end: Vector3D,
    center: Vector3D,
    plane: string
  ): { startAngle: number; endAngle: number } {
    // Calculate angle from center to start point
    let dx = start.x - center.x;
    let dy = start.y - center.y;

    // Adjust based on plane
    if (plane === 'xz') {
      dy = start.z - center.z;
    } else if (plane === 'yz') {
      dx = start.y - center.y;
      dy = start.z - center.z;
    }

    const startAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // For semicircle arch, end angle is start + 180
    const endAngle = startAngle + 180;

    return { startAngle, endAngle };
  }

  /**
   * Get block at position (for depth collision detection)
   * This would normally come from ProjectManager, but for now we return null
   * TODO: Inject ProjectManager or getBlock function
   */
  private getBlockAtPosition = (_pos: Vector3D): string | null => {
    // This will be properly implemented when integrating with ProjectManager
    // For now, return null (no collision)
    return null;
  };
}
