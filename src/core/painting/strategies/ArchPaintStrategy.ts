import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import { ShapeUtils, type Plane } from './ShapeUtils';
import { editorState } from '../../EditorState';
import type { GuideGeometry, ControlPointHandle, GuideLine } from './GuideGeometry';
import type { GuideGeometryProvider } from './GuideGeometryProvider';

/**
 * ArchPaintStrategy - A circular arch from three clicks: two feet, then the apex
 *
 * Until all three points exist the cursor stands in for the next one,
 * so the preview shows a single block, then the base line, then the arch.
 */
export class ArchPaintStrategy implements PaintStrategy, GuideGeometryProvider {
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

    if (pointCount === 0) {
      if (!this.isValidPosition(cursorPosition, dimensions)) {
        return [];
      }
      return [{ position: cursorPosition, blockType: selectedBlockId }];
    }

    const plane = constrainAxis
      ? ShapeUtils.planeFromConstrainAxis(constrainAxis.axis)
      : ShapeUtils.determinePlane(this.points[0], cursorPosition);

    if (pointCount === 1) {
      return this.calculateLine(this.points[0], cursorPosition, selectedBlockId, dimensions);
    }

    const baseStart = this.points[0];
    const baseEnd = this.points[1];
    const apex = pointCount >= 3 ? this.points[2] : cursorPosition;

    return this.calculateArch(baseStart, baseEnd, apex, plane, selectedBlockId, dimensions);
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

  /**
   * The apex's perpendicular distance from the base line is the arch height.
   * Base and height fix the circle through both feet and the apex.
   */
  private calculateArch(
    baseStart: Vector3D,
    baseEnd: Vector3D,
    apex: Vector3D,
    plane: Plane,
    blockType: string | null,
    dimensions: Dimensions
  ): PaintOperation[] {
    const midX = (baseStart.x + baseEnd.x) / 2;
    const midY = (baseStart.y + baseEnd.y) / 2;
    const midZ = (baseStart.z + baseEnd.z) / 2;

    const baseDx = baseEnd.x - baseStart.x;
    const baseDy = baseEnd.y - baseStart.y;
    const baseDz = baseEnd.z - baseStart.z;
    const baseLength = Math.sqrt(baseDx * baseDx + baseDy * baseDy + baseDz * baseDz);

    if (baseLength < 1) {
      return [{ position: baseStart, blockType }];
    }

    const toApexX = apex.x - midX;
    const toApexY = apex.y - midY;
    const toApexZ = apex.z - midZ;

    // Remove the component along the base, leaving the perpendicular part
    const baseUnitX = baseDx / baseLength;
    const baseUnitY = baseDy / baseLength;
    const baseUnitZ = baseDz / baseLength;

    const dotProduct = toApexX * baseUnitX + toApexY * baseUnitY + toApexZ * baseUnitZ;
    const perpX = toApexX - dotProduct * baseUnitX;
    const perpY = toApexY - dotProduct * baseUnitY;
    const perpZ = toApexZ - dotProduct * baseUnitZ;

    const height = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);

    if (height < 1) {
      return this.calculateLine(baseStart, baseEnd, blockType, dimensions);
    }

    const perpUnitX = perpX / height;
    const perpUnitY = perpY / height;
    const perpUnitZ = perpZ / height;

    // Circle through both feet and the apex: r = (halfBase² + height²) / (2 × height).
    // Its center sits r - height from the base midpoint, away from the apex.
    const halfBase = baseLength / 2;
    const radius = (halfBase * halfBase + height * height) / (2 * height);
    const centerOffset = radius - height;

    const centerX = midX - perpUnitX * centerOffset;
    const centerY = midY - perpUnitY * centerOffset;
    const centerZ = midZ - perpUnitZ * centerOffset;
    const center: Vector3D = {
      x: Math.round(centerX),
      y: Math.round(centerY),
      z: Math.round(centerZ),
    };

    const startAngle = this.angleFromCenter(center, baseStart, plane);
    const endAngle = this.angleFromCenter(center, baseEnd, plane);

    // Of the two arcs between the feet, draw the one through the apex
    const apexAngle = this.angleFromCenter(center, apex, plane);
    const { start: arcStart, end: arcEnd } = this.selectArc(startAngle, endAngle, apexAngle);

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
   * Degrees in the plane's (u, v) space, counterclockwise from +u
   */
  private angleFromCenter(center: Vector3D, point: Vector3D, plane: Plane): number {
    const c = ShapeUtils.to2D(center, plane);
    const p = ShapeUtils.to2D(point, plane);
    const du = p.u - c.u;
    const dv = p.v - c.v;
    return (Math.atan2(dv, du) * 180) / Math.PI;
  }

  private selectArc(
    startAngle: number,
    endAngle: number,
    apexAngle: number
  ): { start: number; end: number } {
    const normalize = (a: number): number => ((a % 360) + 360) % 360;
    const s = normalize(startAngle);
    const e = normalize(endAngle);
    const a = normalize(apexAngle);

    // True when `angle` lies on the arc running from `from` to `to` by increasing angle
    const isInArc = (from: number, to: number, angle: number): boolean => {
      if (from <= to) {
        return angle >= from && angle <= to;
      }
      return angle >= from || angle <= to;
    };

    if (isInArc(s, e, a)) {
      return { start: s, end: e };
    }
    return { start: e, end: s };
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
