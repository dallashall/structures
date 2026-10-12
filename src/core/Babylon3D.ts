/**
 * Babylon3D - Owns the 3D view's engine and scene, and wires the rendering modules in
 * src/core/rendering to the projections, DraftingService, and EditorState.
 *
 * attach(canvas) builds everything and detach() tears it all down, so the scene lives only while
 * the view is mounted. Rendering starts only after the environment texture and post-processing exist.
 *
 * The model is Z-up and right-handed. Babylon is Y-up and left-handed. toBabylonVector converts.
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
import { BuildPreview } from './rendering/BuildPreview';
import type { GlowColor } from './rendering/BuildPreview';
import type { AnimatedSequence } from '../utils/buildSequence';
import { toGlowTint } from '../utils/buildSequence';
import { cssColorToRgb } from '../utils/cssColor';
import { positionKey, toBabylonVector } from './rendering/babylonUtils';
import { shapeCatalog } from './shapes/ShapeCatalog';

import type { BlockData, LightingPreset, Project, RenderSettings } from '../types';
import type { CameraView } from './rendering/CameraRig';
import type { ShadowSystem } from './rendering/ShadowSetup';
import type { PostProcessingPipelines } from './rendering/PostProcessingSetup';

// Longer than the grow and shrink sequence, so the thumbnail shows blocks at full size
const THUMBNAIL_DELAY_MS = 1000;

// About two seconds at 60 fps
const PREVIEW_WAIT_FRAMES = 120;
const GLOW_FACE = 0;
const GLOW_FALLBACK: GlowColor = [0.8, 0.8, 0.8];

const nextFrame = (): Promise<void> => {
  const waitForFrame = (resolve: () => void): void => {
    requestAnimationFrame(resolve as FrameRequestCallback);
  };
  return new Promise(waitForFrame);
};

const toGlowColor = (mesh: AbstractMesh): GlowColor => {
  const blockType = (mesh.metadata as { blockType?: string } | null)?.blockType;
  const css = blockType ? textureResolver.getFaceColor(blockType, GLOW_FACE) : null;
  const rgb = css ? cssColorToRgb(css) : null;
  return rgb ? toGlowTint(rgb) : GLOW_FALLBACK;
};

const toShownKey = ({ id, dimensions: { width, height, depth } }: Project): string =>
  `${id}:${width}x${height}x${depth}`;

class Babylon3D {
  private static instance: Babylon3D;

  private canvas: HTMLCanvasElement | null = null;
  private engine: Engine | null = null;
  private scene: Scene | null = null;

  private cameraRig: CameraRig | null = null;
  private cameraGestures: CameraGestures | null = null;
  private materialResolver: MaterialResolver | null = null;
  private blockRenderer: BlockRenderer | null = null;
  private previewRenderer: PreviewRenderer | null = null;
  private backdropRenderer: BackdropRenderer | null = null;
  private slicePlaneVisualizer: SlicePlaneVisualizer | null = null;

  private shadowSystem: ShadowSystem | null = null;
  private emissiveLighting: EmissiveLighting | null = null;
  private postProcessing: PostProcessingPipelines | null = null;
  private renderSettings: RenderSettings | null = null;

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
  private buildPreview: BuildPreview | null = null;
  // Project whose scene changed since its last thumbnail. Null when the stored thumbnail is current.
  private thumbnailProjectId: string | null = null;
  private thumbnailTimer: ReturnType<typeof setTimeout> | null = null;
  // Meshes to drop from the shadow render list in one pass. flushShadowCasters empties it.
  private removedShadowCasters = new Set<AbstractMesh>();

  private resizeObserver: ResizeObserver | null = null;

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


  /**
   * A second call with the same canvas does nothing. A different canvas detaches the previous one first.
   */
  attach(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) return;
    if (this.canvas) this.detach();

    this.canvas = canvas;

    // The fourth argument (adaptToDeviceRatio) sizes the buffer in physical pixels, so HiDPI screens stay sharp.
    // preserveDrawingBuffer lets ThumbnailCapture read the canvas after a render.
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    }, true);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color3(0.1, 0.1, 0.1).toColor4();

    this.cameraRig = new CameraRig(this.scene, canvas);
    this.cameraGestures = new CameraGestures(canvas, this.cameraRig);
    this.materialResolver = new MaterialResolver(this.scene);
    this.blockRenderer = new BlockRenderer(this.scene, this.materialResolver);
    this.thumbnailCapture = new ThumbnailCapture(this.scene, this.cameraRig.getCamera());
    this.buildPreview = new BuildPreview(this.scene);
    // Shadows draw once per update. Redraw them when growing and shrinking blocks reach their final size.
    this.blockRenderer.setAnimationSettledCallback(this.boundHandlers.animationSettled);
    this.previewRenderer = new PreviewRenderer(this.scene, this.materialResolver);
    this.backdropRenderer = new BackdropRenderer(this.scene);

    setupLighting(this.scene);
    setupAxes(this.scene);
    this.setupSlicePlanes();

    this.enhancementsReady = false;
    void this.initRenderingEnhancements();

    this.subscribeToEvents();

    this.resizeObserver = new ResizeObserver(this.handleResizeObserved.bind(this));
    this.resizeObserver.observe(canvas);

    renderLoop.register();
    renderLoop.on('tick', this.boundHandlers.renderFrame);

    void this.initProjectData();
  }

  detach(): void {
    if (!this.canvas) return;

    // Leaving the editor unmounts the view, so a pending thumbnail is captured now or never
    this.flushThumbnail();
    this.thumbnailCapture = null;
    this.buildPreview?.dispose();
    this.buildPreview = null;

    renderLoop.off('tick', this.boundHandlers.renderFrame);
    renderLoop.unregister();

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.unsubscribeFromEvents();

    if (this.scene) disposePostProcessing(this.postProcessing, this.scene);
    this.postProcessing = null;
    this.emissiveLighting?.dispose();
    this.emissiveLighting = null;
    disposeShadows(this.shadowSystem);
    this.shadowSystem = null;
    this.removedShadowCasters.clear();

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


  /**
   * Plays the add-on's build animation over the current model. Resolves when it ends or stops.
   */
  async playBuildPreview(sequence: AnimatedSequence, seconds: number): Promise<void> {
    // Switching to the 3D tab remounts the view, and its block meshes return over the next frames
    const expected = blockProjection.getCached().size;
    for (let frame = 0; frame < PREVIEW_WAIT_FRAMES; frame++) {
      if (this.blockRenderer && this.blockRenderer.getBlockMeshes().size >= expected && !this.paused) break;
      await nextFrame();
    }
    if (!this.buildPreview || !this.blockRenderer) return;
    const { metaBlock } = modelProjection.getCached();
    await this.buildPreview.play(sequence, seconds, metaBlock, this.blockRenderer.getBlockMeshes(), toGlowColor);
  }

  stopBuildPreview(): void {
    this.buildPreview?.stop();
  }

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


  private async initRenderingEnhancements(): Promise<void> {
    if (!this.scene || !this.cameraRig || !this.materialResolver ||
        !this.blockRenderer) return;

    this.renderSettings = editorState.getRenderSettings();

    // The environment must load before post-processing is built.
    // Settings that arrive during the load only update renderSettings, so load again if the preset moved.
    let loadedPreset: LightingPreset;
    do {
      loadedPreset = this.renderSettings.lightingPreset;
      await this.loadPresetEnvironment(loadedPreset);
      if (!this.renderSettings) return;
    } while (this.renderSettings.lightingPreset !== loadedPreset);

    // detach may have run during the await
    if (!this.scene || !this.cameraRig || !this.materialResolver || !this.blockRenderer) return;

    const settings = this.renderSettings;

    this.backdropRenderer?.setMode(settings.backgroundMode);

    applyLightingPreset(this.scene, settings.lightingPreset);

    this.materialResolver.setEmissiveScale(getEmissiveScale(settings.lightingPreset));
    this.materialResolver.setPBREnabled(settings.pbrEnabled);
    // Both setters dispose cached materials. updateScene does not wait for the environment,
    // so block meshes may already hold those materials, and a mesh with a disposed material renders white.
    this.blockRenderer.reapplyMaterials();

    this.shadowSystem = setupShadows(this.scene, settings);
    const handleMeshCreated = (mesh: AbstractMesh): void => { registerShadowCaster(this.shadowSystem, mesh); };
    const handleMeshDestroyed = (mesh: AbstractMesh): void => { this.removedShadowCasters.add(mesh); };
    this.blockRenderer.setMeshLifecycleCallbacks(handleMeshCreated, handleMeshDestroyed);

    this.emissiveLighting = new EmissiveLighting(
      this.scene,
      getEmissiveLightIntensity(settings.lightingPreset),
    );

    this.blockRenderer.setLayerHighlightEnabled(settings.layerHighlightEnabled);

    const camera = this.cameraRig.getCamera();
    this.postProcessing = updatePostProcessing(this.postProcessing, this.scene, camera, settings);

    this.enhancementsReady = true;
  }

  private async initProjectData(): Promise<void> {
    if (!this.scene || !this.cameraRig) return;

    const project = await projectView.getProject();
    if (!this.scene || !this.cameraRig) return;

    if (project) {
      this.slicePlaneVisualizer?.destroy();
      this.slicePlaneVisualizer = new SlicePlaneVisualizer(this.scene, project.dimensions);
    }
    await this.updateScene();
  }


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


  private queueSceneUpdate(): void {
    if (this.sceneUpdateQueued) return;
    this.sceneUpdateQueued = true;
    const runSceneUpdate = (): void => {
      this.sceneUpdateQueued = false;
      void this.updateScene();
    };
    queueMicrotask(runSceneUpdate);
  }

  private async updateScene(): Promise<void> {
    if (!this.blockRenderer || !this.cameraRig) return;
    // An edit during a preview shows the real model at once
    this.buildPreview?.stop();

    // A mesh built before the atlas loads caches a colorless material in BlockRenderer's
    // instanceTypeMap, and later updates reuse that cache instead of the textured material.
    // Each await below can outlast a detach, hence the repeated guards.
    await textureResolver.waitForAtlas();
    if (!this.blockRenderer || !this.cameraRig) return;

    const project = await projectView.getProject();
    if (!project) {
      this.blockRenderer.clearAll();
      this.flushShadowCasters();
      this.emissiveLighting?.clearAll();
      return;
    }

    if (!this.blockRenderer || !this.cameraRig) return;

    const blockIndex = await blockProjection.getBlocks();
    const blocks = blockIndex.toArray();
    const toBlockKey = (block: BlockData): string => positionKey(block.position);
    const blockKeys = new Set(blocks.map(toBlockKey));

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

    // Only a new block or a new block type grows in.
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

    this.slicePlaneVisualizer?.updateDimensions(project.dimensions);

    this.frameIfProjectChanged(project);

    this.emissiveLighting?.syncLights(blocks);

    this.previewRenderer?.updatePreviewMeshes();

    // The shadow map renders once per update, not every frame
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
    // Base meshes bake faceUV into their geometry, so a new atlas needs new meshes, not new materials
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

    if (!prev || prev.lightingPreset !== settings.lightingPreset) {
      void this.loadPresetEnvironment(settings.lightingPreset);
      applyLightingPreset(this.scene, settings.lightingPreset);
      this.materialResolver.setEmissiveScale(getEmissiveScale(settings.lightingPreset));
      this.blockRenderer.reapplyMaterials();
      this.emissiveLighting?.setIntensity(getEmissiveLightIntensity(settings.lightingPreset));
    }

    updateEnvironmentIntensity(this.scene, settings.environmentIntensity);

    if (!prev || prev.backgroundMode !== settings.backgroundMode) {
      this.backdropRenderer?.setMode(settings.backgroundMode);
    }

    if (!prev || prev.pbrEnabled !== settings.pbrEnabled) {
      this.materialResolver.setPBREnabled(settings.pbrEnabled);
      this.blockRenderer.reapplyMaterials();
    }

    if (!prev ||
        prev.shadowsEnabled !== settings.shadowsEnabled ||
        prev.shadowMapSize !== settings.shadowMapSize) {
      disposeShadows(this.shadowSystem);
      this.shadowSystem = setupShadows(this.scene, settings);
      this.reregisterAllShadowCasters();
    } else if (this.shadowSystem && prev) {
      this.shadowSystem.generator.darkness = settings.shadowDarkness;
    }

    if (!prev || prev.layerHighlightEnabled !== settings.layerHighlightEnabled) {
      this.blockRenderer.setLayerHighlightEnabled(settings.layerHighlightEnabled);
      if (settings.layerHighlightEnabled) {
        void this.handleLayerChanged();
      }
    }

    const camera = this.cameraRig.getCamera();
    this.postProcessing = updatePostProcessing(
      this.postProcessing, this.scene, camera, settings
    );
  }

  private flushShadowCasters(): void {
    unregisterShadowCasters(this.shadowSystem, this.removedShadowCasters);
    this.removedShadowCasters.clear();
  }

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
