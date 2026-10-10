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
  Vector3,
} from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import { projectView } from '../projections/ProjectView';
import { blockProjection } from '../projections/BlockProjection';
import { modelProjection } from '../projections/ModelProjection';
import { draftingService } from './DraftingService';
import { textureResolver } from './TextureResolver';
import { editorState } from './EditorState';
import { renderLoop } from './RenderLoop';
import { frameStats } from './FrameStats';
import { SlicePlaneVisualizer } from './rendering/SlicePlaneVisualizer';
import { setupLighting, setupAxes } from './rendering/SceneSetup';
import { loadEnvironment, applyEnvironment, updateEnvironmentIntensity } from './rendering/EnvironmentSetup';
import { setupShadows, registerShadowCaster, unregisterShadowCasters, disposeShadows, refreshShadowMap } from './rendering/ShadowSetup';
import { updatePostProcessing, disposePostProcessing } from './rendering/PostProcessingSetup';
import { applyLightingPreset, getEmissiveScale, getEmissiveLightIntensity } from './rendering/LightingPresets';
import { EmissiveLighting } from './rendering/EmissiveLighting';
import { MaterialResolver } from './rendering/MaterialResolver';
import { CameraRig } from './rendering/CameraRig';
import { CameraGestures } from './rendering/CameraGestures';
import { BlockRenderer } from './rendering/BlockRenderer';
import { staggerTiming } from './rendering/GrowAnimator';
import { ThumbnailCapture, type Bounds } from './rendering/ThumbnailCapture';
import { thumbnailStore } from './ThumbnailStore';
import { PreviewRenderer } from './rendering/PreviewRenderer';
import { BackdropRenderer } from './rendering/BackdropRenderer';
import { positionKey, toBabylonVector } from './rendering/babylonUtils';
import { shapeCatalog } from './shapes/ShapeCatalog';

import type { BlockData, LightingPreset, Project, RenderSettings } from '../types';
import type { CameraView } from './rendering/CameraRig';
import type { ShadowSystem } from './rendering/ShadowSetup';
import type { PostProcessingPipelines } from './rendering/PostProcessingSetup';

// Longer than the grow and shrink sequence, so the thumbnail shows blocks at full size
const THUMBNAIL_DELAY_MS = 1000;

const toShownKey = ({ id, dimensions: { width, height, depth } }: Project): string =>
  `${id}:${width}x${height}x${depth}`;

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
  private lastCameraPose: { alpha: number; beta: number; radius: number; target: Vector3 } | null = null;
  // Project and dimensions the camera last framed. The camera re-frames only when this changes,
  // so block edits never undo the user's orbit, pan, or zoom.
  private framedKey: string | null = null;
  // Project and size the meshes on screen show. Blocks animate only while this stays the same.
  private shownKey: string | null = null;
  private thumbnailCapture: ThumbnailCapture | null = null;
  // Project whose scene changed since its last thumbnail. Null when the stored thumbnail is current.
  private thumbnailProjectId: string | null = null;
  private thumbnailTimer: ReturnType<typeof setTimeout> | null = null;
  // Meshes to drop from the shadow render list in one pass. flushShadowCasters empties it.
  private removedShadowCasters = new Set<AbstractMesh>();

  // Resize observer (watches canvas size changes directly)
  private resizeObserver: ResizeObserver | null = null;

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    queueSceneUpdate: this.queueSceneUpdate.bind(this),
    animationSettled: this.handleAnimationSettled.bind(this),
    projectSwitched: this.handleProjectSwitched.bind(this),
    thumbnailDue: this.flushThumbnail.bind(this),
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
    this.thumbnailCapture = new ThumbnailCapture(this.scene);
    // Shadows draw once per update. Redraw them when growing and shrinking blocks reach their final size.
    this.blockRenderer.setAnimationSettledCallback(this.boundHandlers.animationSettled);
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

    // Leaving the editor unmounts the view, so a pending thumbnail is captured now or never
    this.flushThumbnail();
    this.thumbnailCapture = null;

    // Leave render loop
    renderLoop.off('tick', this.boundHandlers.renderFrame);
    renderLoop.unregister();

    // Stop observing resize
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Unsubscribe from singleton events
    this.unsubscribeFromEvents();

    // Destroy rendering enhancements
    if (this.scene) disposePostProcessing(this.postProcessing, this.scene);
    this.postProcessing = null;
    this.emissiveLighting?.dispose();
    this.emissiveLighting = null;
    disposeShadows(this.shadowSystem);
    this.shadowSystem = null;
    this.removedShadowCasters.clear();

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
    this.shownKey = null;

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
      this.refreshShadows();
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

    this.renderSettings = editorState.getRenderSettings();

    // Environment texture (must complete before post-processing setup).
    // Settings that arrive during the load only update renderSettings, so load again if the preset moved.
    let loadedPreset: LightingPreset;
    do {
      loadedPreset = this.renderSettings.lightingPreset;
      await this.loadPresetEnvironment(loadedPreset);
      if (!this.renderSettings) return;
    } while (this.renderSettings.lightingPreset !== loadedPreset);

    // Guard: detach may have been called while awaiting
    if (!this.scene || !this.cameraRig || !this.materialResolver || !this.blockRenderer) return;

    // The latest settings, including any that arrived while the environment loaded
    const settings = this.renderSettings;

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
    const handleMeshDestroyed = (mesh: AbstractMesh): void => { this.removedShadowCasters.add(mesh); };
    this.blockRenderer.setMeshLifecycleCallbacks(handleMeshCreated, handleMeshDestroyed);

    // Emissive point lights for luminous blocks
    this.emissiveLighting = new EmissiveLighting(
      this.scene,
      getEmissiveLightIntensity(settings.lightingPreset),
    );

    // Layer highlight
    this.blockRenderer.setLayerHighlightEnabled(settings.layerHighlightEnabled);

    // Post-processing (needs camera)
    const camera = this.cameraRig.getCamera();
    this.postProcessing = updatePostProcessing(this.postProcessing, this.scene, camera, settings);

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
    editorState.on('project:switched', this.boundHandlers.projectSwitched);
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
    editorState.off('project:switched', this.boundHandlers.projectSwitched);
    editorState.off('sliceguide:axis:toggled', this.boundHandlers.sliceGuideToggled);
    editorState.off('rendersettings:applied', this.boundHandlers.renderSettingsApplied);

    textureResolver.off('atlas:ready', this.boundHandlers.atlasLoaded);
  }

  // -- Private: render loop --

  private renderFrame(): void {
    if (this.paused || !this.enhancementsReady || !this.scene) return;

    const startMs = performance.now();
    this.scene.render();
    const renderMs = performance.now() - startMs;
    frameStats.recordFrame({
      startMs,
      renderMs,
      tickMs: renderLoop.getLastTickMs(),
      cameraStep: this.measureCameraStep(),
      bufferWidth: this.engine?.getRenderWidth() ?? 0,
      bufferHeight: this.engine?.getRenderHeight() ?? 0,
    });
  }

  /**
   * How far the camera moved since the last frame. Radius and pivot changes are divided
   * by the radius, so orbit, zoom, and pan steps share one unitless scale.
   */
  private measureCameraStep(): number {
    const camera = this.cameraRig?.getCamera();
    if (!camera) return 0;

    const previous = this.lastCameraPose;
    this.lastCameraPose = {
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.clone(),
    };
    if (!previous) return 0;

    return (
      Math.abs(camera.alpha - previous.alpha) +
      Math.abs(camera.beta - previous.beta) +
      Math.abs(camera.radius - previous.radius) / camera.radius +
      Vector3.Distance(camera.target, previous.target) / camera.radius
    );
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
      this.flushShadowCasters();
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

    // A project switch or a size change can move every block, so those updates show at once
    const shownKey = toShownKey(project);
    const animate = shownKey === this.shownKey;
    this.shownKey = shownKey;

    const isRemoved = (key: string): boolean => !blockKeys.has(key);
    const removedKeys = [...this.blockRenderer.getBlockMeshes().keys()].filter(isRemoved);
    const removeKey = (key: string, index: number): void => {
      const [x, y, z] = key.split(',').map(Number);
      const shrink = animate ? staggerTiming(index, removedKeys.length) : null;
      this.blockRenderer!.removeBlockMesh({ x, y, z }, shrink);
    };
    // Each dispose would otherwise free the scene's active-mesh lists once per block
    this.scene!.blockfreeActiveMeshesAndRenderingGroups = true;
    removedKeys.forEach(removeKey);
    this.scene!.blockfreeActiveMeshesAndRenderingGroups = false;

    // Resolve derived state reactively. Only a new block or a new block type grows in.
    // A derived shape change (a stair turning a corner) swaps at once.
    const resolveBlock = (blockData: BlockData): BlockData =>
      shapeCatalog.resolveBlockState(blockData.position, blockIndex) ?? blockData;
    const resolved = blocks.map(resolveBlock);
    const isNewType = (blockData: BlockData): boolean =>
      this.blockRenderer!.getBlockType(positionKey(blockData.position)) !== blockData.blockType;
    const added = new Set(resolved.filter(isNewType));

    // BlockIndex lists blocks in the order events placed them, so a stroke grows in stroke order
    let addedIndex = 0;
    for (const blockData of resolved) {
      const grow = animate && added.has(blockData) ? staggerTiming(addedIndex++, added.size) : null;
      this.blockRenderer.createBlockMesh(blockData, grow);
    }

    // Update slice planes
    this.slicePlaneVisualizer?.updateDimensions(project.dimensions);

    this.frameIfProjectChanged(project);

    // Sync emissive point lights for luminous blocks
    this.emissiveLighting?.syncLights(blocks);

    // Update previews
    this.previewRenderer?.updatePreviewMeshes();

    // Refresh shadow map (renders once, not every frame)
    this.refreshShadows();

    // A first load also counts, so a project saved before thumbnails existed gets one
    if (!animate || removedKeys.length > 0 || added.size > 0) {
      this.scheduleThumbnail(project.id);
    }
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
    const key = toShownKey(project);
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
    this.flushShadowCasters();
    this.queueSceneUpdate();
    this.previewRenderer?.updatePreviewMeshes();
  }

  private handleSliceGuideToggled(axis: 'x' | 'y' | 'z', visible: boolean): void {
    this.slicePlaneVisualizer?.setAxisVisible(axis, visible);
  }

  private handleRenderSettingsApplied(settings: RenderSettings): void {
    if (!this.scene || !this.materialResolver || !this.blockRenderer || !this.cameraRig) return;

    // Until initRenderingEnhancements finishes, it applies the latest settings itself.
    // Building pipelines here first would collide with the environment's RGBD decode.
    if (!this.enhancementsReady) {
      this.renderSettings = settings;
      return;
    }

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

    // Post-processing
    const camera = this.cameraRig.getCamera();
    this.postProcessing = updatePostProcessing(
      this.postProcessing, this.scene, camera, settings
    );
  }

  private flushShadowCasters(): void {
    unregisterShadowCasters(this.shadowSystem, this.removedShadowCasters);
    this.removedShadowCasters.clear();
  }

  /**
   * Drop removed casters, then draw the shadow map once
   */
  private refreshShadows(): void {
    this.flushShadowCasters();
    refreshShadowMap(this.shadowSystem);
  }

  private reregisterAllShadowCasters(): void {
    if (!this.blockRenderer) return;
    for (const mesh of this.blockRenderer.getBlockMeshes().values()) {
      registerShadowCaster(this.shadowSystem, mesh);
    }
  }

  /**
   * Capture a thumbnail once edits pause. The delay outlasts the grow and shrink sequence (SEQUENCE_MS).
   */
  private scheduleThumbnail(projectId: string): void {
    this.thumbnailProjectId = projectId;
    if (this.thumbnailTimer) clearTimeout(this.thumbnailTimer);
    this.thumbnailTimer = setTimeout(this.boundHandlers.thumbnailDue, THUMBNAIL_DELAY_MS);
  }

  private flushThumbnail(): void {
    if (this.thumbnailTimer) clearTimeout(this.thumbnailTimer);
    this.thumbnailTimer = null;

    const projectId = this.thumbnailProjectId;
    if (!projectId || !this.thumbnailCapture || !this.enhancementsReady) return;
    this.thumbnailProjectId = null;

    const dataUrl = this.thumbnailCapture.capture(this.blockBounds());
    if (dataUrl) void thumbnailStore.save(projectId, dataUrl);
  }

  // Bounds of the placed blocks in Babylon space, or of the build volume when there are none
  private blockBounds(): Bounds {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    const extend = ({ position }: BlockData): void => {
      min.minimizeInPlace(toBabylonVector(position));
      max.maximizeInPlace(toBabylonVector({ x: position.x + 1, y: position.y + 1, z: position.z + 1 }));
    };
    blockProjection.getCached().forEach(extend);
    if (min.x !== Infinity) return { min, max };

    const { width, height, depth } = modelProjection.getCached().dimensions;
    return { min: Vector3.Zero(), max: toBabylonVector({ x: width, y: height, z: depth }) };
  }

  // The scene still shows the previous project here: the projections reset after this notification
  private handleProjectSwitched(): void {
    this.flushThumbnail();
  }

  private handleAnimationSettled(): void {
    this.refreshShadows();
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
