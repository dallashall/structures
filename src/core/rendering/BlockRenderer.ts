/**
 * BlockRenderer - Renders committed blocks as 3D meshes
 *
 * Creates, removes, animates, and highlights block meshes
 * based on active layers. Manages the blockMeshes collection.
 * Supports edge rendering and shadow caster lifecycle callbacks.
 */

import {
  Vector4,
  MeshBuilder,
  Mesh,
  Animation,
  EasingFunction,
  ElasticEase,
  Scene,
  Color3,
  Material,
} from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { textureManager } from '../TextureManager';
import { editorState } from '../EditorState';
import { toBabylonVector, positionKey, centerInCell, isTintedTextureBlock, hexToColor4 } from './babylonUtils';

import type { PBRMaterial, StandardMaterial } from '@babylonjs/core';
import type { MaterialResolver } from './MaterialResolver';
import type { Vector3D, BlockData, RenderSettings } from '../../types';

export class BlockRenderer {
  private scene: Scene;
  private materialResolver: MaterialResolver;
  private blockMeshes = new Map<string, Mesh>();

  // Edge rendering state
  private edgesEnabled = false;
  private edgesWidth = 1.0;
  private edgesColor = '#000000';

  // Layer highlight
  private layerHighlightEnabled = false;

  // Mesh lifecycle callbacks (for shadow caster registration)
  private onMeshCreated: ((mesh: Mesh) => void) | null = null;
  private onMeshDestroyed: ((mesh: Mesh) => void) | null = null;

  constructor(scene: Scene, materialResolver: MaterialResolver) {
    this.scene = scene;
    this.materialResolver = materialResolver;
  }

  /**
   * Set callbacks invoked when block meshes are created/destroyed.
   * Used by Babylon3D to register/unregister shadow casters.
   */
  setMeshLifecycleCallbacks(
    onCreated: (mesh: Mesh) => void,
    onDestroyed: (mesh: Mesh) => void
  ): void {
    this.onMeshCreated = onCreated;
    this.onMeshDestroyed = onDestroyed;
  }

  /**
   * Create a block mesh with scale-in animation
   * If a block already exists at this position, update its material instead
   */
  createBlockMesh(blockData: BlockData, animate: boolean = true): void {
    const key = positionKey(blockData.position);

    // Check if block already exists at this position
    if (this.blockMeshes.has(key)) {
      const existingMesh = this.blockMeshes.get(key)!;
      existingMesh.material = this.materialResolver.resolve(blockData.blockType);
      this.updateMeshBrightness(existingMesh, blockData.position);
      return;
    }

    const block = blockRegistry.getBlock(blockData.blockType);
    if (!block) return;

    const usesTintedTexture = isTintedTextureBlock(blockData.blockType);

    const boxOptions: any = { size: 1 };

    // Only apply atlas faceUV for blocks using shared atlas material
    if (!usesTintedTexture) {
      const faceUVData = textureManager.getBlockFaceUV3D(blockData.blockType);
      if (faceUVData) {
        const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }) => {
          return new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
        };
        boxOptions.faceUV = faceUVData.map(toVector4);
      }
    }

    const box = MeshBuilder.CreateBox(
      `block_${key}`,
      boxOptions,
      this.scene
    );

    box.position = toBabylonVector(centerInCell(blockData.position));

    box.metadata = {
      blockType: blockData.blockType,
      position: blockData.position,
    };

    box.material = this.materialResolver.resolve(blockData.blockType);
    this.blockMeshes.set(key, box);
    this.updateMeshBrightness(box, blockData.position);

    // Apply edge rendering if enabled
    this.applyEdgeRendering(box);

    // Notify shadow system
    this.onMeshCreated?.(box);

    if (animate) {
      box.scaling.y = 0;

      const animationScaleY = new Animation(
        'scaleYAnimation',
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      const keys = [
        { frame: 0, value: 0 },
        { frame: 36, value: 1 },
      ];

      animationScaleY.setKeys(keys);

      const easingFunction = new ElasticEase();
      easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
      easingFunction.oscillations = 1;
      easingFunction.springiness = 2;
      animationScaleY.setEasingFunction(easingFunction);

      box.animations = [animationScaleY];
      this.scene.beginAnimation(box, 0, 36, false);
    }
  }

  /**
   * Remove a block mesh with fade-out animation
   */
  removeBlockMesh(position: Vector3D, animate: boolean = true): void {
    const key = positionKey(position);
    const mesh = this.blockMeshes.get(key);
    if (!mesh) return;

    this.blockMeshes.delete(key);

    // Notify shadow system before disposal
    this.onMeshDestroyed?.(mesh);

    if (animate) {
      const animationAlpha = new Animation(
        'fadeOutAnimation',
        'visibility',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      const animationScaleY = new Animation(
        'scaleDownAnimation',
        'scaling.y',
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      animationAlpha.setKeys([
        { frame: 0, value: 1 },
        { frame: 12, value: 0 },
      ]);

      animationScaleY.setKeys([
        { frame: 0, value: 1 },
        { frame: 12, value: 0 },
      ]);

      mesh.animations = [animationAlpha, animationScaleY];
      const animatable = this.scene.beginAnimation(mesh, 0, 12, false);

      animatable.onAnimationEnd = () => {
        mesh.dispose();
      };
    } else {
      mesh.dispose();
    }
  }

  setLayerHighlightEnabled(enabled: boolean): void {
    this.layerHighlightEnabled = enabled;
  }

  /**
   * Update brightness of a single mesh based on active layers
   */
  updateMeshBrightness(mesh: Mesh, position: Vector3D): void {
    if (!this.layerHighlightEnabled) return;
    const activeLayers = editorState.getActiveLayers();

    const isOnActiveLayer =
      position.x === activeLayers.x ||
      position.y === activeLayers.y ||
      position.z === activeLayers.z;

    if (!mesh.metadata || !mesh.metadata.blockType) return;

    const blockId = mesh.metadata.blockType;
    const baseMaterial = this.materialResolver.resolve(blockId);

    if (isOnActiveLayer) {
      const highlightedMaterial = baseMaterial.clone(`${baseMaterial.name}_highlight_${mesh.uniqueId}`) as Material;

      // Add emissive highlight -- works on both StandardMaterial and PBRMaterial
      const asPBR = highlightedMaterial as unknown as PBRMaterial;
      const asStandard = highlightedMaterial as unknown as StandardMaterial;

      if (asPBR.albedoColor) {
        asPBR.emissiveColor = asPBR.albedoColor.scale(0.15);
      } else if (asStandard.diffuseColor) {
        asStandard.emissiveColor = (asStandard.diffuseColor as Color3).scale(0.15);
      }

      if (mesh.material !== baseMaterial && mesh.material) {
        mesh.material.dispose();
      }

      mesh.material = highlightedMaterial;
    } else {
      if (mesh.material !== baseMaterial && mesh.material) {
        mesh.material.dispose();
      }

      mesh.material = baseMaterial;
    }
  }

  /**
   * Update brightness for all blocks
   */
  updateAllBrightness(blocks: Iterable<BlockData>): void {
    for (const blockData of blocks) {
      const key = positionKey(blockData.position);
      const mesh = this.blockMeshes.get(key);
      if (mesh) {
        this.updateMeshBrightness(mesh, blockData.position);
      }
    }
  }

  /**
   * Re-apply materials to all existing meshes (call after atlas reload)
   */
  reapplyMaterials(): void {
    for (const mesh of this.blockMeshes.values()) {
      if (mesh.metadata && mesh.metadata.blockType) {
        mesh.material = this.materialResolver.resolve(mesh.metadata.blockType);
      }
    }
  }

  /**
   * Update edge rendering settings on all existing meshes
   */
  updateEdgeRendering(settings: RenderSettings): void {
    this.edgesEnabled = settings.edgesEnabled;
    this.edgesWidth = settings.edgesWidth;
    this.edgesColor = settings.edgesColor;

    for (const mesh of this.blockMeshes.values()) {
      if (settings.edgesEnabled) {
        this.applyEdgeRendering(mesh);
      } else {
        mesh.disableEdgesRendering();
      }
    }
  }

  /**
   * Clear all block meshes
   */
  clearAll(): void {
    for (const mesh of this.blockMeshes.values()) {
      this.onMeshDestroyed?.(mesh);
      mesh.dispose();
    }
    this.blockMeshes.clear();
  }

  /**
   * Get the block meshes map (for external iteration)
   */
  getBlockMeshes(): Map<string, Mesh> {
    return this.blockMeshes;
  }

  destroy(): void {
    this.clearAll();
  }

  // ---- Private helpers ----

  private applyEdgeRendering(mesh: Mesh): void {
    if (!this.edgesEnabled) return;
    mesh.enableEdgesRendering();
    mesh.edgesWidth = this.edgesWidth;
    mesh.edgesColor = hexToColor4(this.edgesColor);
  }
}
