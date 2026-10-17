/**
 * CubeShape - The fallback shape. BlockRenderer builds cube geometry itself, so this shape adds nothing.
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
    return null;
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
    return null;
  }

  deriveState(
    _position: Vector3D,
    baseState: BlockStateProperties,
    _blockIndex: BlockIndexReader,
  ): BlockStateProperties {
    return baseState;
  }

  getExportBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  getTextureBlockId(blockId: string, _blockState: BlockStateProperties): string {
    return blockId;
  }

  matchesBlock(_blockId: string): boolean {
    return true;
  }
}

export const cubeShape: BlockShape = new CubeShapeImpl();
