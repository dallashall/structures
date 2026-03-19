import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils, type Plane } from './ShapeUtils';
import { editorState } from '../../EditorState';
import type { GuideGeometry, ControlPointHandle, GuideLine } from './GuideGeometry';
import type { GuideGeometryProvider } from './GuideGeometryProvider';

/**
 * ArchPaintStrategy - Multi-click arch painting (3 points)
 *
 * Interaction: 3 clicks to define an arch
 * 1. Click base start (left foot of arch)
 * 2. Click base end (right foot of arch)
 * 3. Click apex (defines arch height/curvature)
 *
 * Preview progression:
 * - 0 points: single block at cursor
 * - 1 point: line from base start to cursor (preview base span)
 * - 2 points: arch from base start to base end, apex height from cursor
 * - 3 points (complete): final arch shape
 *
 * Supports outline vs filled based on shapeFillMode.
 */
export class ArchPaintStrategy implements PaintStrategy, GuideGeometryProvider {
  private points: Vector3D[] = [];
  private readonly requiredPoints = 3;

  /**
   * Add a clicked point to the arch definition
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
   * Reset multi-click state for next arch
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
    const baseStart = this.points[0];

    handles.push({ position: baseStart, label: 'Base Start', style: 'placed' });

    if (pointCount === 1) {
      handles.push({ position: cursorPosition, label: 'Base End', style: 'cursor' });
      lines.push({ from: baseStart, to: cursorPosition, style: 'baseline' });
    }

    if (pointCount >= 2) {
      const baseEnd = this.points[1];
      handles.push({ position: baseEnd, label: 'Base End', style: 'placed' });
      lines.push({ from: baseStart, to: baseEnd, style: 'baseline' });

      const midpoint: Vector3D = {
        x: (baseStart.x + baseEnd.x) / 2,
        y: (baseStart.y + baseEnd.y) / 2,
        z: (baseStart.z + baseEnd.z) / 2,
      };

      if (pointCount === 2) {
        handles.push({ position: cursorPosition, label: 'Apex', style: 'cursor' });
        lines.push({ from: midpoint, to: cursorPosition, style: 'control' });
      }

      if (pointCount >= 3) {
        const apex = this.points[2];
        handles.push({ position: apex, label: 'Apex', style: 'placed' });
        lines.push({ from: midpoint, to: apex, style: 'control' });
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

    // Resolve the plane from view context (authoritative) or fallback to heuristic
    const plane = constrainAxis
      ? ShapeUtils.planeFromConstrainAxis(constrainAxis.axis)
      : ShapeUtils.determinePlane(this.points[0], cursorPosition);

    // 1 point: line from base start to cursor (preview base span)
    if (pointCount === 1) {
      return this.calculateLine(this.points[0], cursorPosition, selectedBlockId, dimensions);
    }

    // 2 points: arch with apex height from cursor
    // 3 points (complete): final arch using stored apex
    const baseStart = this.points[0];
    const baseEnd = this.points[1];
    const apex = pointCount >= 3 ? this.points[2] : cursorPosition;

    return this.calculateArch(baseStart, baseEnd, apex, plane, selectedBlockId, dimensions);
  }

  /**
   * Calculate a line between two points (Bresenham-like for preview)
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
   * Calculate arch shape from base start, base end, and apex point
   *
   * The apex point defines the arch height: its perpendicular distance
   * from the base line determines the radius of the arch curve.
   */
  private calculateArch(
    baseStart: Vector3D,
    baseEnd: Vector3D,
    apex: Vector3D,
    plane: Plane,
    blockType: string | null,
    dimensions: Dimensions
  ): PaintOperation[] {
    // Calculate the midpoint of the base
    const midX = (baseStart.x + baseEnd.x) / 2;
    const midY = (baseStart.y + baseEnd.y) / 2;
    const midZ = (baseStart.z + baseEnd.z) / 2;

    // Base span (distance between feet)
    const baseDx = baseEnd.x - baseStart.x;
    const baseDy = baseEnd.y - baseStart.y;
    const baseDz = baseEnd.z - baseStart.z;
    const baseLength = Math.sqrt(baseDx * baseDx + baseDy * baseDy + baseDz * baseDz);

    if (baseLength < 1) {
      return [{ position: baseStart, blockType }];
    }

    // Calculate height: perpendicular distance from apex to the base line
    // Vector from midpoint to apex
    const toApexX = apex.x - midX;
    const toApexY = apex.y - midY;
    const toApexZ = apex.z - midZ;

    // Project onto base direction to get the perpendicular component
    const baseUnitX = baseDx / baseLength;
    const baseUnitY = baseDy / baseLength;
    const baseUnitZ = baseDz / baseLength;

    const dotProduct = toApexX * baseUnitX + toApexY * baseUnitY + toApexZ * baseUnitZ;
    const perpX = toApexX - dotProduct * baseUnitX;
    const perpY = toApexY - dotProduct * baseUnitY;
    const perpZ = toApexZ - dotProduct * baseUnitZ;

    const height = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);

    if (height < 1) {
      // Too flat, just draw the base line
      return this.calculateLine(baseStart, baseEnd, blockType, dimensions);
    }

    // Normalize the perpendicular direction (arch curves toward apex)
    const perpUnitX = perpX / height;
    const perpUnitY = perpY / height;
    const perpUnitZ = perpZ / height;

    // Calculate arch center and radius using the base and height
    // For a circular arch: center is at midpoint offset downward
    // radius = (baseLength/2)^2 / (2*height) + height/2 for general arch
    const halfBase = baseLength / 2;
    const radius = (halfBase * halfBase + height * height) / (2 * height);
    const centerOffset = radius - height;

    // Center of the circle (offset from midpoint in opposite direction of apex)
    const centerX = midX - perpUnitX * centerOffset;
    const centerY = midY - perpUnitY * centerOffset;
    const centerZ = midZ - perpUnitZ * centerOffset;
    const center: Vector3D = {
      x: Math.round(centerX),
      y: Math.round(centerY),
      z: Math.round(centerZ),
    };

    // Calculate angles from center to base start and base end
    const startAngle = this.angleFromCenter(center, baseStart, plane);
    const endAngle = this.angleFromCenter(center, baseEnd, plane);

    // Determine which arc to draw (the one that passes through the apex)
    const apexAngle = this.angleFromCenter(center, apex, plane);
    const { start: arcStart, end: arcEnd } = this.selectArc(startAngle, endAngle, apexAngle);

    // Get positions based on fill mode
    const shapeFillMode = editorState.getShapeFillMode();
    let positions: Vector3D[];

    if (shapeFillMode === 'filled') {
      positions = ShapeUtils.calculateArchFilled(center, radius, arcStart, arcEnd, plane, dimensions);
    } else {
      positions = ShapeUtils.calculateArchOutline(center, radius, arcStart, arcEnd, plane, dimensions);
    }

    return positions.map(toOperation(blockType));
  }

  /**
   * Calculate angle from center to a point in the given plane
   */
  private angleFromCenter(center: Vector3D, point: Vector3D, plane: Plane): number {
    const c = ShapeUtils.to2D(center, plane);
    const p = ShapeUtils.to2D(point, plane);
    const du = p.u - c.u;
    const dv = p.v - c.v;
    return (Math.atan2(dv, du) * 180) / Math.PI;
  }

  /**
   * Select the correct arc direction that passes through the apex
   */
  private selectArc(
    startAngle: number,
    endAngle: number,
    apexAngle: number
  ): { start: number; end: number } {
    // Normalize angles to [0, 360)
    const normalize = (a: number): number => ((a % 360) + 360) % 360;
    const s = normalize(startAngle);
    const e = normalize(endAngle);
    const a = normalize(apexAngle);

    // Check if apex is in the clockwise arc from s to e
    const isInArc = (from: number, to: number, angle: number): boolean => {
      if (from <= to) {
        return angle >= from && angle <= to;
      }
      return angle >= from || angle <= to;
    };

    if (isInArc(s, e, a)) {
      return { start: s, end: e };
    }
    // Apex is in the other arc, so swap
    return { start: e, end: s };
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
