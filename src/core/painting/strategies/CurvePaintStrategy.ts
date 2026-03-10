import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils } from './ShapeUtils';
import { editorState } from '../../EditorState';

/**
 * CurvePaintStrategy - Bezier curve painting
 *
 * Creates smooth curves using cubic Bezier algorithm.
 * Interaction:
 * - Click-drag for start/end points (like rectangle)
 * - Default: Gentle symmetric curve
 * - Shift+drag: Adjust control point 1
 * - Ctrl+drag: Adjust control point 2
 *
 * Supports:
 * - Outline only (curves are naturally outline shapes)
 * - Depth painting for creating curved tunnels
 */
export class CurvePaintStrategy implements PaintStrategy {
  private dragStart: Vector3D | null = null;

  /**
   * Start a drag operation and initialize default control points
   */
  startDrag(position: Vector3D): void {
    // Clear any previous drag state to prevent state leakage
    this.dragStart = null;
    this.dragStart = position;
    // Initialize curve control state with default gentle curve
    // Will be updated when we know the end position
    editorState.setCurveControlState(null);
  }

  /**
   * End a drag operation and clear state
   */
  endDrag(): void {
    this.dragStart = null;
    editorState.setCurveControlState(null);
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

    // Get or create control points
    let curveState = editorState.getCurveControlState();
    if (!curveState) {
      // Initialize default control points for gentle curve
      curveState = this.createDefaultControlPoints(this.dragStart, endPosition);
      editorState.setCurveControlState(curveState);
    }

    // Determine plane
    const plane = ShapeUtils.determinePlane(this.dragStart, endPosition);

    // Calculate curve positions
    const positions = ShapeUtils.calculateBezierCurve(
      this.dragStart,
      endPosition,
      curveState.controlPoint1,
      curveState.controlPoint2,
      plane,
      dimensions,
      30 // More segments for smoother curves
    );

    // Apply depth if enabled
    const depthConfig = editorState.getDepthConfig();
    let finalPositions = positions;

    if (depthConfig.enabled) {
      const constrainAxis = ShapeUtils.getPerpendicularAxis(plane);
      finalPositions = ShapeUtils.applyDepth(
        positions,
        depthConfig,
        constrainAxis,
        dimensions,
        this.getBlockAtPosition
      );
    }

    // Convert positions to operations
    return finalPositions.map((position) => ({
      position,
      blockType: selectedBlockId,
    }));
  }

  /**
   * Create default control points for a gentle symmetric curve
   */
  private createDefaultControlPoints(
    start: Vector3D,
    end: Vector3D
  ): { controlPoint1: { x: number; y: number }; controlPoint2: { x: number; y: number } } {
    // Calculate vector from start to end
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Calculate perpendicular vector (rotated 90 degrees)
    const perpX = -dy;
    const perpY = dx;

    // Distance between start and end
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Control points offset: 1/3 along the line, offset perpendicular by 1/6 of distance
    const offset = distance / 6;

    const cp1x = start.x + dx / 3 + (perpX / distance) * offset;
    const cp1y = start.y + dy / 3 + (perpY / distance) * offset;

    const cp2x = start.x + (dx * 2) / 3 + (perpX / distance) * offset;
    const cp2y = start.y + (dy * 2) / 3 + (perpY / distance) * offset;

    return {
      controlPoint1: { x: Math.round(cp1x), y: Math.round(cp1y) },
      controlPoint2: { x: Math.round(cp2x), y: Math.round(cp2y) },
    };
  }

  /**
   * Update control point based on modifier key and position
   * Called from Canvas2D when modifier keys are held during drag
   */
  updateControlPoint(
    controlPointIndex: 1 | 2,
    gridX: number,
    gridY: number
  ): void {
    const curveState = editorState.getCurveControlState();
    if (!curveState) return;

    if (controlPointIndex === 1) {
      curveState.controlPoint1 = { x: gridX, y: gridY };
    } else {
      curveState.controlPoint2 = { x: gridX, y: gridY };
    }

    editorState.setCurveControlState(curveState);
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
