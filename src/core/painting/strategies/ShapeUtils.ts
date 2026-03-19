import type { Vector3D, Dimensions, DepthConfig } from '../../../types';

/**
 * Plane types for 2D drawing in 3D space
 */
export type Plane = 'xy' | 'xz' | 'yz';

/**
 * ShapeUtils - Mathematical utilities for shape drawing
 *
 * Provides algorithms for:
 * - Circle calculations (midpoint circle algorithm)
 * - Arch calculations (arc segments)
 * - Bezier curve calculations (cubic bezier)
 * - Depth projection for multi-layer painting
 *
 * COORDINATE CONVENTION:
 * All 2D math operates in (u, v) space where:
 * - xy plane: u=x, v=y (constrained z)
 * - xz plane: u=x, v=z (constrained y)
 * - yz plane: u=y, v=z (constrained x)
 *
 * Use to2D() to project 3D→2D and applyToPlane() to project 2D→3D.
 */
export class ShapeUtils {
  /**
   * Project a 3D point onto a 2D plane coordinate system
   *
   * Returns the two relevant components for the given plane:
   * - xy: { u: x, v: y }
   * - xz: { u: x, v: z }
   * - yz: { u: y, v: z }
   */
  static to2D(point: Vector3D, plane: Plane): { u: number; v: number } {
    switch (plane) {
      case 'xy': return { u: point.x, v: point.y };
      case 'xz': return { u: point.x, v: point.z };
      case 'yz': return { u: point.y, v: point.z };
    }
  }

  /**
   * Calculate circle outline using midpoint circle algorithm
   * Uses 8-way symmetry for perfect discrete circles
   */
  static calculateCircleOutline(
    center: Vector3D,
    radius: number,
    plane: Plane,
    dimensions: Dimensions
  ): Vector3D[] {
    const positions: Vector3D[] = [];
    const r = Math.round(radius);
    const c = this.to2D(center, plane);

    // Midpoint circle algorithm
    let x = 0;
    let y = r;
    let d = 1 - r;

    const addSymmetricPoints = (cu: number, cv: number, dx: number, dy: number) => {
      const points = [
        { dx, dy },
        { dx: -dx, dy },
        { dx, dy: -dy },
        { dx: -dx, dy: -dy },
        { dx: dy, dy: dx },
        { dx: -dy, dy: dx },
        { dx: dy, dy: -dx },
        { dx: -dy, dy: -dx },
      ];

      for (const point of points) {
        const pos = this.applyToPlane(cu, cv, point.dx, point.dy, plane, center);
        if (this.isValidPosition(pos, dimensions)) {
          positions.push(pos);
        }
      }
    };

    while (x <= y) {
      addSymmetricPoints(c.u, c.v, x, y);

      if (d < 0) {
        d += 2 * x + 3;
      } else {
        d += 2 * (x - y) + 5;
        y--;
      }
      x++;
    }

    return this.removeDuplicates(positions);
  }

  /**
   * Calculate filled circle using scan-line algorithm
   */
  static calculateCircleFilled(
    center: Vector3D,
    radius: number,
    plane: Plane,
    dimensions: Dimensions
  ): Vector3D[] {
    const positions: Vector3D[] = [];
    const r = Math.round(radius);
    const rSquared = r * r;
    const c = this.to2D(center, plane);

    // Scan-line fill using circle equation
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= rSquared) {
          const pos = this.applyToPlane(c.u, c.v, dx, dy, plane, center);
          if (this.isValidPosition(pos, dimensions)) {
            positions.push(pos);
          }
        }
      }
    }

    return positions;
  }

  /**
   * Calculate arch outline (pure curved arc)
   * Angles in degrees: 0° = right, 90° = up, 180° = left
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

    // Calculate arc length to determine number of steps
    const angleSpan = Math.abs(endAngle - startAngle);
    const steps = Math.max(Math.round((angleSpan / 360) * (2 * Math.PI * r)), 1);

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      const rad = (angle * Math.PI) / 180;

      const dx = Math.round(r * Math.cos(rad));
      const dy = Math.round(r * Math.sin(rad));

      const pos = this.applyToPlane(c.u, c.v, dx, dy, plane, center);
      if (this.isValidPosition(pos, dimensions)) {
        positions.push(pos);
      }
    }

    return this.removeDuplicates(positions);
  }

  /**
   * Calculate filled arch (arc sector)
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

    // Fill sector by checking each point within bounding box
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= r) {
          // Check if point is within angle range
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angle < 0) angle += 360;

          const normalizedStart = startAngle < 0 ? startAngle + 360 : startAngle;
          const normalizedEnd = endAngle < 0 ? endAngle + 360 : endAngle;

          if (this.isAngleInRange(angle, normalizedStart, normalizedEnd)) {
            const pos = this.applyToPlane(c.u, c.v, dx, dy, plane, center);
            if (this.isValidPosition(pos, dimensions)) {
              positions.push(pos);
            }
          }
        }
      }
    }

    return positions;
  }

  /**
   * Calculate cubic Bezier curve
   * Uses De Casteljau's algorithm for smooth interpolation
   *
   * Control points are in 2D plane coordinates (u, v) matching the plane.
   * Start and end are 3D and get projected internally.
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

    // Project start/end to 2D plane coordinates to match control points
    const s = this.to2D(start, plane);
    const e = this.to2D(end, plane);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      // Cubic bezier formula (all in 2D plane coordinates)
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
      if (this.isValidPosition(pos, dimensions)) {
        positions.push(pos);
      }
    }

    return this.removeDuplicates(positions);
  }

  /**
   * Apply depth to 2D positions, extending them through multiple layers
   *
   * OPTIMIZATION: For collision detection, pre-fetch all potentially colliding blocks
   * instead of calling getBlock() hundreds/thousands of times individually.
   */
  static applyDepth(
    positions: Vector3D[],
    depthConfig: DepthConfig,
    constrainAxis: 'x' | 'y' | 'z',
    dimensions: Dimensions,
    getBlock: (pos: Vector3D) => string | null
  ): Vector3D[] {
    if (!depthConfig.enabled || depthConfig.thickness <= 1) {
      return positions;
    }

    const result: Vector3D[] = [];

    // OPTIMIZATION: Pre-fetch all blocks in collision check range
    // This converts O(positions × depth) individual queries into a single batch
    let blockLookup: Set<string> | null = null;
    if (depthConfig.mode === 'until-collision') {
      blockLookup = new Set<string>();

      // Build set of all occupied positions in the depth range we'll check
      for (const basePos of positions) {
        for (let depth = 1; depth < depthConfig.thickness; depth++) {
          const pos = { ...basePos };

          switch (constrainAxis) {
            case 'x':
              pos.x = basePos.x + depth;
              break;
            case 'y':
              pos.y = basePos.y + depth;
              break;
            case 'z':
              pos.z = basePos.z + depth;
              break;
          }

          if (this.isValidPosition(pos, dimensions)) {
            const block = getBlock(pos);
            if (block !== null) {
              blockLookup.add(`${pos.x},${pos.y},${pos.z}`);
            }
          }
        }
      }
    }

    // Now do the actual depth application with fast O(1) collision lookups
    for (const basePos of positions) {
      // Add base position
      result.push(basePos);

      // Extend through depth
      for (let depth = 1; depth < depthConfig.thickness; depth++) {
        const pos = { ...basePos };

        // Apply depth in constrained axis direction
        switch (constrainAxis) {
          case 'x':
            pos.x = basePos.x + depth;
            break;
          case 'y':
            pos.y = basePos.y + depth;
            break;
          case 'z':
            pos.z = basePos.z + depth;
            break;
        }

        // Check bounds
        if (!this.isValidPosition(pos, dimensions)) {
          break; // Stop extending this position
        }

        // Check collision mode using pre-fetched lookup
        if (depthConfig.mode === 'until-collision' && blockLookup) {
          const key = `${pos.x},${pos.y},${pos.z}`;
          if (blockLookup.has(key)) {
            break; // Stop at collision
          }
        }

        result.push(pos);
      }
    }

    return result;
  }

  /**
   * Get the drawing plane from a constrain axis
   *
   * This is the authoritative way to determine the plane when the
   * constrained axis is known (i.e., passed from the view context).
   * Prefer this over determinePlane() which guesses from position deltas.
   */
  static planeFromConstrainAxis(axis: 'x' | 'y' | 'z'): Plane {
    switch (axis) {
      case 'x': return 'yz';
      case 'y': return 'xz';
      case 'z': return 'xy';
    }
  }

  /**
   * Determine plane from start and end positions (heuristic fallback)
   *
   * Infers the constrained axis by finding which axis has the least variation.
   * Use planeFromConstrainAxis() instead when the constrained axis is known.
   */
  static determinePlane(start: Vector3D, end: Vector3D): Plane {
    // Check which axis has the least variation (constrained axis)
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const dz = Math.abs(end.z - start.z);

    if (dx <= dy && dx <= dz) {
      return 'yz'; // X is constrained, draw in YZ plane
    } else if (dy <= dx && dy <= dz) {
      return 'xz'; // Y is constrained, draw in XZ plane
    } else {
      return 'xy'; // Z is constrained, draw in XY plane
    }
  }

  /**
   * Get the perpendicular axis for a given plane (for depth)
   */
  static getPerpendicularAxis(plane: Plane): 'x' | 'y' | 'z' {
    switch (plane) {
      case 'xy':
        return 'z';
      case 'xz':
        return 'y';
      case 'yz':
        return 'x';
    }
  }

  /**
   * Apply 2D plane coordinates back to a 3D position
   *
   * The (u, v) + (du, dv) values are in the plane's coordinate system:
   * - xy: u→x, v→y, constrained z from reference
   * - xz: u→x, v→z, constrained y from reference
   * - yz: u→y, v→z, constrained x from reference
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

  /**
   * Check if position is within valid dimensions
   */
  private static isValidPosition(pos: Vector3D, dimensions: Dimensions): boolean {
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
   * Check if angle is within range (handles wrap-around)
   */
  private static isAngleInRange(angle: number, start: number, end: number): boolean {
    if (start <= end) {
      return angle >= start && angle <= end;
    } else {
      // Wraps around 360
      return angle >= start || angle <= end;
    }
  }

  /**
   * Remove duplicate positions
   */
  private static removeDuplicates(positions: Vector3D[]): Vector3D[] {
    const seen = new Set<string>();
    return positions.filter((pos) => {
      const key = `${pos.x},${pos.y},${pos.z}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
