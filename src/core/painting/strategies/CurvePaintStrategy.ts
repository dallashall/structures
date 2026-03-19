import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils, type Plane } from './ShapeUtils';
import type { GuideGeometry, ControlPointHandle, GuideLine } from './GuideGeometry';
import type { GuideGeometryProvider } from './GuideGeometryProvider';

/**
 * CurvePaintStrategy - Multi-click Bezier curve painting (4 points)
 *
 * Interaction: 4 clicks to define a cubic Bezier curve
 * 1. Click start point
 * 2. Click end point
 * 3. Click control point 1 (curve bends toward it near start)
 * 4. Click control point 2 (curve bends toward it near end)
 *
 * Preview progression:
 * - 0 points: single block at cursor
 * - 1 point: line from start to cursor (preview path)
 * - 2 points: straight line from start to end, cursor previews CP1
 * - 3 points: curve with CP1 placed, cursor previews CP2
 * - 4 points (complete): final cubic Bezier curve
 */
export class CurvePaintStrategy implements PaintStrategy, GuideGeometryProvider {
  private points: Vector3D[] = [];
  private readonly requiredPoints = 4;

  /**
   * Add a clicked point to the curve definition
   */
  addPoint(position: Vector3D): void {
    this.points.push(position);
  }

  /**
   * Check if all required points have been placed
   */
  isComplete(): boolean {
    return this.points.length >= this.requiredPoints;
  }

  /**
   * Reset multi-click state for next curve
   */
  reset(): void {
    this.points = [];
  }

  /**
   * Get guide geometry for rendering control point handles and guide lines
   */
  getGuideGeometry(cursorPosition: Vector3D): GuideGeometry | null {
    const pointCount = this.points.length;
    if (pointCount === 0) return null;

    const handles: ControlPointHandle[] = [];
    const lines: GuideLine[] = [];
    const start = this.points[0];

    handles.push({ position: start, label: 'Start', style: 'placed' });

    if (pointCount === 1) {
      handles.push({ position: cursorPosition, label: 'End', style: 'cursor' });
      lines.push({ from: start, to: cursorPosition, style: 'baseline' });
    }

    if (pointCount >= 2) {
      const end = this.points[1];
      handles.push({ position: end, label: 'End', style: 'placed' });
      lines.push({ from: start, to: end, style: 'baseline' });

      if (pointCount === 2) {
        handles.push({ position: cursorPosition, label: 'CP1', style: 'cursor' });
        lines.push({ from: start, to: cursorPosition, style: 'control' });
        // Show mirrored CP2 as tangent hint
        const mirroredCp2 = this.mirrorControlPoint(cursorPosition, start, end);
        handles.push({ position: mirroredCp2, label: 'CP2 (auto)', style: 'cursor' });
        lines.push({ from: end, to: mirroredCp2, style: 'tangent' });
      }

      if (pointCount === 3) {
        const cp1 = this.points[2];
        handles.push({ position: cp1, label: 'CP1', style: 'placed' });
        lines.push({ from: start, to: cp1, style: 'control' });
        handles.push({ position: cursorPosition, label: 'CP2', style: 'cursor' });
        lines.push({ from: end, to: cursorPosition, style: 'control' });
      }

      if (pointCount >= 4) {
        const cp1 = this.points[2];
        const cp2 = this.points[3];
        handles.push({ position: cp1, label: 'CP1', style: 'placed' });
        handles.push({ position: cp2, label: 'CP2', style: 'placed' });
        lines.push({ from: start, to: cp1, style: 'control' });
        lines.push({ from: end, to: cp2, style: 'control' });
      }
    }

    return { handles, lines };
  }

  calculateOperations(
    cursorPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] {
    const pointCount = this.points.length;

    // 0 points: single block at cursor
    if (pointCount === 0) {
      if (!this.isValidPosition(cursorPosition, dimensions)) {
        return [];
      }
      return [{ position: cursorPosition, blockType: selectedBlockId }];
    }

    const start = this.points[0];

    // Resolve the plane from view context (authoritative) or fallback to heuristic
    const plane = constrainAxis
      ? ShapeUtils.planeFromConstrainAxis(constrainAxis.axis)
      : ShapeUtils.determinePlane(start, cursorPosition);

    // 1 point: line from start to cursor
    if (pointCount === 1) {
      return this.calculateLine(start, cursorPosition, selectedBlockId, dimensions);
    }

    const end = this.points[1];

    // 2 points: curve preview with cursor as CP1, default CP2
    if (pointCount === 2) {
      const cp1 = cursorPosition;
      const cp2 = this.mirrorControlPoint(cp1, start, end);
      return this.calculateBezier(start, end, cp1, cp2, plane, selectedBlockId, dimensions);
    }

    const cp1 = this.points[2];

    // 3 points: curve with CP1 placed, cursor as CP2
    if (pointCount === 3) {
      return this.calculateBezier(start, end, cp1, cursorPosition, plane, selectedBlockId, dimensions);
    }

    // 4 points (complete): final curve
    const cp2 = this.points[3];
    return this.calculateBezier(start, end, cp1, cp2, plane, selectedBlockId, dimensions);
  }

  /**
   * Calculate a line between two points
   */
  private calculateLine(
    start: Vector3D,
    end: Vector3D,
    blockType: string | null,
    dimensions: Dimensions
  ): PaintOperation[] {
    const operations: PaintOperation[] = [];

    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const dz = Math.abs(end.z - start.z);
    const steps = Math.max(dx, dy, dz, 1);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const pos: Vector3D = {
        x: Math.round(start.x + (end.x - start.x) * t),
        y: Math.round(start.y + (end.y - start.y) * t),
        z: Math.round(start.z + (end.z - start.z) * t),
      };

      if (this.isValidPosition(pos, dimensions)) {
        operations.push({ position: pos, blockType });
      }
    }

    return this.deduplicateOperations(operations);
  }

  /**
   * Calculate cubic Bezier curve positions
   */
  private calculateBezier(
    start: Vector3D,
    end: Vector3D,
    cp1: Vector3D,
    cp2: Vector3D,
    plane: Plane,
    blockType: string | null,
    dimensions: Dimensions
  ): PaintOperation[] {
    // Convert 3D control points to 2D for ShapeUtils
    const cp1_2d = this.to2DControlPoint(cp1, plane);
    const cp2_2d = this.to2DControlPoint(cp2, plane);

    const positions = ShapeUtils.calculateBezierCurve(
      start,
      end,
      cp1_2d,
      cp2_2d,
      plane,
      dimensions,
      30
    );

    return positions.map(toOperation(blockType));
  }

  /**
   * Convert a 3D position to a 2D control point for the Bezier calculation
   * ShapeUtils.calculateBezierCurve expects { x, y } control points in plane coords
   */
  private to2DControlPoint(pos: Vector3D, plane: Plane): { x: number; y: number } {
    const uv = ShapeUtils.to2D(pos, plane);
    return { x: uv.u, y: uv.v };
  }

  /**
   * Mirror a control point across the midpoint of start-end
   * Used as default CP2 when only CP1 is specified, creating a symmetric curve
   */
  private mirrorControlPoint(cp: Vector3D, start: Vector3D, end: Vector3D): Vector3D {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const midZ = (start.z + end.z) / 2;

    return {
      x: Math.round(2 * midX - cp.x),
      y: Math.round(2 * midY - cp.y),
      z: Math.round(2 * midZ - cp.z),
    };
  }

  /**
   * Check if a position is within valid dimensions
   */
  private isValidPosition(pos: Vector3D, dimensions: Dimensions): boolean {
    return (
      pos.x >= 0 && pos.x < dimensions.width &&
      pos.y >= 0 && pos.y < dimensions.height &&
      pos.z >= 0 && pos.z < dimensions.depth
    );
  }

  /**
   * Remove duplicate positions from operations
   */
  private deduplicateOperations(operations: PaintOperation[]): PaintOperation[] {
    const seen = new Set<string>();
    return operations.filter(filterDuplicatePositions(seen));
  }
}

/**
 * Create a position-to-operation mapper
 */
const toOperation = (blockType: string | null) => (position: Vector3D): PaintOperation => ({
  position,
  blockType,
});

/**
 * Create a deduplication filter for operations by position
 */
const filterDuplicatePositions = (seen: Set<string>) => (op: PaintOperation): boolean => {
  const key = `${op.position.x},${op.position.y},${op.position.z}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
};
