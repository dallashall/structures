import type { PaintStrategy, PaintOperation } from './PaintStrategy';
import type { Vector3D, Dimensions } from '../../../types';
import type { CellBox, PlanePoint } from './DragShape';
import { toDragBox } from './DragShape';
import { ShapeUtils } from './ShapeUtils';
import { editorState } from '../../EditorState';

/**
 * DragShapeStrategy - Shared drag flow for shapes drawn inside a box
 *
 * The press point and the current point span a box on the view's plane.
 * Held Shift makes the box square. Held Alt centers the box on the press point.
 * Subclasses only choose which cells of the box to paint.
 */
export abstract class DragShapeStrategy implements PaintStrategy {
  private dragStart: Vector3D | null = null;

  startDrag(position: Vector3D): void {
    this.dragStart = position;
  }

  endDrag(): void {
    this.dragStart = null;
  }

  protected abstract toCells(box: CellBox, isFilled: boolean): PlanePoint[];

  calculateOperations(
    endPosition: Vector3D,
    selectedBlockId: string | null,
    dimensions: Dimensions,
    constrainAxis?: { axis: 'x' | 'y' | 'z'; value: number }
  ): PaintOperation[] {
    const start = this.dragStart ?? endPosition;
    const plane = constrainAxis
      ? ShapeUtils.planeFromConstrainAxis(constrainAxis.axis)
      : ShapeUtils.determinePlane(start, endPosition);

    const { shift, alt } = editorState.getHeldModifiers();
    const box = toDragBox(ShapeUtils.to2D(start, plane), ShapeUtils.to2D(endPosition, plane), {
      square: shift,
      fromCenter: alt,
    });
    const isFilled = editorState.getShapeFillMode() === 'filled';

    const toPosition = (cell: PlanePoint): Vector3D => ShapeUtils.from2D(cell, plane, start);
    const isInBounds = (position: Vector3D): boolean => ShapeUtils.isInBounds(position, dimensions);
    const toOperation = (position: Vector3D): PaintOperation => ({ position, blockType: selectedBlockId });

    return this.toCells(box, isFilled).map(toPosition).filter(isInBounds).map(toOperation);
  }
}
