/**
 * Babylon3D - Orchestrator for 3D rendering
 *
 * Creates the BabylonJS engine/scene and coordinates composable modules:
 * - CameraRig: Camera positioning and preset views
 * - MaterialResolver: Block material resolution and caching
 * - BlockRenderer: Committed block mesh lifecycle
 * - PreviewRenderer: Ghost/preview mesh lifecycle
 * - SlicePlaneVisualizer: Active layer slice planes
 * - SceneSetup: Stateless lighting, grid, and axes setup
 *
 * COORDINATE SYSTEM:
 * Our system: Z-up, right-handed (X=width, Y=depth, Z=height)
 * BabylonJS: Y-up, left-handed (see toBabylonVector in babylonUtils)
 */

import {
  Engine,
  Scene,
  Color3,
} from '@babylonjs/core';
import { projectView } from '../projections/ProjectView';
import { blockProjection } from '../projections/BlockProjection';
import { modelProjection } from '../projections/ModelProjection';
import { draftingService } from './DraftingService';
import { textureManager } from './TextureManager';
import { editorState } from './EditorState';
import { SlicePlaneVisualizer } from './rendering/SlicePlaneVisualizer';
import { setupLighting, setupGrid, updateGrid, setupAxes } from './rendering/SceneSetup';
import { MaterialResolver } from './rendering/MaterialResolver';
import { CameraRig } from './rendering/CameraRig';
import { BlockRenderer } from './rendering/BlockRenderer';
import { PreviewRenderer } from './rendering/PreviewRenderer';
import { positionKey } from './rendering/babylonUtils';

import type { BlockData } from '../types';

export class Babylon3D {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;

  // Composable modules
  private cameraRig: CameraRig;
  private materialResolver: MaterialResolver;
  private blockRenderer: BlockRenderer;
  private previewRenderer: PreviewRenderer;
  private slicePlaneVisualizer: SlicePlaneVisualizer | null = null;

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    tick: this.updateScene.bind(this),
    previewChanged: this.handlePreviewChanged.bind(this),
    layerChanged: this.handleLayerChanged.bind(this),
    resize: this.handleResize.bind(this),
    atlasLoaded: this.handleAtlasLoaded.bind(this),
    sliceGuideToggled: this.handleSliceGuideToggled.bind(this),
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create BabylonJS engine and scene
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color3(0.1, 0.1, 0.1).toColor4();

    // Instantiate modules (dependency injection)
    this.cameraRig = new CameraRig(this.scene, canvas);
    this.materialResolver = new MaterialResolver(this.scene);
    this.blockRenderer = new BlockRenderer(this.scene, this.materialResolver);
    this.previewRenderer = new PreviewRenderer(this.scene, this.materialResolver);

    // Stateless scene setup
    setupLighting(this.scene);
    setupGrid(this.scene);
    setupAxes(this.scene);
    this.setupSlicePlanes();

    // Subscribe to projection changes
    blockProjection.on('blocks:rebuilt', this.boundHandlers.tick);
    modelProjection.on('model:rebuilt', this.boundHandlers.tick);

    // Subscribe to preview state
    draftingService.on('draft:updated', this.boundHandlers.previewChanged);
    draftingService.on('draft:finalized', this.boundHandlers.previewChanged);
    draftingService.on('draft:cancelled', this.boundHandlers.previewChanged);
    editorState.on('preview:rendered', this.boundHandlers.previewChanged);

    // Subscribe to editor state events
    editorState.on('layer:adjusted', this.boundHandlers.layerChanged);
    editorState.on('sliceguide:axis:toggled', this.boundHandlers.sliceGuideToggled);

    // Subscribe to texture atlas loading
    textureManager.on('atlas:loaded', this.boundHandlers.atlasLoaded);

    // Handle window resize
    window.addEventListener('resize', this.boundHandlers.resize);

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  /**
   * Initialize with async project data
   */
  async init(): Promise<void> {
    const project = await projectView.getProject();
    if (project) {
      this.cameraRig.updateTarget(project.dimensions);
      this.slicePlaneVisualizer?.destroy();
      this.slicePlaneVisualizer = new SlicePlaneVisualizer(this.scene, project.dimensions);
    }
    await this.updateScene();
  }

  destroy(): void {
    // Unsubscribe from all events
    blockProjection.off('blocks:rebuilt', this.boundHandlers.tick);
    modelProjection.off('model:rebuilt', this.boundHandlers.tick);
    draftingService.off('draft:updated', this.boundHandlers.previewChanged);
    draftingService.off('draft:finalized', this.boundHandlers.previewChanged);
    draftingService.off('draft:cancelled', this.boundHandlers.previewChanged);
    editorState.off('preview:rendered', this.boundHandlers.previewChanged);
    editorState.off('layer:adjusted', this.boundHandlers.layerChanged);
    editorState.off('sliceguide:axis:toggled', this.boundHandlers.sliceGuideToggled);
    textureManager.off('atlas:loaded', this.boundHandlers.atlasLoaded);
    window.removeEventListener('resize', this.boundHandlers.resize);

    // Destroy modules
    this.slicePlaneVisualizer?.destroy();
    this.previewRenderer.destroy();
    this.blockRenderer.destroy();
    this.materialResolver.destroy();

    // Dispose engine/scene
    this.scene.dispose();
    this.engine.dispose();
  }

  // -- Public API (thin delegation) --

  setCameraView(view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'): void {
    this.cameraRig.setCameraView(view);
  }

  zoomCamera(delta: number): void {
    this.cameraRig.zoomCamera(delta);
  }

  resetCamera(): void {
    this.cameraRig.resetCamera();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.engine.resize();
  }

  // -- Private event handlers --

  private async updateScene(): Promise<void> {
    const project = await projectView.getProject();
    if (!project) {
      this.blockRenderer.clearAll();
      return;
    }

    const blocks = (await blockProjection.getBlocks()).toArray();
    const blockKeys = new Set(
      blocks.map((b: BlockData) => positionKey(b.position))
    );

    // Remove meshes no longer in project
    for (const key of this.blockRenderer.getBlockMeshes().keys()) {
      if (!blockKeys.has(key)) {
        const [x, y, z] = key.split(',').map(Number);
        this.blockRenderer.removeBlockMesh({ x, y, z }, false);
      }
    }

    // Add/update meshes
    for (const blockData of blocks) {
      this.blockRenderer.createBlockMesh(blockData, false);
    }

    // Update grid and slice planes
    updateGrid(this.scene);
    this.slicePlaneVisualizer?.updateDimensions(project.dimensions);

    // Focus camera on structure
    this.cameraRig.focusOnStructure(project.dimensions);

    // Update previews
    this.previewRenderer.updatePreviewMeshes();
  }

  private handlePreviewChanged(): void {
    this.previewRenderer.updatePreviewMeshes();
  }

  private async handleLayerChanged(): Promise<void> {
    const blocks = (await blockProjection.getBlocks()).toArray();
    this.blockRenderer.updateAllBrightness(blocks);
  }

  private handleAtlasLoaded(): void {
    this.materialResolver.clearAllCaches();
    this.blockRenderer.reapplyMaterials();
    this.previewRenderer.updatePreviewMeshes();
  }

  private handleSliceGuideToggled(axis: 'x' | 'y' | 'z', visible: boolean): void {
    this.slicePlaneVisualizer?.setAxisVisible(axis, visible);
  }

  private handleResize(): void {
    this.engine.resize();
  }

  private setupSlicePlanes(): void {
    const dimensions = { width: 10, height: 10, depth: 10 };
    this.slicePlaneVisualizer = new SlicePlaneVisualizer(this.scene, dimensions);
  }
}
