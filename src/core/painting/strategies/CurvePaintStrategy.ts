import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils, type Plane } from './ShapeUtils';
import type { GuideGeometry, ControlPointHandle, GuideLine } from './GuideGeometry';
import type { GuideGeometryProvider } from './GuideGeometryProvider';

/**
 * CurvePaintStrategy - A cubic Bezier from four clicks: start, end, then the two control points
 *
 * Until all four points exist the cursor stands in for the next one.
 * While the cursor places CP1, CP2 is CP1 reflected through the base midpoint, which previews a symmetric S-curve.
 */
export class CurvePaintStrategy implements PaintStrategy, GuideGeometryProvider {
  private points: Vector3D[] = [];

  addPoint(position: Vector3D): void {
    this.points.push(position);
  }

  reset(): void {
    this.points = [];
  }

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

    if (pointCount === 0) {
      if (!this.isValidPosition(cursorPosition, dimensions)) {
        return [];
      }
      return [{ position: cursorPosition, blockType: selectedBlockId }];
    }

    const start = this.points[0];

    const plane = constrainAxis
      ? ShapeUtils.planeFromConstrainAxis(constrainAxis.axis)
      : ShapeUtils.determinePlane(start, cursorPosition);

    if (pointCount === 1) {
      return this.calculateLine(start, cursorPosition, selectedBlockId, dimensions);
    }

    const end = this.points[1];

    if (pointCount === 2) {
      const cp1 = cursorPosition;
      const cp2 = this.mirrorControlPoint(cp1, start, end);
      return this.calculateBezier(start, end, cp1, cp2, plane, selectedBlockId, dimensions);
    }

    const cp1 = this.points[2];

    if (pointCount === 3) {
      return this.calculateBezier(start, end, cp1, cursorPosition, plane, selectedBlockId, dimensions);
    }

    const cp2 = this.points[3];
    return this.calculateBezier(start, end, cp1, cp2, plane, selectedBlockId, dimensions);
  }

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

  private calculateBezier(
    start: Vector3D,
    end: Vector3D,
    cp1: Vector3D,
    cp2: Vector3D,
    plane: Plane,
    blockType: string | null,
    dimensions: Dimensions
  ): PaintOperation[] {
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
   * ShapeUtils.calculateBezierCurve takes control points as { x, y } holding plane (u, v) values
   */
  private to2DControlPoint(pos: Vector3D, plane: Plane): { x: number; y: number } {
    const uv = ShapeUtils.to2D(pos, plane);
    return { x: uv.u, y: uv.v };
  }

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

  private isValidPosition(pos: Vector3D, dimensions: Dimensions): boolean {
    return (
      pos.x >= 0 && pos.x < dimensions.width &&
      pos.y >= 0 && pos.y < dimensions.height &&
      pos.z >= 0 && pos.z < dimensions.depth
    );
  }

  private deduplicateOperations(operations: PaintOperation[]): PaintOperation[] {
    const seen = new Set<string>();
    return operations.filter(filterDuplicatePositions(seen));
  }
}

const toOperation = (blockType: string | null) => (position: Vector3D): PaintOperation => ({
  position,
  blockType,
});

const filterDuplicatePositions = (seen: Set<string>) => (op: PaintOperation): boolean => {
  const key = `${op.position.x},${op.position.y},${op.position.z}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
};
