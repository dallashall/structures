/**
 * BlockRenderer - Renders committed blocks as instanced 3D meshes
 *
 * Uses BabylonJS InstancedMesh for performance: one hidden base mesh per
 * block type, all blocks of that type as lightweight instances sharing
 * geometry and material. Layer highlight uses per-instance color buffers
 * (registerInstancedBuffer) to dim non-active-layer blocks without
 * cloning materials.
 */

import {
  Vector4,
  Color4,
  MeshBuilder,
  Mesh,
  InstancedMesh,
  Animation,
  EasingFunction,
  ElasticEase,
  Scene,
} from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { textureManager } from '../TextureManager';
import { editorState } from '../EditorState';
import { toBabylonVector, positionKey, centerInCell, isTintedTextureBlock, hexToColor4 } from './babylonUtils';
import { shapeCatalog } from '../shapes/ShapeCatalog';

import type { MaterialResolver } from './MaterialResolver';
import type { Vector3D, BlockData, BlockStateProperties, RenderSettings } from '../../types';

// Per-instance vertex colors for layer highlight
// Each axis maps to an RGB channel: X=red, Y=green, Z=blue
// Overlapping layers combine additively (e.g., X+Z = red+blue = magenta tint)
const COLOR_NORMAL = new Color4(1, 1, 1, 1);
const AXIS_TINT_BOOST = 0.4; // How much each axis channel is boosted

export class BlockRenderer {
  private scene: Scene;
  private materialResolver: MaterialResolver;

  // One hidden base mesh per block type (shares geometry + material)
  private instanceBases = new Map<string, Mesh>();

  // One instance per block position
  private blockInstances = new Map<string, InstancedMesh>();

  // Position key -> block type (for detecting type changes)
  private instanceTypeMap = new Map<string, string>();

  // Edge rendering state
  private edgesEnabled = false;
  private edgesWidth = 1.0;
  private edgesColor = '#000000';

  // Layer highlight
  private layerHighlightEnabled = false;

  // Mesh lifecycle callbacks (for shadow caster registration)
  private onMeshCreated: ((mesh: AbstractMesh) => void) | null = null;
  private onMeshDestroyed: ((mesh: AbstractMesh) => void) | null = null;

  constructor(scene: Scene, materialResolver: MaterialResolver) {
    this.scene = scene;
    this.materialResolver = materialResolver;
  }

  /**
   * Set callbacks invoked when block meshes are created/destroyed.
   * Used by Babylon3D to register/unregister shadow casters.
   */
  setMeshLifecycleCallbacks(
    onCreated: (mesh: AbstractMesh) => void,
    onDestroyed: (mesh: AbstractMesh) => void
  ): void {
    this.onMeshCreated = onCreated;
    this.onMeshDestroyed = onDestroyed;
  }

  /**
   * Create an instanced block mesh (or update existing)
   */
  createBlockMesh(blockData: BlockData, animate: boolean = true): void {
    const key = positionKey(blockData.position);
    const shape = shapeCatalog.resolve(blockData.blockType);
    const geoKey = shape.getGeometryKey(blockData.blockState);
    const compositeKey = blockData.blockType + (geoKey ? '|' + geoKey : '');
    const existingType = this.instanceTypeMap.get(key);

    // Same block+geometry already at this position — just update highlight
    if (existingType === compositeKey) {
      const existing = this.blockInstances.get(key);
      if (existing) {
        this.updateInstanceHighlight(existing, blockData.position);
      }
      return;
    }

    // Different type at this position — dispose old instance first
    if (existingType !== undefined) {
      this.disposeInstance(key, false);
    }

    const base = this.getOrCreateBase(blockData.blockType, blockData.blockState);
    if (!base) return;

    const instance = base.createInstance(`inst_${key}`);
    instance.position = toBabylonVector(centerInCell(blockData.position));

    // Apply per-instance rotation from shape
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

    // Notify shadow system
    this.onMeshCreated?.(instance);

    if (animate) {
      instance.scaling.y = 0;

      const scaleAnim = new Animation(
        'scaleYAnimation',
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      scaleAnim.setKeys([
        { frame: 0, value: 0 },
        { frame: 36, value: 1 },
      ]);

      const easing = new ElasticEase();
      easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
      easing.oscillations = 1;
      easing.springiness = 2;
      scaleAnim.setEasingFunction(easing);

      instance.animations = [scaleAnim];
      this.scene.beginAnimation(instance, 0, 36, false);
    }
  }

  /**
   * Remove a block mesh with optional animation
   */
  removeBlockMesh(position: Vector3D, animate: boolean = true): void {
    const key = positionKey(position);
    const instance = this.blockInstances.get(key);
    if (!instance) return;

    // Unregister from shadow system
    this.onMeshDestroyed?.(instance);

    // Remove from tracking maps immediately
    const blockType = this.instanceTypeMap.get(key);
    this.blockInstances.delete(key);
    this.instanceTypeMap.delete(key);

    if (animate) {
      const fadeAnim = new Animation(
        'fadeOutAnimation',
        'visibility',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      const scaleAnim = new Animation(
        'scaleDownAnimation',
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      fadeAnim.setKeys([
        { frame: 0, value: 1 },
        { frame: 12, value: 0 },
      ]);

      scaleAnim.setKeys([
        { frame: 0, value: 1 },
        { frame: 12, value: 0 },
      ]);

      instance.animations = [fadeAnim, scaleAnim];
      const animatable = this.scene.beginAnimation(instance, 0, 12, false);

      const handleAnimationEnd = (): void => {
        instance.dispose();
        if (blockType) this.cleanupBaseIfEmpty(blockType);
      };
      animatable.onAnimationEnd = handleAnimationEnd;
    } else {
      instance.dispose();
      if (blockType) this.cleanupBaseIfEmpty(blockType);
    }
  }

  setLayerHighlightEnabled(enabled: boolean): void {
    this.layerHighlightEnabled = enabled;

    // When disabling, reset all instances to full brightness
    if (!enabled) {
      for (const instance of this.blockInstances.values()) {
        instance.instancedBuffers.color = COLOR_NORMAL;
      }
    }
  }

  /**
   * Update highlight for a single instance based on active layers.
   * Each axis maps to an RGB channel (X=R, Y=G, Z=B). Blocks on
   * multiple active layers get combined tints (e.g., X+Z = magenta).
   */
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

    // Match 2D axis colors: X=red, Y=blue, Z=green
    instance.instancedBuffers.color = new Color4(
      1 + (onX ? AXIS_TINT_BOOST : 0),
      1 + (onZ ? AXIS_TINT_BOOST : 0),
      1 + (onY ? AXIS_TINT_BOOST : 0),
      1,
    );
  }

  /**
   * Update brightness for all blocks
   */
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
   * Re-apply materials to all base meshes (instances inherit automatically)
   */
  reapplyMaterials(): void {
    for (const [compositeKey, base] of this.instanceBases.entries()) {
      // Extract blockType from composite key (blockType or blockType|geoKey)
      const blockType = compositeKey.includes('|')
        ? compositeKey.slice(0, compositeKey.indexOf('|'))
        : compositeKey;
      base.material = this.materialResolver.resolve(blockType);
    }
  }

  /**
   * Update edge rendering settings on all base meshes (instances inherit)
   */
  updateEdgeRendering(settings: RenderSettings): void {
    this.edgesEnabled = settings.edgesEnabled;
    this.edgesWidth = settings.edgesWidth;
    this.edgesColor = settings.edgesColor;

    for (const base of this.instanceBases.values()) {
      if (settings.edgesEnabled) {
        this.applyEdgeRendering(base);
      } else {
        base.disableEdgesRendering();
      }
    }
  }

  /**
   * Clear all instances and base meshes
   */
  clearAll(): void {
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
  }

  /**
   * Get the block instances map (for external iteration)
   */
  getBlockMeshes(): Map<string, InstancedMesh> {
    return this.blockInstances;
  }

  destroy(): void {
    this.clearAll();
  }

  // ---- Private helpers ----

  /**
   * Get or create a hidden base mesh for a block type + geometry variant.
   * Base meshes hold geometry (faceUV) and material; instances reference them.
   * The cache key is blockType + geometryKey (e.g., "minecraft:oak_slab:slab_bottom").
   */
  private getOrCreateBase(blockType: string, blockState?: BlockStateProperties): Mesh | null {
    const blockShape = shapeCatalog.resolve(blockType);
    const geoKey = blockShape.getGeometryKey(blockState);
    const compositeKey = blockType + (geoKey ? '|' + geoKey : '');

    const existing = this.instanceBases.get(compositeKey);
    if (existing) return existing;

    const block = blockRegistry.getBlock(blockType);
    if (!block) return null;

    const usesTintedTexture = isTintedTextureBlock(blockType);
    const faceUVData = !usesTintedTexture ? textureManager.getBlockFaceUV3D(blockType) : null;

    let base: Mesh;

    const customMesh = blockShape.createMesh(this.scene, blockState ?? {}, faceUVData ?? undefined);
    if (customMesh) {
      base = customMesh;
      base.name = `base_${compositeKey}`;
    } else {
      // Default: cube geometry
      const boxOptions: Record<string, unknown> = { size: 1 };
      if (faceUVData) {
        const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 =>
          new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
        boxOptions.faceUV = faceUVData.map(toVector4);
      }
      base = MeshBuilder.CreateBox(`base_${compositeKey}`, boxOptions, this.scene);
    }

    base.isVisible = false; // Hidden base — instances are visible
    base.material = this.materialResolver.resolve(blockType);

    // Register per-instance color buffer for layer highlight
    base.registerInstancedBuffer('color', 4);
    base.instancedBuffers.color = COLOR_NORMAL;

    // Edge rendering on base propagates to instances
    this.applyEdgeRendering(base);

    this.instanceBases.set(compositeKey, base);
    return base;
  }

  /**
   * Dispose an instance at the given position key (immediate, no animation)
   */
  private disposeInstance(key: string, notifyShadow: boolean): void {
    const instance = this.blockInstances.get(key);
    if (!instance) return;

    if (notifyShadow) {
      this.onMeshDestroyed?.(instance);
    }

    const blockType = this.instanceTypeMap.get(key);
    instance.dispose();
    this.blockInstances.delete(key);
    this.instanceTypeMap.delete(key);

    if (blockType) this.cleanupBaseIfEmpty(blockType);
  }

  /**
   * Dispose base mesh if it has no remaining instances
   */
  private cleanupBaseIfEmpty(blockType: string): void {
    const base = this.instanceBases.get(blockType);
    if (!base) return;

    if (base.instances.length === 0) {
      base.dispose();
      this.instanceBases.delete(blockType);
    }
  }

  private applyEdgeRendering(mesh: Mesh): void {
    if (!this.edgesEnabled) return;
    mesh.enableEdgesRendering();
    mesh.edgesWidth = this.edgesWidth;
    mesh.edgesColor = hexToColor4(this.edgesColor);
  }
}
