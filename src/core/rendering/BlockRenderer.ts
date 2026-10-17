/**
 * BlockRenderer - Committed blocks as Babylon instanced meshes
 *
 * One hidden base mesh per block type and geometry variant holds the geometry and material.
 * Every block is an instance of its base. Layer highlight writes a per-instance color buffer,
 * so it tints blocks without cloning materials.
 */

import {
  Vector4,
  Color4,
  MeshBuilder,
  Mesh,
  InstancedMesh,
  Scene,
} from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { textureResolver } from '../TextureResolver';
import { editorState } from '../EditorState';
import { toBabylonVector, positionKey, centerInCell, isTintedTextureBlock } from './babylonUtils';
import { shapeCatalog } from '../shapes/ShapeCatalog';
import { GrowAnimator, type StepTiming } from './GrowAnimator';
import { includeInThumbnail } from './ThumbnailCapture';

import type { MaterialResolver } from './MaterialResolver';
import type { Vector3D, BlockData, BlockStateProperties } from '../../types';

// Layer highlight boosts one color channel per axis to match the 2D axis colors: X red, Y blue, Z green.
// A block on two active layers gets both boosts, so X+Y tints magenta.
const COLOR_NORMAL = new Color4(1, 1, 1, 1);
const AXIS_TINT_BOOST = 0.4;

export class BlockRenderer {
  private scene: Scene;
  private materialResolver: MaterialResolver;

  // Keyed by `blockType` or `blockType|geometryKey`
  private instanceBases = new Map<string, Mesh>();

  private blockInstances = new Map<string, InstancedMesh>();

  // Position key → base key, so a placement over a different type replaces the instance
  private instanceTypeMap = new Map<string, string>();

  private layerHighlightEnabled = false;

  private onMeshCreated: ((mesh: AbstractMesh) => void) | null = null;
  private onMeshDestroyed: ((mesh: AbstractMesh) => void) | null = null;

  private animator: GrowAnimator;

  constructor(scene: Scene, materialResolver: MaterialResolver) {
    this.scene = scene;
    this.materialResolver = materialResolver;
    this.animator = new GrowAnimator(scene);
  }

  /**
   * Babylon3D registers and unregisters shadow casters through these
   */
  setMeshLifecycleCallbacks(
    onCreated: (mesh: AbstractMesh) => void,
    onDestroyed: (mesh: AbstractMesh) => void
  ): void {
    this.onMeshCreated = onCreated;
    this.onMeshDestroyed = onDestroyed;
  }

  /**
   * With a timing, the block grows into place
   */
  createBlockMesh(blockData: BlockData, grow: StepTiming | null = null): void {
    const key = positionKey(blockData.position);
    const shape = shapeCatalog.resolve(blockData.blockType);
    const geoKey = shape.getGeometryKey(blockData.blockState);
    const compositeKey = blockData.blockType + (geoKey ? '|' + geoKey : '');
    const existingType = this.instanceTypeMap.get(key);

    if (existingType === compositeKey) {
      const existing = this.blockInstances.get(key);
      if (existing) {
        this.updateInstanceHighlight(existing, blockData.position);
      }
      return;
    }

    if (existingType !== undefined) {
      this.disposeInstance(key, false);
    }

    const base = this.getOrCreateBase(blockData.blockType, blockData.blockState);
    if (!base) return;

    const instance = base.createInstance(`inst_${key}`);
    includeInThumbnail(instance);
    instance.position = toBabylonVector(centerInCell(blockData.position));

    const rotation = shape.getRotation(blockData.blockState);
    if (rotation !== 0) {
      instance.rotation.y = rotation;
    }

    instance.metadata = {
      blockType: blockData.blockType,
      blockState: blockData.blockState,
      position: blockData.position,
    };

    this.blockInstances.set(key, instance);
    this.instanceTypeMap.set(key, compositeKey);

    this.updateInstanceHighlight(instance, blockData.position);

    this.onMeshCreated?.(instance);

    if (grow) {
      this.animator.grow(instance, grow);
    }
  }

  /**
   * With a timing, the block shrinks out before it is disposed
   */
  removeBlockMesh(position: Vector3D, shrink: StepTiming | null = null): void {
    const key = positionKey(position);
    const instance = this.blockInstances.get(key);
    if (!instance) return;

    this.onMeshDestroyed?.(instance);

    // Remove from tracking maps immediately, so a block placed here during the shrink gets its own instance
    const blockType = this.instanceTypeMap.get(key);
    this.blockInstances.delete(key);
    this.instanceTypeMap.delete(key);

    const disposeRemoved = (): void => {
      instance.dispose();
      if (blockType) this.cleanupBaseIfEmpty(blockType);
    };

    if (shrink) {
      this.animator.shrink(instance, shrink, disposeRemoved);
    } else {
      this.animator.cancel(instance);
      disposeRemoved();
    }
  }

  getBlockType(key: string): string | null {
    return (this.blockInstances.get(key)?.metadata as { blockType?: string } | undefined)?.blockType ?? null;
  }

  /**
   * Run once each time every grow and shrink has finished
   */
  setAnimationSettledCallback(onSettled: () => void): void {
    this.animator.setSettledCallback(onSettled);
  }

  setLayerHighlightEnabled(enabled: boolean): void {
    this.layerHighlightEnabled = enabled;

    if (!enabled) {
      for (const instance of this.blockInstances.values()) {
        instance.instancedBuffers.color = COLOR_NORMAL;
      }
    }
  }

  private updateInstanceHighlight(instance: InstancedMesh, position: Vector3D): void {
    if (!this.layerHighlightEnabled) {
      instance.instancedBuffers.color = COLOR_NORMAL;
      return;
    }

    const activeLayers = editorState.getActiveLayers();
    const onX = position.x === activeLayers.x;
    const onY = position.y === activeLayers.y;
    const onZ = position.z === activeLayers.z;

    if (!onX && !onY && !onZ) {
      instance.instancedBuffers.color = COLOR_NORMAL;
      return;
    }

    instance.instancedBuffers.color = new Color4(
      1 + (onX ? AXIS_TINT_BOOST : 0),
      1 + (onZ ? AXIS_TINT_BOOST : 0),
      1 + (onY ? AXIS_TINT_BOOST : 0),
      1,
    );
  }

  updateAllBrightness(blocks: Iterable<BlockData>): void {
    for (const blockData of blocks) {
      const key = positionKey(blockData.position);
      const instance = this.blockInstances.get(key);
      if (instance) {
        this.updateInstanceHighlight(instance, blockData.position);
      }
    }
  }

  /**
   * Instances share their base's material, so only bases need it
   */
  reapplyMaterials(): void {
    for (const [compositeKey, base] of this.instanceBases.entries()) {
      const blockType = compositeKey.includes('|')
        ? compositeKey.slice(0, compositeKey.indexOf('|'))
        : compositeKey;
      base.material = this.materialResolver.resolve(blockType);
    }
  }

  clearAll(): void {
    // Disposing the bases below also disposes instances still shrinking out
    this.animator.clear();
    // Each dispose would otherwise free the scene's active-mesh lists once per block
    this.scene.blockfreeActiveMeshesAndRenderingGroups = true;
    for (const instance of this.blockInstances.values()) {
      this.onMeshDestroyed?.(instance);
      instance.dispose();
    }
    this.blockInstances.clear();
    this.instanceTypeMap.clear();

    for (const base of this.instanceBases.values()) {
      base.dispose();
    }
    this.instanceBases.clear();
    this.scene.blockfreeActiveMeshesAndRenderingGroups = false;
  }

  getBlockMeshes(): Map<string, InstancedMesh> {
    return this.blockInstances;
  }

  destroy(): void {
    this.clearAll();
  }

  private getOrCreateBase(blockType: string, blockState?: BlockStateProperties): Mesh | null {
    const blockShape = shapeCatalog.resolve(blockType);
    const geoKey = blockShape.getGeometryKey(blockState);
    const compositeKey = blockType + (geoKey ? '|' + geoKey : '');

    const existing = this.instanceBases.get(compositeKey);
    if (existing) return existing;

    const block = blockRegistry.getBlock(blockType);
    if (!block) return null;

    const usesTintedTexture = isTintedTextureBlock(blockType);
    const textureBlockId = blockShape.getTextureBlockId(blockType, blockState ?? {});
    const faceUVData = !usesTintedTexture ? textureResolver.getBlockFaceUV3D(textureBlockId) : null;

    let base: Mesh;

    const customMesh = blockShape.createMesh(this.scene, blockState ?? {}, faceUVData ?? undefined, textureBlockId);
    if (customMesh) {
      base = customMesh;
      base.name = `base_${compositeKey}`;
    } else {
      const boxOptions: Record<string, unknown> = { size: 1 };
      if (faceUVData) {
        const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 =>
          new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
        boxOptions.faceUV = faceUVData.map(toVector4);
      }
      base = MeshBuilder.CreateBox(`base_${compositeKey}`, boxOptions, this.scene);
    }

    // Instances still render while their base is hidden
    base.isVisible = false;
    includeInThumbnail(base);
    base.material = this.materialResolver.resolve(blockType);

    base.registerInstancedBuffer('color', 4);
    base.instancedBuffers.color = COLOR_NORMAL;

    this.instanceBases.set(compositeKey, base);
    return base;
  }

  private disposeInstance(key: string, notifyShadow: boolean): void {
    const instance = this.blockInstances.get(key);
    if (!instance) return;

    if (notifyShadow) {
      this.onMeshDestroyed?.(instance);
    }

    const blockType = this.instanceTypeMap.get(key);
    this.animator.cancel(instance);
    instance.dispose();
    this.blockInstances.delete(key);
    this.instanceTypeMap.delete(key);

    if (blockType) this.cleanupBaseIfEmpty(blockType);
  }

  private cleanupBaseIfEmpty(blockType: string): void {
    const base = this.instanceBases.get(blockType);
    if (!base) return;

    if (base.instances.length === 0) {
      base.dispose();
      this.instanceBases.delete(blockType);
    }
  }
}
