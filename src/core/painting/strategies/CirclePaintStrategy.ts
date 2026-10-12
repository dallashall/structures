import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils } from './ShapeUtils';
import { editorState } from '../../EditorState';

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
    this.dragStart = null;
    this.dragStart = position;
  }

  /**
   * End a drag operation and clear state (call on mouseup)
   */
  endDrag(): void {
    this.dragStart = null;
  }

  calculateOperations(
    endPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
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

      return [{ position: endPosition, blockType: selectedBlockId }];
    }

    // Get circle parameters based on draw mode
    const drawMode = editorState.getCircleDrawMode();
    const plane = constrainAxis
      ? ShapeUtils.planeFromConstrainAxis(constrainAxis.axis)
      : ShapeUtils.determinePlane(this.dragStart, endPosition);

    const { center, radius } = this.calculateCircleParams(
      this.dragStart,
      endPosition,
      drawMode,
      plane
    );

    // Minimum radius check
    if (radius < 1) {
      return [];
    }

    // Get positions based on fill mode
    const shapeFillMode = editorState.getShapeFillMode();
    let positions: Vector3D[];

    if (shapeFillMode === 'filled') {
      positions = ShapeUtils.calculateCircleFilled(center, radius, plane, dimensions);
    } else {
      positions = ShapeUtils.calculateCircleOutline(center, radius, plane, dimensions);
    }

    // Convert positions to operations
    return positions.map(toOperation(selectedBlockId));
  }

  /**
   * Calculate circle center and radius based on draw mode
   * Uses 2D plane coordinates for distance calculations
   */
  private calculateCircleParams(
    start: Vector3D,
    end: Vector3D,
    drawMode: 'center-radius' | 'bounding-box' | 'constrained-box',
    plane: ReturnType<typeof ShapeUtils.planeFromConstrainAxis>
  ): { center: Vector3D; radius: number } {
    // Project to 2D for correct distance calculations
    const s = ShapeUtils.to2D(start, plane);
    const e = ShapeUtils.to2D(end, plane);

    switch (drawMode) {
      case 'center-radius': {
        // Start is center, radius is 2D distance to end in the plane
        const du = e.u - s.u;
        const dv = e.v - s.v;
        const radius = Math.sqrt(du * du + dv * dv);
        return { center: start, radius };
      }

      case 'bounding-box': {
        // Start and end are opposite corners of bounding box
        const centerU = (s.u + e.u) / 2;
        const centerV = (s.v + e.v) / 2;

        // Radius is 2D distance from center to end
        const du = e.u - centerU;
        const dv = e.v - centerV;
        const radius = Math.sqrt(du * du + dv * dv);

        const center = {
          x: Math.round((start.x + end.x) / 2),
          y: Math.round((start.y + end.y) / 2),
          z: Math.round((start.z + end.z) / 2),
        };
        return { center, radius };
      }

      case 'constrained-box': {
        // Same as bounding-box but force 1:1 aspect ratio in the plane
        const du = Math.abs(e.u - s.u);
        const dv = Math.abs(e.v - s.v);

        // Use shortest 2D dimension to enforce square bounding box
        const side = Math.min(du, dv);

        // Calculate 2D center maintaining start as corner
        const centerU = s.u + (e.u > s.u ? side / 2 : -side / 2);
        const centerV = s.v + (e.v > s.v ? side / 2 : -side / 2);

        // Convert back to 3D center
        const center = {
          x: Math.round((start.x + end.x) / 2),
          y: Math.round((start.y + end.y) / 2),
          z: Math.round((start.z + end.z) / 2),
        };

        // Override the plane components with the constrained values
        switch (plane) {
          case 'xy':
            center.x = Math.round(centerU);
            center.y = Math.round(centerV);
            break;
          case 'xz':
            center.x = Math.round(centerU);
            center.z = Math.round(centerV);
            break;
          case 'yz':
            center.y = Math.round(centerU);
            center.z = Math.round(centerV);
            break;
        }

        const radius = side / 2;
        return { center, radius };
      }
    }
  }
}

/**
 * Create a position-to-operation mapper
 */
const toOperation = (blockType: string | null) => (position: Vector3D): PaintOperation => ({
  position,
  blockType,
});
