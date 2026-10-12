import type { Vector3D, Dimensions } from '../../../types';

export type Plane = 'xy' | 'xz' | 'yz';

/**
 * ShapeUtils - Plane geometry for the arch and curve tools, and the plane helpers every shape uses
 *
 * All 2D math runs in a plane's (u, v) space:
 * - xy plane: u=x, v=y (z held constant)
 * - xz plane: u=x, v=z (y held constant)
 * - yz plane: u=y, v=z (x held constant)
 *
 * to2D() projects 3D→2D and from2D() maps a cell back to 3D.
 */
export class ShapeUtils {
  static to2D(point: Vector3D, plane: Plane): { u: number; v: number } {
    switch (plane) {
      case 'xy': return { u: point.x, v: point.y };
      case 'xz': return { u: point.x, v: point.z };
      case 'yz': return { u: point.y, v: point.z };
    }
  }

  /**
   * Place a plane cell back in 3D. The axis the plane holds constant comes from `reference`.
   */
  static from2D(cell: { u: number; v: number }, plane: Plane, reference: Vector3D): Vector3D {
    return this.applyToPlane(cell.u, cell.v, 0, 0, plane, reference);
  }

  /**
   * Angles are degrees in (u, v) space: 0° points along +u and 90° along +v
   */
  static calculateArchOutline(
    center: Vector3D,
    radius: number,
    startAngle: number,
    endAngle: number,
    plane: Plane,
    dimensions: Dimensions
  ): Vector3D[] {
    const positions: Vector3D[] = [];
    const r = Math.round(radius);
    const c = this.to2D(center, plane);

    // One step per cell of arc length
    const angleSpan = Math.abs(endAngle - startAngle);
    const steps = Math.max(Math.round((angleSpan / 360) * (2 * Math.PI * r)), 1);

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      const rad = (angle * Math.PI) / 180;

      const dx = Math.round(r * Math.cos(rad));
      const dy = Math.round(r * Math.sin(rad));

      const pos = this.applyToPlane(c.u, c.v, dx, dy, plane, center);
      if (this.isInBounds(pos, dimensions)) {
        positions.push(pos);
      }
    }

    return this.removeDuplicates(positions);
  }

  /**
   * The filled sector between the two angles
   */
  static calculateArchFilled(
    center: Vector3D,
    radius: number,
    startAngle: number,
    endAngle: number,
    plane: Plane,
    dimensions: Dimensions
  ): Vector3D[] {
    const positions: Vector3D[] = [];
    const r = Math.round(radius);
    const c = this.to2D(center, plane);

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= r) {
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angle < 0) angle += 360;

          const normalizedStart = startAngle < 0 ? startAngle + 360 : startAngle;
          const normalizedEnd = endAngle < 0 ? endAngle + 360 : endAngle;

          if (this.isAngleInRange(angle, normalizedStart, normalizedEnd)) {
            const pos = this.applyToPlane(c.u, c.v, dx, dy, plane, center);
            if (this.isInBounds(pos, dimensions)) {
              positions.push(pos);
            }
          }
        }
      }
    }

    return positions;
  }

  /**
   * Control points are plane (u, v) values in { x, y } fields. Start and end are 3D.
   * The curve samples segments + 1 points, so a curve longer than that many cells has gaps.
   */
  static calculateBezierCurve(
    start: Vector3D,
    end: Vector3D,
    cp1: { x: number; y: number },
    cp2: { x: number; y: number },
    plane: Plane,
    dimensions: Dimensions,
    segments: number = 20
  ): Vector3D[] {
    const positions: Vector3D[] = [];

    const s = this.to2D(start, plane);
    const e = this.to2D(end, plane);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      const u =
        Math.pow(1 - t, 3) * s.u +
        3 * Math.pow(1 - t, 2) * t * cp1.x +
        3 * (1 - t) * Math.pow(t, 2) * cp2.x +
        Math.pow(t, 3) * e.u;

      const v =
        Math.pow(1 - t, 3) * s.v +
        3 * Math.pow(1 - t, 2) * t * cp1.y +
        3 * (1 - t) * Math.pow(t, 2) * cp2.y +
        Math.pow(t, 3) * e.v;

      const pos = this.applyToPlane(Math.round(u), Math.round(v), 0, 0, plane, start);
      if (this.isInBounds(pos, dimensions)) {
        positions.push(pos);
      }
    }

    return this.removeDuplicates(positions);
  }

  /**
   * Prefer this to determinePlane(), which guesses from position deltas
   */
  static planeFromConstrainAxis(axis: 'x' | 'y' | 'z'): Plane {
    switch (axis) {
      case 'x': return 'yz';
      case 'y': return 'xz';
      case 'z': return 'xy';
    }
  }

  /**
   * Fallback when no view supplies the constrained axis: the axis with the least change is taken as constant
   */
  static determinePlane(start: Vector3D, end: Vector3D): Plane {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const dz = Math.abs(end.z - start.z);

    if (dx <= dy && dx <= dz) {
      return 'yz';
    } else if (dy <= dx && dy <= dz) {
      return 'xz';
    } else {
      return 'xy';
    }
  }

  /**
   * (u + du, v + dv) in plane space. The constant axis comes from `reference`.
   */
  private static applyToPlane(
    u: number,
    v: number,
    du: number,
    dv: number,
    plane: Plane,
    reference: Vector3D
  ): Vector3D {
    switch (plane) {
      case 'xy':
        return { x: u + du, y: v + dv, z: reference.z };
      case 'xz':
        return { x: u + du, y: reference.y, z: v + dv };
      case 'yz':
        return { x: reference.x, y: u + du, z: v + dv };
    }
  }

  static isInBounds(pos: Vector3D, dimensions: Dimensions): boolean {
    return (
      pos.x >= 0 &&
      pos.x < dimensions.width &&
      pos.y >= 0 &&
      pos.y < dimensions.height &&
      pos.z >= 0 &&
      pos.z < dimensions.depth
    );
  }

  /**
   * A range whose start exceeds its end wraps through 0°
   */
  private static isAngleInRange(angle: number, start: number, end: number): boolean {
    if (start <= end) {
      return angle >= start && angle <= end;
    } else {
      return angle >= start || angle <= end;
    }
  }

  private static removeDuplicates(positions: Vector3D[]): Vector3D[] {
    const seen = new Set<string>();
    const isFirstAtPosition = (pos: Vector3D): boolean => {
      const key = `${pos.x},${pos.y},${pos.z}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    };
    return positions.filter(isFirstAtPosition);
  }
}
