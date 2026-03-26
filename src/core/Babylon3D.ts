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
 * - EnvironmentSetup: IBL environment texture for PBR
 * - ShadowSetup: Shadow generator and ground plane
 * - PostProcessingSetup: SSAO, bloom, and tone mapping
 *
 * COORDINATE SYSTEM:
 * Our system: Z-up, right-handed (X=width, Y=depth, Z=height)
 * BabylonJS: Y-up, left-handed (see toBabylonVector in babylonUtils)
 */

import {
  Engine,
  Scene,
  Color3,
  Mesh,
} from '@babylonjs/core';
import { projectView } from '../projections/ProjectView';
import { blockProjection } from '../projections/BlockProjection';
import { modelProjection } from '../projections/ModelProjection';
import { draftingService } from './DraftingService';
import { textureManager } from './TextureManager';
import { editorState } from './EditorState';
import { renderLoop } from './RenderLoop';
import { SlicePlaneVisualizer } from './rendering/SlicePlaneVisualizer';
import { setupLighting, setupAxes } from './rendering/SceneSetup';
import { setupEnvironment, updateEnvironmentIntensity } from './rendering/EnvironmentSetup';
import { setupShadows, registerShadowCaster, unregisterShadowCaster, disposeShadows, refreshShadowMap } from './rendering/ShadowSetup';
import { setupPostProcessing, updatePostProcessing, disposePostProcessing } from './rendering/PostProcessingSetup';
import { MaterialResolver } from './rendering/MaterialResolver';
import { CameraRig } from './rendering/CameraRig';
import { BlockRenderer } from './rendering/BlockRenderer';
import { PreviewRenderer } from './rendering/PreviewRenderer';
import { positionKey } from './rendering/babylonUtils';

import type { BlockData, RenderSettings } from '../types';
import type { ShadowSystem } from './rendering/ShadowSetup';
import type { PostProcessingPipelines } from './rendering/PostProcessingSetup';

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

  // Rendering enhancement systems
  private shadowSystem: ShadowSystem | null = null;
  private postProcessing: PostProcessingPipelines | null = null;
  private renderSettings: RenderSettings | null = null;
  private paused = false;

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    tick: this.updateScene.bind(this),
    renderFrame: this.renderFrame.bind(this),
    previewChanged: this.handlePreviewChanged.bind(this),
    layerChanged: this.handleLayerChanged.bind(this),
    resize: this.handleResize.bind(this),
    atlasLoaded: this.handleAtlasLoaded.bind(this),
    sliceGuideToggled: this.handleSliceGuideToggled.bind(this),
    renderSettingsApplied: this.handleRenderSettingsApplied.bind(this),
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create BabylonJS engine and scene
    // adaptToDeviceRatio (4th param) scales the canvas buffer to match
    // physical pixels on HiDPI/Retina displays, preventing blur
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    }, true);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color3(0.1, 0.1, 0.1).toColor4();

    // Instantiate modules (dependency injection)
    this.cameraRig = new CameraRig(this.scene, canvas);
    this.materialResolver = new MaterialResolver(this.scene);
    this.blockRenderer = new BlockRenderer(this.scene, this.materialResolver);
    this.previewRenderer = new PreviewRenderer(this.scene, this.materialResolver);

    // Stateless scene setup
    setupLighting(this.scene);
    setupAxes(this.scene);
    this.setupSlicePlanes();

    // Initialize rendering enhancements (async, non-blocking)
    void this.initRenderingEnhancements();

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
    editorState.on('rendersettings:applied', this.boundHandlers.renderSettingsApplied);

    // Subscribe to texture atlas loading
    textureManager.on('atlas:loaded', this.boundHandlers.atlasLoaded);

    // Handle window resize
    window.addEventListener('resize', this.boundHandlers.resize);

    // Join the shared render loop (same rAF as 2D canvases — no contention)
    renderLoop.register();
    renderLoop.on('tick', this.boundHandlers.renderFrame);
  }

  private renderFrame(): void {
    if (!this.paused) {
      this.scene.render();
    }
  }

  /**
   * Initialize rendering enhancements: environment, PBR, shadows, post-processing, edges
   */
  private async initRenderingEnhancements(): Promise<void> {
    const settings = editorState.getRenderSettings();
    this.renderSettings = settings;

    // Environment texture (must come first for PBR)
    setupEnvironment(this.scene, settings.environmentIntensity);

    // PBR materials
    this.materialResolver.setPBREnabled(settings.pbrEnabled);

    // Shadow system with mesh lifecycle callbacks
    this.shadowSystem = setupShadows(this.scene, settings);
    const handleMeshCreated = (mesh: Mesh) => registerShadowCaster(this.shadowSystem, mesh);
    const handleMeshDestroyed = (mesh: Mesh) => unregisterShadowCaster(this.shadowSystem, mesh);
    this.blockRenderer.setMeshLifecycleCallbacks(handleMeshCreated, handleMeshDestroyed);

    // Layer highlight + edge rendering
    this.blockRenderer.setLayerHighlightEnabled(settings.layerHighlightEnabled);
    this.blockRenderer.updateEdgeRendering(settings);

    // Post-processing (needs camera)
    const camera = this.cameraRig.getCamera();
    this.postProcessing = setupPostProcessing(this.scene, camera, settings);
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
    editorState.off('rendersettings:applied', this.boundHandlers.renderSettingsApplied);
    textureManager.off('atlas:loaded', this.boundHandlers.atlasLoaded);
    window.removeEventListener('resize', this.boundHandlers.resize);
    renderLoop.off('tick', this.boundHandlers.renderFrame);
    renderLoop.unregister();

    // Destroy rendering enhancements
    disposePostProcessing(this.postProcessing);
    disposeShadows(this.shadowSystem);

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
    // Set CSS size; engine.resize() scales the buffer by devicePixelRatio
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.engine.resize();
  }

  /**
   * Pause the render loop (when 3D view is not visible).
   * Frees GPU resources for 2D rendering.
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume the render loop (when 3D view becomes visible).
   */
  resume(): void {
    if (this.paused) {
      this.paused = false;
      // Refresh shadow map and re-render since scene may have changed while paused
      refreshShadowMap(this.shadowSystem);
  
    }
  }

  isPaused(): boolean {
    return this.paused;
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

    // Update slice planes
    this.slicePlaneVisualizer?.updateDimensions(project.dimensions);

    // Focus camera on structure
    this.cameraRig.focusOnStructure(project.dimensions);

    // Update previews
    this.previewRenderer.updatePreviewMeshes();

    // Refresh shadow map (renders once, not every frame)
    refreshShadowMap(this.shadowSystem);

  }

  private handlePreviewChanged(): void {
    this.previewRenderer.updatePreviewMeshes();

  }

  private async handleLayerChanged(): Promise<void> {
    if (!this.renderSettings?.layerHighlightEnabled) return;
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

  private handleRenderSettingsApplied(settings: RenderSettings): void {
    const prev = this.renderSettings;
    this.renderSettings = settings;

    // Environment intensity (in-place update)
    updateEnvironmentIntensity(this.scene, settings.environmentIntensity);

    // PBR toggle
    if (!prev || prev.pbrEnabled !== settings.pbrEnabled) {
      this.materialResolver.setPBREnabled(settings.pbrEnabled);
      this.blockRenderer.reapplyMaterials();
    }

    // Shadows (recreate if toggled or map size changed)
    if (!prev ||
        prev.shadowsEnabled !== settings.shadowsEnabled ||
        prev.shadowMapSize !== settings.shadowMapSize) {
      disposeShadows(this.shadowSystem);
      this.shadowSystem = setupShadows(this.scene, settings);
      // Re-register all existing block meshes as shadow casters
      this.reregisterAllShadowCasters();
    } else if (this.shadowSystem && prev) {
      // Update shadow params in-place
      this.shadowSystem.generator.darkness = settings.shadowDarkness;
    }

    // Layer highlight toggle
    if (!prev || prev.layerHighlightEnabled !== settings.layerHighlightEnabled) {
      this.blockRenderer.setLayerHighlightEnabled(settings.layerHighlightEnabled);
      if (settings.layerHighlightEnabled) {
        void this.handleLayerChanged();
      } else {
        this.blockRenderer.reapplyMaterials();
      }
    }

    // Edge rendering
    this.blockRenderer.updateEdgeRendering(settings);

    // Post-processing (dispose and recreate)
    const camera = this.cameraRig.getCamera();
    this.postProcessing = updatePostProcessing(
      this.postProcessing, this.scene, camera, settings
    );


  }

  private reregisterAllShadowCasters(): void {
    for (const mesh of this.blockRenderer.getBlockMeshes().values()) {
      registerShadowCaster(this.shadowSystem, mesh);
    }
  }

  private handleResize(): void {
    this.engine.resize();

  }

  private setupSlicePlanes(): void {
    const dimensions = { width: 10, height: 10, depth: 10 };
    this.slicePlaneVisualizer = new SlicePlaneVisualizer(this.scene, dimensions);
  }
}
