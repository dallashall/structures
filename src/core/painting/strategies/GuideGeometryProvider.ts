import type { Vector3D } from '../../../types';
import type { GuideGeometry } from './GuideGeometry';

/**
 * GuideGeometryProvider - Optional interface for strategies that provide
 * construction guide geometry during multi-click interactions.
 *
 * Strategies implement this to expose control points and guide lines
 * without breaking PaintStrategy encapsulation.
 */
export interface GuideGeometryProvider {
  /**
   * Get the current guide geometry for rendering control points and guide lines.
   *
   * @param cursorPosition - Current cursor world position (the "next" point)
   * @returns Guide geometry, or null if no guides should be shown
   */
  getGuideGeometry(cursorPosition: Vector3D): GuideGeometry | null;
}

/**
 * Type guard to check if a strategy implements GuideGeometryProvider
 */
export const isGuideGeometryProvider = (
  strategy: unknown
): strategy is GuideGeometryProvider =>
  strategy !== null &&
  typeof strategy === 'object' &&
  'getGuideGeometry' in (strategy as object);
