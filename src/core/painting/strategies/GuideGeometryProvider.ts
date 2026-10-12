import type { Vector3D } from '../../../types';
import type { GuideGeometry } from './GuideGeometry';

/**
 * GuideGeometryProvider - Implemented by multi-click strategies that show control points and guide lines
 */
export interface GuideGeometryProvider {
  /**
   * The cursor stands in for the next unplaced point. Null before the first click.
   */
  getGuideGeometry(cursorPosition: Vector3D): GuideGeometry | null;
}
