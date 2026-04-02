/**
 * CubeShape - Default shape for standard full-block cubes
 *
 * All methods are passthrough/no-op defaults. Cube geometry is handled
 * by the renderer's fallback path (MeshBuilder.CreateBox).
 */

import type { BlockShape, ClipPath, FaceUVData } from './BlockShape';
import type { Scene, Mesh } from '@babylonjs/core';
import type { BlockStateProperties, ViewType, Vector3D } from '../../types';
import type { BlockIndexReader } from '../BlockIndex';

class CubeShapeImpl implements BlockShape {
  readonly shapeId = 'cube';

  getGeometryKey(_blockState?: BlockStateProperties): string {
    return '';
  }

  createMesh(
    _scene: Scene,
    _blockState: BlockStateProperties,
    _faceUVData?: FaceUVData,
  ): Mesh | null {
    return null; // Signal: use default cube
  }

  getRotation(_blockState?: BlockStateProperties): number {
    return 0;
  }

  get2DClip(
    _blockState: BlockStateProperties,
    _viewType: ViewType,
    _px: number,
    _py: number,
    _cellSize: number,
  ): ClipPath | null {
    return null; // Full cell
  }

  deriveState(
    _position: Vector3D,
    baseState: BlockStateProperties,
    _blockIndex: BlockIndexReader,
  ): BlockStateProperties {
    return baseState;
  }

  matchesBlock(_blockId: string): boolean {
    return true; // Fallback — matches everything
  }
}

export const cubeShape: BlockShape = new CubeShapeImpl();
