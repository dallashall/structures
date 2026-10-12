import type { CellBox, PlanePoint } from './DragShape';
import { rectangleCells } from './DragShape';
import { DragShapeStrategy } from './DragShapeStrategy';

/**
 * OutlinePaintStrategy - Rectangle tool geometry, outline or filled
 */
export class OutlinePaintStrategy extends DragShapeStrategy {
  protected toCells(box: CellBox, isFilled: boolean): PlanePoint[] {
    return rectangleCells(box, isFilled);
  }
}
