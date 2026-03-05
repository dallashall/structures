import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils } from './ShapeUtils';
import { editorStateManager } from '../../EditorStateManager';

/**
 * CirclePaintStrategy - Circle painting with multiple draw modes
 *
 * Supports:
 * - Center-radius mode (default): Click center, drag to edge
 * - Bounding-box mode (Shift): Click corner, drag to opposite corner
 * - Constrained-box mode (Ctrl): Same as bounding-box but forced 1:1 aspect ratio
 * - Outline vs filled based on shapeFillMode
 * - Depth painting for creating tunnels
 */
export class CirclePaintStrategy implements PaintStrategy {
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

    // Get circle parameters based on draw mode
    const drawMode = editorStateManager.getCircleDrawMode();
    const { center, radius } = this.calculateCircleParams(
      this.dragStart,
      endPosition,
      drawMode
    );

    // Minimum radius check
    if (radius < 1) {
      return [];
    }

    // Determine plane
    const plane = ShapeUtils.determinePlane(this.dragStart, endPosition);

    // Get positions based on fill mode
    const shapeFillMode = editorStateManager.getShapeFillMode();
    let positions: Vector3D[];

    if (shapeFillMode === 'filled') {
      positions = ShapeUtils.calculateCircleFilled(center, radius, plane, dimensions);
    } else {
      positions = ShapeUtils.calculateCircleOutline(center, radius, plane, dimensions);
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
   * Calculate circle center and radius based on draw mode
   */
  private calculateCircleParams(
    start: Vector3D,
    end: Vector3D,
    drawMode: 'center-radius' | 'bounding-box' | 'constrained-box'
  ): { center: Vector3D; radius: number } {
    switch (drawMode) {
      case 'center-radius': {
        // Start is center, radius is distance to end
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dz = end.z - start.z;
        const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return { center: start, radius };
      }

      case 'bounding-box': {
        // Start and end are opposite corners of bounding box
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const centerZ = (start.z + end.z) / 2;
        const center = {
          x: Math.round(centerX),
          y: Math.round(centerY),
          z: Math.round(centerZ),
        };

        // Radius is distance from center to end
        const dx = end.x - center.x;
        const dy = end.y - center.y;
        const dz = end.z - center.z;
        const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return { center, radius };
      }

      case 'constrained-box': {
        // Same as bounding-box but force 1:1 aspect ratio
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        const dz = Math.abs(end.z - start.z);

        // Use shortest dimension to enforce square bounding box
        const side = Math.min(dx, dy, dz);

        // Calculate center maintaining start as corner
        const centerX = start.x + (end.x > start.x ? side / 2 : -side / 2);
        const centerY = start.y + (end.y > start.y ? side / 2 : -side / 2);
        const centerZ = start.z + (end.z > start.z ? side / 2 : -side / 2);
        const center = {
          x: Math.round(centerX),
          y: Math.round(centerY),
          z: Math.round(centerZ),
        };

        const radius = side / 2;
        return { center, radius };
      }
    }
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
