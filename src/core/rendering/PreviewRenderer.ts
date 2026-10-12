/**
 * PreviewRenderer - Renders ghost/translucent preview overlays
 *
 * Creates and diffs preview meshes for hover and paint drafts.
 * Combines previews from EditorState and DraftingService.
 */

import {
  MeshBuilder,
  Scene,
  Mesh,
} from '@babylonjs/core';
import { blockRegistry } from '../BlockRegistry';
import { editorState } from '../EditorState';
import { draftingService } from '../DraftingService';
import { toBabylonVector, positionKey, centerInCell } from './babylonUtils';
import { shapeCatalog } from '../shapes/ShapeCatalog';

import type { MaterialResolver } from './MaterialResolver';

export class PreviewRenderer {
  private scene: Scene;
  private materialResolver: MaterialResolver;
  private previewMeshes = new Map<string, Mesh>();

  constructor(scene: Scene, materialResolver: MaterialResolver) {
    this.scene = scene;
    this.materialResolver = materialResolver;
  }

  /**
   * Sync preview meshes with current preview state
   * Uses diffing to avoid flashing and improve performance
   */
  updatePreviewMeshes(): void {
    const editorPreview = editorState.getPreviewBlocks() || [];
    const draftPreview = draftingService.getResolvedPreview() || [];
    const allPreviewBlocks = [...editorPreview, ...draftPreview];

    const toPreviewKey = (block: (typeof allPreviewBlocks)[number]): string => positionKey(block.position);
    const newPreviewKeys = new Set(allPreviewBlocks.map(toPreviewKey));

    // Remove meshes no longer in preview
    for (const key of this.previewMeshes.keys()) {
      if (!newPreviewKeys.has(key)) {
        const mesh = this.previewMeshes.get(key)!;
        mesh.dispose();
        this.previewMeshes.delete(key);
      }
    }

    // Add new preview meshes
    for (const previewBlock of allPreviewBlocks) {
      if (!previewBlock.blockType) continue;

      const key = positionKey(previewBlock.position);

      if (!this.previewMeshes.has(key)) {
        this.createPreviewMesh(previewBlock);
      }
    }
  }

  /**
   * Create a ghost/preview mesh (semi-transparent)
   * Delegates geometry creation to the block's shape.
   */
  private createPreviewMesh(previewBlock: import('../EditorState').PreviewBlock): void {
    const key = positionKey(previewBlock.position);

    const block = blockRegistry.getBlock(previewBlock.blockType!);
    if (!block) return;

    const blockShape = shapeCatalog.resolve(previewBlock.blockType!);
    let mesh: Mesh;

    const customMesh = blockShape.createMesh(this.scene, previewBlock.blockState ?? {});
    if (customMesh) {
      mesh = customMesh;
      mesh.name = `preview_${key}`;
    } else {
      mesh = MeshBuilder.CreateBox(
        `preview_${key}`,
        { size: 1 },
        this.scene,
      );
    }

    mesh.position = toBabylonVector(centerInCell(previewBlock.position));

    // Apply per-instance rotation from shape
    const rotation = blockShape.getRotation(previewBlock.blockState);
    if (rotation !== 0) {
      mesh.rotation.y = rotation;
    }

    const deleteMode = editorState.getDeleteMode();
    mesh.material = deleteMode
      ? this.materialResolver.resolveDeleteGhost(block.color)
      : this.materialResolver.resolveGhost(block.color);

    this.previewMeshes.set(key, mesh);
  }

  /**
   * Clear all preview meshes
   */
  clearAll(): void {
    for (const mesh of this.previewMeshes.values()) {
      mesh.dispose();
    }
    this.previewMeshes.clear();
  }

  destroy(): void {
    this.clearAll();
  }
}
