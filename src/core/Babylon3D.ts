/**
 * Babylon3D - Singleton orchestrator for 3D rendering
 *
 * Coordinates composable BabylonJS modules:
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
 * Lifecycle:
 *   attach(canvas) — idempotent, creates engine/scene/modules
 *   detach()       — tears down engine/scene/modules
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
import type { AbstractMesh } from '@babylonjs/core';
import { projectView } from '../projections/ProjectView';
import { blockProjection } from '../projections/BlockProjection';
import { modelProjection } from '../projections/ModelProjection';
import { draftingService } from './DraftingService';
import { textureResolver } from './TextureResolver';
import { editorState } from './EditorState';
import { renderLoop } from './RenderLoop';
import { SlicePlaneVisualizer } from './rendering/SlicePlaneVisualizer';
import { setupLighting, setupAxes } from './rendering/SceneSetup';
import { loadEnvironment, applyEnvironment, updateEnvironmentIntensity } from './rendering/EnvironmentSetup';
import { setupShadows, registerShadowCaster, unregisterShadowCaster, disposeShadows, refreshShadowMap } from './rendering/ShadowSetup';
import { setupPostProcessing, updatePostProcessing, disposePostProcessing } from './rendering/PostProcessingSetup';
import { applyLightingPreset, getEmissiveScale, getEmissiveLightIntensity } from './rendering/LightingPresets';
import { EmissiveLighting } from './rendering/EmissiveLighting';
import { MaterialResolver } from './rendering/MaterialResolver';
import { CameraRig } from './rendering/CameraRig';
import { CameraGestures } from './rendering/CameraGestures';
import { BlockRenderer } from './rendering/BlockRenderer';
import { PreviewRenderer } from './rendering/PreviewRenderer';
import { BackdropRenderer } from './rendering/BackdropRenderer';
import { positionKey, toBabylonVector } from './rendering/babylonUtils';
import { shapeCatalog } from './shapes/ShapeCatalog';

import type { BlockData, LightingPreset, Project, RenderSettings } from '../types';
import type { CameraView } from './rendering/CameraRig';
import type { ShadowSystem } from './rendering/ShadowSetup';
import type { PostProcessingPipelines } from './rendering/PostProcessingSetup';

class Babylon3D {
  private static instance: Babylon3D;

  // Canvas and engine (null when detached)
  private canvas: HTMLCanvasElement | null = null;
  private engine: Engine | null = null;
  private scene: Scene | null = null;

  // Composable modules (null when detached)
  private cameraRig: CameraRig | null = null;
  private cameraGestures: CameraGestures | null = null;
  private materialResolver: MaterialResolver | null = null;
  private blockRenderer: BlockRenderer | null = null;
  private previewRenderer: PreviewRenderer | null = null;
  private backdropRenderer: BackdropRenderer | null = null;
  private slicePlaneVisualizer: SlicePlaneVisualizer | null = null;

  // Rendering enhancement systems
  private shadowSystem: ShadowSystem | null = null;
  private emissiveLighting: EmissiveLighting | null = null;
  private postProcessing: PostProcessingPipelines | null = null;
  private renderSettings: RenderSettings | null = null;

  // State
  private paused = false;
  private enhancementsReady = false;
  private sceneUpdateQueued = false;
  // Project and dimensions the camera last framed. The camera re-frames only when this changes,
  // so block edits never undo the user's orbit, pan, or zoom.
  private framedKey: string | null = null;

  // Resize observer (watches canvas size changes directly)
  private resizeObserver: ResizeObserver | null = null;

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    queueSceneUpdate: this.queueSceneUpdate.bind(this),
    renderFrame: this.renderFrame.bind(this),
    previewChanged: this.handlePreviewChanged.bind(this),
    layerChanged: this.handleLayerChanged.bind(this),
    atlasLoaded: this.handleAtlasLoaded.bind(this),
    sliceGuideToggled: this.handleSliceGuideToggled.bind(this),
    renderSettingsApplied: this.handleRenderSettingsApplied.bind(this),
  };

  private constructor() {}

  static getInstance(): Babylon3D {
    if (!Babylon3D.instance) {
      Babylon3D.instance = new Babylon3D();
    }
    return Babylon3D.instance;
  }

  // -- Lifecycle --

  /**
   * Attach to a canvas element. Idempotent — calling with the same canvas
   * is a no-op. Calling with a different canvas detaches from the previous one.
   */
  attach(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) return;
    if (this.canvas) this.detach();

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
    this.cameraGestures = new CameraGestures(canvas, this.cameraRig);
    this.materialResolver = new MaterialResolver(this.scene);
    this.blockRenderer = new BlockRenderer(this.scene, this.materialResolver);
    this.previewRenderer = new PreviewRenderer(this.scene, this.materialResolver);
    this.backdropRenderer = new BackdropRenderer(this.scene);

    // Stateless scene setup
    setupLighting(this.scene);
    setupAxes(this.scene);
    this.setupSlicePlanes();

    // Don't render until enhancements (environment texture, post-processing) are ready
    this.enhancementsReady = false;
    void this.initRenderingEnhancements();

    // Subscribe to singleton events
    this.subscribeToEvents();

    // Observe canvas size (replaces React resize effects)
    this.resizeObserver = new ResizeObserver(this.handleResizeObserved.bind(this));
    this.resizeObserver.observe(canvas);

    // Join the shared render loop
    renderLoop.register();
    renderLoop.on('tick', this.boundHandlers.renderFrame);

    // Initialize with async project data
    void this.initProjectData();
  }

  /**
   * Detach from the current canvas. Tears down engine, scene, and modules.
   * Safe to call when already detached (no-op).
   */
  detach(): void {
    if (!this.canvas) return;

    // Leave render loop
    renderLoop.off('tick', this.boundHandlers.renderFrame);
    renderLoop.unregister();

    // Stop observing resize
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Unsubscribe from singleton events
    this.unsubscribeFromEvents();

    // Destroy rendering enhancements
    disposePostProcessing(this.postProcessing);
    this.postProcessing = null;
    this.emissiveLighting?.dispose();
    this.emissiveLighting = null;
    disposeShadows(this.shadowSystem);
    this.shadowSystem = null;

    // Destroy modules
    this.slicePlaneVisualizer?.destroy();
    this.slicePlaneVisualizer = null;
    this.previewRenderer?.destroy();
    this.previewRenderer = null;
    this.backdropRenderer?.destroy();
    this.backdropRenderer = null;
    this.blockRenderer?.destroy();
    this.blockRenderer = null;
    this.materialResolver?.destroy();
    this.materialResolver = null;
    this.cameraGestures?.destroy();
    this.cameraGestures = null;
    this.cameraRig?.destroy();
    this.cameraRig = null;
    this.framedKey = null;

    // Dispose engine/scene
    this.scene?.dispose();
    this.scene = null;
    this.engine?.dispose();
    this.engine = null;

    this.canvas = null;
    this.renderSettings = null;
    this.enhancementsReady = false;
    this.paused = false;
    this.sceneUpdateQueued = false;
  }

  // -- Public API --

  setCameraView(view: CameraView): void {
    this.cameraRig?.setCameraView(view);
  }

  zoomCamera(delta: number): void {
    this.cameraRig?.zoomCamera(delta);
  }

  /**
   * Zoom and pan so the placed blocks fill the view. With no blocks, frames the build area.
   */
  fitToModel(): void {
    if (!this.cameraRig) return;
    const blocks = blockProjection.getCached();
    if (blocks.size === 0) {
      this.cameraRig.frameLastStructure();
      return;
    }

    // Each block fills the unit cell from its position to position + 1
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    const extendBounds = ({ position }: BlockData): void => {
      min.x = Math.min(min.x, position.x);
      min.y = Math.min(min.y, position.y);
      min.z = Math.min(min.z, position.z);
      max.x = Math.max(max.x, position.x + 1);
      max.y = Math.max(max.y, position.y + 1);
      max.z = Math.max(max.z, position.z + 1);
    };
    blocks.forEach(extendBounds);

    this.cameraRig.fitBounds(toBabylonVector(min), toBabylonVector(max));
  }

  resetCamera(): void {
    this.cameraRig?.resetCamera();
  }

  /**
   * Stable React ref callback for the preview canvas. React 18 calls it with the element
   * on mount and with null on unmount, because its identity never changes.
   * Unmounting pauses rendering but keeps the scene, so remounting the same canvas is instant.
   */
  readonly mountCanvas = (canvas: HTMLCanvasElement | null): void => {
    if (canvas) {
      this.attach(canvas);
      this.setVisible(true);
    } else {
      this.setVisible(false);
    }
  };

  /**
   * Pause or resume the render loop. Idempotent.
   */
  setVisible(visible: boolean): void {
    if (visible && this.paused) {
      this.paused = false;
      refreshShadowMap(this.shadowSystem);
    } else if (!visible) {
      this.paused = true;
    }
  }

  isAttached(): boolean {
    return this.canvas !== null;
  }

  // -- Private: initialization --

  private async initRenderingEnhancements(): Promise<void> {
    if (!this.scene || !this.cameraRig || !this.materialResolver ||
        !this.blockRenderer) return;

    const settings = editorState.getRenderSettings();
    this.renderSettings = settings;

    // Environment texture (must complete before post-processing setup)
    await this.loadPresetEnvironment(settings.lightingPreset);

    // Guard: detach may have been called while awaiting
    if (!this.scene || !this.cameraRig || !this.materialResolver || !this.blockRenderer) return;

    this.backdropRenderer?.setMode(settings.backgroundMode);

    // Lighting preset (adjusts lights, clear color, environment intensity)
    applyLightingPreset(this.scene, settings.lightingPreset);

    // PBR materials with preset-driven emissive scale
    this.materialResolver.setEmissiveScale(getEmissiveScale(settings.lightingPreset));
    this.materialResolver.setPBREnabled(settings.pbrEnabled);
    // Both setters dispose cached materials. updateScene does not wait for the environment,
    // so block meshes may already hold those materials, and a mesh with a disposed material renders white.
    this.blockRenderer.reapplyMaterials();

    // Shadow system with mesh lifecycle callbacks
    this.shadowSystem = setupShadows(this.scene, settings);
    const handleMeshCreated = (mesh: AbstractMesh): void => { registerShadowCaster(this.shadowSystem, mesh); };
    const handleMeshDestroyed = (mesh: AbstractMesh): void => { unregisterShadowCaster(this.shadowSystem, mesh); };
    this.blockRenderer.setMeshLifecycleCallbacks(handleMeshCreated, handleMeshDestroyed);

    // Emissive point lights for luminous blocks
    this.emissiveLighting = new EmissiveLighting(
      this.scene,
      getEmissiveLightIntensity(settings.lightingPreset),
    );

    // Layer highlight + edge rendering
    this.blockRenderer.setLayerHighlightEnabled(settings.layerHighlightEnabled);
    this.blockRenderer.updateEdgeRendering(settings);

    // Post-processing (needs camera)
    const camera = this.cameraRig.getCamera();
    this.postProcessing = setupPostProcessing(this.scene, camera, settings);

    // All enhancements ready — safe to start rendering
    this.enhancementsReady = true;
  }

  private async initProjectData(): Promise<void> {
    if (!this.scene || !this.cameraRig) return;

    const project = await projectView.getProject();

    // Guard: detach may have been called while awaiting
    if (!this.scene || !this.cameraRig) return;

    if (project) {
      this.slicePlaneVisualizer?.destroy();
      this.slicePlaneVisualizer = new SlicePlaneVisualizer(this.scene, project.dimensions);
    }
    await this.updateScene();
  }

  // -- Private: event subscription --

  private subscribeToEvents(): void {
    blockProjection.on('blocks:rebuilt', this.boundHandlers.queueSceneUpdate);
    modelProjection.on('model:rebuilt', this.boundHandlers.queueSceneUpdate);

    draftingService.on('draft:updated', this.boundHandlers.previewChanged);
    draftingService.on('draft:finalized', this.boundHandlers.previewChanged);
    draftingService.on('draft:cancelled', this.boundHandlers.previewChanged);
    editorState.on('preview:rendered', this.boundHandlers.previewChanged);

    editorState.on('layer:adjusted', this.boundHandlers.layerChanged);
    editorState.on('sliceguide:axis:toggled', this.boundHandlers.sliceGuideToggled);
    editorState.on('rendersettings:applied', this.boundHandlers.renderSettingsApplied);

    textureResolver.on('atlas:ready', this.boundHandlers.atlasLoaded);
  }

  private unsubscribeFromEvents(): void {
    blockProjection.off('blocks:rebuilt', this.boundHandlers.queueSceneUpdate);
    modelProjection.off('model:rebuilt', this.boundHandlers.queueSceneUpdate);

    draftingService.off('draft:updated', this.boundHandlers.previewChanged);
    draftingService.off('draft:finalized', this.boundHandlers.previewChanged);
    draftingService.off('draft:cancelled', this.boundHandlers.previewChanged);
    editorState.off('preview:rendered', this.boundHandlers.previewChanged);

    editorState.off('layer:adjusted', this.boundHandlers.layerChanged);
    editorState.off('sliceguide:axis:toggled', this.boundHandlers.sliceGuideToggled);
    editorState.off('rendersettings:applied', this.boundHandlers.renderSettingsApplied);

    textureResolver.off('atlas:ready', this.boundHandlers.atlasLoaded);
  }

  // -- Private: render loop --

  private renderFrame(): void {
    if (!this.paused && this.enhancementsReady) {
      this.scene?.render();
    }
  }

  // -- Private: event handlers --

  private queueSceneUpdate(): void {
    if (this.sceneUpdateQueued) return;
    this.sceneUpdateQueued = true;
    queueMicrotask(() => {
      this.sceneUpdateQueued = false;
      void this.updateScene();
    });
  }

  private async updateScene(): Promise<void> {
    if (!this.blockRenderer || !this.cameraRig) return;

    // Atlas must be ready before creating any block meshes — otherwise
    // MaterialResolver falls back to colorless materials that get cached
    // in BlockRenderer's instanceTypeMap, blocking future updates
    await textureResolver.waitForAtlas();
    if (!this.blockRenderer || !this.cameraRig) return;

    const project = await projectView.getProject();
    if (!project) {
      this.blockRenderer.clearAll();
      this.emissiveLighting?.clearAll();
      return;
    }

    // Guard: detach may have been called while awaiting
    if (!this.blockRenderer || !this.cameraRig) return;

    const blockIndex = await blockProjection.getBlocks();
    const blocks = blockIndex.toArray();
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

    // Add/update meshes — resolve derived state reactively
    for (const blockData of blocks) {
      const resolved = shapeCatalog.resolveBlockState(blockData.position, blockIndex) ?? blockData;
      this.blockRenderer.createBlockMesh(resolved, false);
    }

    // Update slice planes
    this.slicePlaneVisualizer?.updateDimensions(project.dimensions);

    this.frameIfProjectChanged(project);

    // Sync emissive point lights for luminous blocks
    this.emissiveLighting?.syncLights(blocks);

    // Update previews
    this.previewRenderer?.updatePreviewMeshes();

    // Refresh shadow map (renders once, not every frame)
    refreshShadowMap(this.shadowSystem);
  }

  /**
   * Load the preset's environment, then apply it only if that preset is still selected.
   * A slower load for an earlier preset must not replace a newer one.
   */
  private async loadPresetEnvironment(preset: LightingPreset): Promise<void> {
    const scene = this.scene;
    if (!scene) return;

    const texture = await loadEnvironment(scene, preset);
    const isStale = this.scene !== scene || this.renderSettings?.lightingPreset !== preset;
    if (isStale || !texture || !this.renderSettings) {
      texture?.dispose();
      return;
    }

    applyEnvironment(scene, texture, this.renderSettings.environmentIntensity);
    this.backdropRenderer?.setTexture(texture);
  }

  /**
   * Frame the structure on first load, on a project switch, and on a dimension change.
   * The first framing is instant. Later ones animate from wherever the user left the camera.
   */
  private frameIfProjectChanged(project: Project): void {
    if (!this.cameraRig) return;
    const { width, height, depth } = project.dimensions;
    const key = `${project.id}:${width}x${height}x${depth}`;
    if (key === this.framedKey) return;

    const isFirstFrame = this.framedKey === null;
    this.framedKey = key;
    this.cameraRig.frameStructure(project.dimensions, !isFirstFrame);
  }

  private handlePreviewChanged(): void {
    this.previewRenderer?.updatePreviewMeshes();
  }

  private async handleLayerChanged(): Promise<void> {
    if (!this.renderSettings?.layerHighlightEnabled || !this.blockRenderer) return;
    const blocks = (await blockProjection.getBlocks()).toArray();
    this.blockRenderer.updateAllBrightness(blocks);
  }

  private handleAtlasLoaded(): void {
    if (!this.materialResolver || !this.blockRenderer) return;
    this.materialResolver.clearAllCaches();
    // Base meshes have faceUV baked into geometry — must rebuild, not just reapply materials
    this.blockRenderer.clearAll();
    this.queueSceneUpdate();
    this.previewRenderer?.updatePreviewMeshes();
  }

  private handleSliceGuideToggled(axis: 'x' | 'y' | 'z', visible: boolean): void {
    this.slicePlaneVisualizer?.setAxisVisible(axis, visible);
  }

  private handleRenderSettingsApplied(settings: RenderSettings): void {
    if (!this.scene || !this.materialResolver || !this.blockRenderer || !this.cameraRig) return;

    const prev = this.renderSettings;
    this.renderSettings = settings;

    // Lighting preset
    if (!prev || prev.lightingPreset !== settings.lightingPreset) {
      void this.loadPresetEnvironment(settings.lightingPreset);
      applyLightingPreset(this.scene, settings.lightingPreset);
      this.materialResolver.setEmissiveScale(getEmissiveScale(settings.lightingPreset));
      this.blockRenderer.reapplyMaterials();
      this.emissiveLighting?.setIntensity(getEmissiveLightIntensity(settings.lightingPreset));
    }

    // Environment intensity
    updateEnvironmentIntensity(this.scene, settings.environmentIntensity);

    // Background
    if (!prev || prev.backgroundMode !== settings.backgroundMode) {
      this.backdropRenderer?.setMode(settings.backgroundMode);
    }

    // PBR toggle
    if (!prev || prev.pbrEnabled !== settings.pbrEnabled) {
      this.materialResolver.setPBREnabled(settings.pbrEnabled);
      this.blockRenderer.reapplyMaterials();
    }

    // Shadows
    if (!prev ||
        prev.shadowsEnabled !== settings.shadowsEnabled ||
        prev.shadowMapSize !== settings.shadowMapSize) {
      disposeShadows(this.shadowSystem);
      this.shadowSystem = setupShadows(this.scene, settings);
      this.reregisterAllShadowCasters();
    } else if (this.shadowSystem && prev) {
      this.shadowSystem.generator.darkness = settings.shadowDarkness;
    }

    // Layer highlight
    if (!prev || prev.layerHighlightEnabled !== settings.layerHighlightEnabled) {
      this.blockRenderer.setLayerHighlightEnabled(settings.layerHighlightEnabled);
      if (settings.layerHighlightEnabled) {
        void this.handleLayerChanged();
      }
    }

    // Edge rendering
    this.blockRenderer.updateEdgeRendering(settings);

    // Post-processing
    const camera = this.cameraRig.getCamera();
    this.postProcessing = updatePostProcessing(
      this.postProcessing, this.scene, camera, settings
    );
  }

  private reregisterAllShadowCasters(): void {
    if (!this.blockRenderer) return;
    for (const mesh of this.blockRenderer.getBlockMeshes().values()) {
      registerShadowCaster(this.shadowSystem, mesh);
    }
  }

  private handleResizeObserved(entries: ResizeObserverEntry[]): void {
    if (!this.engine || !entries[0]) return;
    this.engine.resize();
  }

  private setupSlicePlanes(): void {
    if (!this.scene) return;
    const dimensions = { width: 10, height: 10, depth: 10 };
    this.slicePlaneVisualizer = new SlicePlaneVisualizer(this.scene, dimensions);
  }
}

export const babylon3d = Babylon3D.getInstance();
