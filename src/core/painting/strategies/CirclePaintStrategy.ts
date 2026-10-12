import type { CellBox, PlanePoint } from './DragShape';
import { ellipseCells } from './DragShape';
import { DragShapeStrategy } from './DragShapeStrategy';

/**
 * CirclePaintStrategy - Circle tool geometry: the ellipse inscribed in the drag box, outline or filled
 */
export class CirclePaintStrategy extends DragShapeStrategy {
  protected toCells(box: CellBox, isFilled: boolean): PlanePoint[] {
    return ellipseCells(box, isFilled);
  }
}
