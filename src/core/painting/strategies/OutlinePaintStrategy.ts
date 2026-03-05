import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';

/**
 * OutlinePaintStrategy - Rectangle outline painting
 *
 * Paints the perimeter of a rectangle (hollow, not filled).
 * Supports drag interaction: click and drag to define rectangle corners,
 * then paints only the outline edges.
 *
 * Future: Support for other shapes (circles, arcs, curves).
 */
export class OutlinePaintStrategy implements PaintStrategy {
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
        endPosition.x < 0 || endPosition.x >= dimensions.width ||
        endPosition.y < 0 || endPosition.y >= dimensions.height ||
        endPosition.z < 0 || endPosition.z >= dimensions.depth
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

    // Calculate rectangle outline from dragStart to endPosition
    return this.calculateRectangleOutline(
      this.dragStart,
      endPosition,
      selectedBlockId,
      dimensions
    );
  }

  /**
   * Calculate the outline/perimeter of a rectangle
   * Returns only the edge positions (hollow rectangle)
   */
  private calculateRectangleOutline(
    start: Vector3D,
    end: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions
  ): PaintOperation[] {
    const operations: PaintOperation[] = [];

    // Calculate rectangle bounds
    const minX = Math.max(0, Math.min(start.x, end.x));
    const maxX = Math.min(dimensions.width - 1, Math.max(start.x, end.x));
    const minY = Math.max(0, Math.min(start.y, end.y));
    const maxY = Math.min(dimensions.height - 1, Math.max(start.y, end.y));
    const minZ = Math.max(0, Math.min(start.z, end.z));
    const maxZ = Math.min(dimensions.depth - 1, Math.max(start.z, end.z));

    // Determine which plane we're drawing on (based on which dimension is constant)
    const isXConstant = start.x === end.x;
    const isYConstant = start.y === end.y;
    const isZConstant = start.z === end.z;

    if (isXConstant) {
      // Drawing in YZ plane (front/back view)
      const x = start.x;
      // Top edge
      for (let y = minY; y <= maxY; y++) {
        operations.push({ position: { x, y, z: minZ }, blockType: selectedBlockId });
      }
      // Bottom edge
      for (let y = minY; y <= maxY; y++) {
        operations.push({ position: { x, y, z: maxZ }, blockType: selectedBlockId });
      }
      // Left edge (excluding corners to avoid duplicates)
      for (let z = minZ + 1; z < maxZ; z++) {
        operations.push({ position: { x, y: minY, z }, blockType: selectedBlockId });
      }
      // Right edge (excluding corners)
      for (let z = minZ + 1; z < maxZ; z++) {
        operations.push({ position: { x, y: maxY, z }, blockType: selectedBlockId });
      }
    } else if (isYConstant) {
      // Drawing in XZ plane (left/right view)
      const y = start.y;
      // Top edge
      for (let x = minX; x <= maxX; x++) {
        operations.push({ position: { x, y, z: minZ }, blockType: selectedBlockId });
      }
      // Bottom edge
      for (let x = minX; x <= maxX; x++) {
        operations.push({ position: { x, y, z: maxZ }, blockType: selectedBlockId });
      }
      // Left edge (excluding corners)
      for (let z = minZ + 1; z < maxZ; z++) {
        operations.push({ position: { x: minX, y, z }, blockType: selectedBlockId });
      }
      // Right edge (excluding corners)
      for (let z = minZ + 1; z < maxZ; z++) {
        operations.push({ position: { x: maxX, y, z }, blockType: selectedBlockId });
      }
    } else if (isZConstant) {
      // Drawing in XY plane (top/bottom view)
      const z = start.z;
      // Top edge
      for (let x = minX; x <= maxX; x++) {
        operations.push({ position: { x, y: minY, z }, blockType: selectedBlockId });
      }
      // Bottom edge
      for (let x = minX; x <= maxX; x++) {
        operations.push({ position: { x, y: maxY, z }, blockType: selectedBlockId });
      }
      // Left edge (excluding corners)
      for (let y = minY + 1; y < maxY; y++) {
        operations.push({ position: { x: minX, y, z }, blockType: selectedBlockId });
      }
      // Right edge (excluding corners)
      for (let y = minY + 1; y < maxY; y++) {
        operations.push({ position: { x: maxX, y, z }, blockType: selectedBlockId });
      }
    } else {
      // 3D rectangle - not on a single plane
      // For now, just return the two corner points
      operations.push({ position: start, blockType: selectedBlockId });
      operations.push({ position: end, blockType: selectedBlockId });
    }

    return operations;
  }
}

