import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Vector4,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  AxesViewer,
  Animation,
  EasingFunction,
  ElasticEase,
  Texture,
} from '@babylonjs/core';
import { projectView } from '../projections/ProjectView';
import { blockProjection } from '../projections/BlockProjection';
import { modelProjection } from '../projections/ModelProjection';
import { draftingService } from './DraftingService';
import { blockRegistry } from './BlockRegistry';
import { textureManager } from './TextureManager';
import { editorState } from './EditorState';
import { SlicePlaneVisualizer } from './rendering/SlicePlaneVisualizer';
import type { Vector3D, BlockData } from '../types';

/**
 * Babylon3D - Pure TypeScript BabylonJS controller
 *
 * Handles all 3D rendering, camera controls, and scene management.
 * No React - just DOM and BabylonJS.
 *
 * COORDINATE SYSTEM CONVERSION:
 * Our system: Z-up, right-handed (X=width, Y=depth, Z=height)
 * BabylonJS: Y-up, left-handed (X, Y, Z)
 *
 * Conversion implemented in toBabylonVector():
 * - Our X → Babylon X
 * - Our Y → Babylon Z (NO negation)
 * - Our Z → Babylon Y
 */
export class Babylon3D {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private axesViewer: AxesViewer | null = null;
  private slicePlaneVisualizer: SlicePlaneVisualizer | null = null;

  // Block mesh instances
  private blockMeshes = new Map<string, Mesh>();

  // Preview/ghost mesh instances (for drag preview)
  private previewMeshes = new Map<string, Mesh>();

  // Materials cache (one per block color)
  private materials = new Map<string, StandardMaterial>();

  // Ghost materials cache (semi-transparent versions for preview)
  private ghostMaterials = new Map<string, StandardMaterial>();

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    tick: this.updateScene.bind(this),
    previewChanged: this.updatePreviewMeshes.bind(this),
    layerChanged: this.updateBlockBrightness.bind(this),
    resize: this.handleResize.bind(this),
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create BabylonJS engine
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    // Create scene
    this.scene = new Scene(this.engine);
    // Dark background for professional editor aesthetic
    this.scene.clearColor = new Color3(0.1, 0.1, 0.1).toColor4();

    // Setup camera with defaults
    this.camera = this.setupCameraSync();

    // Setup lighting
    this.setupLighting();

    // Setup grid helper
    this.setupGrid();

    // Setup coordinate axes
    this.setupAxes();

    // Setup slice plane visualizer
    this.setupSlicePlanes();

    // Subscribe to projection changes (only update when model changes)
    blockProjection.on('blocks:rebuilt', this.boundHandlers.tick);
    modelProjection.on('model:rebuilt', this.boundHandlers.tick);

    // Subscribe to preview state (hover + painting draft)
    draftingService.on('draft:updated', this.boundHandlers.previewChanged);
    draftingService.on('draft:finalized', this.boundHandlers.previewChanged);
    draftingService.on('draft:cancelled', this.boundHandlers.previewChanged);
    editorState.on('preview:rendered', this.boundHandlers.previewChanged);

    // Subscribe to editor state events for active layer highlighting
    editorState.on('layer:adjusted', this.boundHandlers.layerChanged);

    // Handle window resize
    window.addEventListener('resize', this.boundHandlers.resize);

    // Start BabylonJS render loop (WebGL rendering at 60fps)
    // This handles smooth WebGL rendering - scene updates happen reactively above
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  /**
   * Initialize with async project data
   * Call this after construction
   */
  async init(): Promise<void> {
    await this.updateCameraTarget();
    await this.updateSlicePlanes();
    await this.updateScene();
  }

  destroy(): void {
    // Unsubscribe from projection events
    blockProjection.off('blocks:rebuilt', this.boundHandlers.tick);
    modelProjection.off('model:rebuilt', this.boundHandlers.tick);

    // Unsubscribe from preview events
    draftingService.off('draft:updated', this.boundHandlers.previewChanged);
    draftingService.off('draft:finalized', this.boundHandlers.previewChanged);
    draftingService.off('draft:cancelled', this.boundHandlers.previewChanged);
    editorState.off('preview:rendered', this.boundHandlers.previewChanged);

    // Unsubscribe from editor state
    editorState.off('layer:adjusted', this.boundHandlers.layerChanged);
    window.removeEventListener('resize', this.boundHandlers.resize);

    // Dispose slice plane visualizer
    this.slicePlaneVisualizer?.destroy();

    // Dispose axes viewer
    this.axesViewer?.dispose();

    // Dispose BabylonJS resources
    this.scene.dispose();
    this.engine.dispose();
  }

  /**
   * Setup camera with orbit controls (synchronous with default dimensions)
   */
  private setupCameraSync(): ArcRotateCamera {
    const dimensions = { width: 10, height: 10, depth: 10 };

    // Calculate center of build area in Babylon coordinates
    const center = this.toBabylonVector({
      x: dimensions.width / 2,
      y: dimensions.depth / 2,
      z: dimensions.height / 2,
    });

    // Create arc rotate camera (orbits around target)
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4, // alpha (horizontal rotation)
      Math.PI / 3, // beta (vertical rotation)
      20, // radius (distance from target)
      center,
      this.scene
    );

    // Attach camera controls to canvas
    camera.attachControl(this.canvas, true);

    // Configure camera limits
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 100;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2 - 0.1;

    // Smooth camera movements
    camera.inertia = 0.9;
    camera.angularSensibilityX = 1000;
    camera.angularSensibilityY = 1000;
    camera.panningSensibility = 50;
    camera.wheelPrecision = 50;

    return camera;
  }

  /**
   * Update camera target based on project dimensions (async)
   */
  private async updateCameraTarget(): Promise<void> {
    const project = await projectView.getProject();
    if (!project) return;

    const center = this.toBabylonVector({
      x: project.dimensions.width / 2,
      y: project.dimensions.depth / 2,
      z: project.dimensions.height / 2,
    });

    this.camera.setTarget(center);
  }

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Ambient light from above
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;

    // Directional light for better depth perception and glass highlights
    const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), this.scene);
    dirLight.intensity = 0.6;
    dirLight.specular = new Color3(1, 1, 1); // White specular for glass shine
  }

  /**
   * Setup ground grid for spatial reference
   */
  private setupGrid(): void {
    // Use default dimensions for grid (will be large enough for any project)
    const { width, depth } = { width: 50, depth: 50 };

    // Create a simple grid using lines
    const gridSize = Math.max(width, depth) * 2;
    const gridSpacing = 1;
    const lines: Vector3[][] = [];

    // Create grid lines parallel to X axis
    for (let z = -gridSize; z <= gridSize; z += gridSpacing) {
      lines.push([
        new Vector3(-gridSize, 0, z),
        new Vector3(gridSize, 0, z),
      ]);
    }

    // Create grid lines parallel to Z axis
    for (let x = -gridSize; x <= gridSize; x += gridSpacing) {
      lines.push([
        new Vector3(x, 0, -gridSize),
        new Vector3(x, 0, gridSize),
      ]);
    }

    // Create line system
    const gridLines = MeshBuilder.CreateLineSystem(
      'grid',
      { lines },
      this.scene
    );
    gridLines.color = new Color3(0.7, 0.7, 0.7);
    gridLines.alpha = 0.5;

    // Position grid at ground level
    gridLines.position.y = 0;
  }

  /**
   * Setup coordinate axes helper
   * Shows X (red), Y (green), Z (blue) arrows at origin
   */
  private setupAxes(): void {
    // Dispose old axes if they exist
    this.axesViewer?.dispose();

    // Create axes viewer at origin with size 3
    // In Babylon coords: X=red, Y=green (up), Z=blue
    // In our coords: X=red (width), Y=blue (depth), Z=green (height)
    this.axesViewer = new AxesViewer(this.scene, 3);

    // Note: AxesViewer shows Babylon's coordinate system:
    // - Red arrow (X) = our width (X)
    // - Green arrow (Y) = our height (Z)
    // - Blue arrow (Z) = our depth (Y)
  }

  /**
   * Setup slice plane visualizer
   * Shows translucent planes marking the active 2D slice positions
   */
  private setupSlicePlanes(): void {
    // Use default dimensions (will be updated in init())
    const dimensions = { width: 10, height: 10, depth: 10 };

    // Dispose old visualizer if it exists
    this.slicePlaneVisualizer?.destroy();

    // Create new visualizer with current project dimensions
    this.slicePlaneVisualizer = new SlicePlaneVisualizer(
      this.scene,
      dimensions
    );
  }

  /**
   * Update slice planes with actual project dimensions
   */
  private async updateSlicePlanes(): Promise<void> {
    const project = await projectView.getProject();
    if (!project) return;

    // Dispose old visualizer if it exists
    this.slicePlaneVisualizer?.destroy();

    // Create new visualizer with current project dimensions
    this.slicePlaneVisualizer = new SlicePlaneVisualizer(
      this.scene,
      project.dimensions
    );
  }

  /**
   * Convert our coordinate system to Babylon coordinate system
   *
   * Our system: Z-up, right-handed (X=width, Y=depth, Z=height)
   * BabylonJS: Y-up, left-handed
   *
   * Conversion:
   * - Our X → Babylon X (width)
   * - Our Y → Babylon Z (depth)
   * - Our Z → Babylon Y (height)
   */
  private toBabylonVector(v: Vector3D): Vector3 {
    return new Vector3(v.x, v.z, v.y);
  }

  /**
   * Get or create material (using atlas texture or color fallback)
   */
  private getMaterial(blockId: string): StandardMaterial {
    if (this.materials.has(blockId)) {
      return this.materials.get(blockId)!;
    }

    const block = blockRegistry.getBlock(blockId);
    if (!block) {
      // Fallback to gray material
      return this.createColorMaterial('unknown', '#7f7f7f');
    }

    const material = new StandardMaterial(`material_${blockId}`, this.scene);

    // Try to use atlas texture
    const atlas = textureManager.getAtlas();
    if (atlas && atlas.loaded) {
      // Create BabylonJS texture from atlas
      const babylonTexture = new Texture(
        atlas.path,
        this.scene,
        false,  // noMipmap
        false,  // invertY - Keep standard image coordinates to match Canvas2D
        Texture.NEAREST_SAMPLINGMODE  // Pixel-perfect for 16x16
      );

      material.diffuseTexture = babylonTexture;

      // For transparent blocks (glass)
      if (block.isTransparent) {
        material.alpha = 0.7;
        material.backFaceCulling = false;
      }
    } else {
      // Fallback to color
      const r = parseInt(block.color.slice(1, 3), 16) / 255;
      const g = parseInt(block.color.slice(3, 5), 16) / 255;
      const b = parseInt(block.color.slice(5, 7), 16) / 255;
      material.diffuseColor = new Color3(r, g, b);
    }

    material.specularColor = new Color3(0.2, 0.2, 0.2);
    this.materials.set(blockId, material);
    return material;
  }

  /**
   * Helper to create color-based material
   */
  private createColorMaterial(id: string, color: string): StandardMaterial {
    const material = new StandardMaterial(`material_${id}`, this.scene);
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    material.diffuseColor = new Color3(r, g, b);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    return material;
  }

  /**
   * Create a block mesh with scale-in animation
   * If a block already exists at this position, update its material instead
   */
  private createBlockMesh(blockData: BlockData, animate: boolean = true): void {
    const key = `${blockData.position.x},${blockData.position.y},${blockData.position.z}`;

    // Check if block already exists at this position
    if (this.blockMeshes.has(key)) {
      // Update existing block material
      const existingMesh = this.blockMeshes.get(key)!;
      existingMesh.material = this.getMaterial(blockData.blockType);
      this.updateMeshBrightness(existingMesh, blockData.position);
      return;
    }

    // Get block definition
    const block = blockRegistry.getBlock(blockData.blockType);
    if (!block) return;

    // Get 3D faceUV coordinates from texture manager (with swapped and rotated textures)
    const faceUVData = textureManager.getBlockFaceUV3D(blockData.blockType);
    const faceUV = faceUVData ? faceUVData.map((uv) => {
      return new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
    }) : undefined;

    // Create box mesh with faceUV for per-face texturing
    const boxOptions: any = {
      size: 1,
    };

    // Apply faceUV if available (for multi-face texturing from atlas)
    if (faceUV) {
      boxOptions.faceUV = faceUV;
    }

    const box = MeshBuilder.CreateBox(
      `block_${key}`,
      boxOptions,
      this.scene
    );

    // Center block in grid cell by adding 0.5 offset in our coordinate system
    // BEFORE converting to Babylon coordinates
    const centeredPos: Vector3D = {
      x: blockData.position.x + 0.5,
      y: blockData.position.y + 0.5,
      z: blockData.position.z + 0.5,
    };
    box.position = this.toBabylonVector(centeredPos);

    // Apply material (atlas texture)
    box.material = this.getMaterial(blockData.blockType);

    // Store reference
    this.blockMeshes.set(key, box);

    // Set initial brightness based on active layers
    this.updateMeshBrightness(box, blockData.position);

    // Animate scale-in along Y axis (vertical in Babylon space) with elastic bounce
    if (animate) {
      // Start with zero height
      box.scaling.y = 0;

      // Create scale animation
      const animationScaleY = new Animation(
        'scaleYAnimation',
        'scaling.y',
        60, // 60 FPS
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Animation keyframes - slow and smooth (36 frames at 60fps = 600ms)
      const keys = [
        { frame: 0, value: 0 },
        { frame: 36, value: 1 },
      ];

      animationScaleY.setKeys(keys);

      // Add elastic easing for subtle overshoot
      const easingFunction = new ElasticEase();
      easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
      easingFunction.oscillations = 1; // Just one gentle bounce
      easingFunction.springiness = 2; // Subtle overshoot
      animationScaleY.setEasingFunction(easingFunction);

      // Apply animation
      box.animations = [animationScaleY];
      this.scene.beginAnimation(box, 0, 36, false);
    }
  }

  /**
   * Remove a block mesh with fade-out animation
   */
  private removeBlockMesh(position: Vector3D, animate: boolean = true): void {
    const key = `${position.x},${position.y},${position.z}`;
    const mesh = this.blockMeshes.get(key);

    if (!mesh) return;

    // Remove from map immediately to prevent double-deletion
    this.blockMeshes.delete(key);

    if (animate) {
      // Create fade-out animation (opacity + scale)
      const animationAlpha = new Animation(
        'fadeOutAnimation',
        'visibility',
        60, // 60 FPS
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

      // Animation keyframes - fast fade out (12 frames = 200ms)
      const alphaKeys = [
        { frame: 0, value: 1 },
        { frame: 12, value: 0 },
      ];

      const scaleKeys = [
        { frame: 0, value: 1 },
        { frame: 12, value: 0 },
      ];

      animationAlpha.setKeys(alphaKeys);
      animationScaleY.setKeys(scaleKeys);

      // Apply animations
      mesh.animations = [animationAlpha, animationScaleY];
      const animatable = this.scene.beginAnimation(mesh, 0, 12, false);

      // Dispose mesh after animation completes
      animatable.onAnimationEnd = () => {
        mesh.dispose();
      };
    } else {
      // Instant deletion
      mesh.dispose();
    }
  }

  /**
   * Update entire scene based on current project state
   */
  private async updateScene(): Promise<void> {
    const project = await projectView.getProject();
    if (!project) {
      // Clear all blocks
      this.clearAllBlocks();
      return;
    }

    // Get all blocks from projection
    const blocks = (await blockProjection.getBlocks()).toArray();
    const blockKeys = new Set(
      blocks.map((b: BlockData) => `${b.position.x},${b.position.y},${b.position.z}`)
    );

    // Remove meshes that no longer exist in project (no animation for bulk updates)
    for (const key of this.blockMeshes.keys()) {
      if (!blockKeys.has(key)) {
        const [x, y, z] = key.split(',').map(Number);
        this.removeBlockMesh({ x, y, z }, false);
      }
    }

    // Add/update meshes for all blocks (no animation for bulk loading)
    for (const blockData of blocks) {
      this.createBlockMesh(blockData, false);
    }

    // Update grid if dimensions changed
    await this.updateGrid();

    // Focus camera on structure
    await this.focusCameraOnStructure();

    // Update preview meshes
    this.updatePreviewMeshes();
  }


  /**
   * Update brightness of all blocks when active layer changes
   */
  private async updateBlockBrightness(): Promise<void> {
    const project = await projectView.getProject();
    if (!project) return;

    // Update brightness for all blocks
    project.blocks.forEach((blockData: BlockData) => {
      const key = `${blockData.position.x},${blockData.position.y},${blockData.position.z}`;
      const mesh = this.blockMeshes.get(key);
      if (mesh) {
        this.updateMeshBrightness(mesh, blockData.position);
      }
    });
  }

  /**
   * Update brightness of a single mesh based on active layers
   * Blocks on any active layer appear much brighter
   */
  private updateMeshBrightness(mesh: Mesh, position: Vector3D): void {
    const activeLayers = editorState.getActiveLayers();

    // Check if block is on any active layer
    const isOnActiveLayer =
      position.x === activeLayers.x ||
      position.y === activeLayers.y ||
      position.z === activeLayers.z;

    if (isOnActiveLayer) {
      // Brighten blocks on active layers using strong emissive glow
      const material = mesh.material as StandardMaterial;
      if (material && material.diffuseColor) {
        // Strong emissive glow to make it very obvious
        material.emissiveColor = material.diffuseColor.scale(0.7);
        // Also slightly increase specular for extra pop
        material.specularColor = new Color3(0.3, 0.3, 0.3);
      }
    } else {
      // Dim blocks not on active layers
      const material = mesh.material as StandardMaterial;
      if (material) {
        material.emissiveColor = new Color3(0, 0, 0);
        material.specularColor = new Color3(0.2, 0.2, 0.2);
      }
    }
  }

  /**
   * Clear all block meshes
   */
  private clearAllBlocks(): void {
    for (const mesh of this.blockMeshes.values()) {
      mesh.dispose();
    }
    this.blockMeshes.clear();
  }

  /**
   * Update grid based on current project dimensions
   */
  private async updateGrid(): Promise<void> {
    // Remove old grid
    const oldGrid = this.scene.getMeshByName('grid');
    oldGrid?.dispose();

    // Recreate grid with new dimensions
    this.setupGrid();

    // Update slice planes with new dimensions
    const project = await projectView.getProject();
    if (project) {
      this.slicePlaneVisualizer?.updateDimensions(project.dimensions);
    }
  }

  /**
   * Focus camera on the structure
   */
  private async focusCameraOnStructure(): Promise<void> {
    const project = await projectView.getProject();
    if (!project) return;

    const { width, height, depth } = project.dimensions;

    // Calculate center of build area
    const center = this.toBabylonVector({
      x: width / 2,
      y: depth / 2,
      z: height / 2,
    });

    this.camera.setTarget(center);

    // Adjust radius based on structure size
    const maxDimension = Math.max(width, height, depth);
    this.camera.radius = maxDimension * 2;
  }

  /**
   * Handle canvas resize
   */
  private handleResize(): void {
    this.engine.resize();
  }

  /**
   * Manually resize (called from React component)
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.engine.resize();
  }

  /**
   * Toggle visibility of slice plane guides
   */
  setSliceGuidesVisible(visible: boolean): void {
    this.slicePlaneVisualizer?.setVisible(visible);
  }

  /**
   * Toggle visibility of a specific axis slice guide
   */
  setAxisSliceVisible(axis: 'x' | 'y' | 'z', visible: boolean): void {
    this.slicePlaneVisualizer?.setAxisVisible(axis, visible);
  }

  /**
   * Set camera to a preset view
   *
   * Our coordinate system: X=width, Y=depth, Z=height (Z-up, right-handed)
   * Babylon system: X, Z, Y (Y-up, left-handed) - conversion: (x,y,z) → (x,z,y)
   *
   * View mappings:
   * - Front: Looking at +Y face (our south/front) → Babylon +Z
   * - Back: Looking at -Y face (our north/back) → Babylon -Z
   * - Left: Looking at -X face (our west/left) → Babylon -X
   * - Right: Looking at +X face (our east/right) → Babylon +X
   * - Top: Looking down at +Z face (our top) → Babylon +Y
   * - Bottom: Looking up at -Z face (our bottom) → Babylon -Y
   */
  setCameraView(view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'): void {
    // ArcRotateCamera rotates AROUND the target
    // Our: X=width, Y=depth, Z=height → Babylon: X=X, Z=Y, Y=Z
    const presets = {
      left: { alpha: 0, beta: Math.PI / 2 },               // Looking at left (-X faces)
      right: { alpha: Math.PI, beta: Math.PI / 2 },        // Looking at right (+X faces)
      front: { alpha: Math.PI / 2, beta: Math.PI / 2 },    // Looking at front (+Y = +Z Babylon)
      back: { alpha: -Math.PI / 2, beta: Math.PI / 2 },    // Looking at back (-Y = -Z Babylon)
      top: { alpha: 0, beta: 0.01 },                       // Looking down from above
      bottom: { alpha: 0, beta: Math.PI - 0.01 },          // Looking up from below
    };

    const preset = presets[view];
    this.camera.alpha = preset.alpha;
    this.camera.beta = preset.beta;
  }

  /**
   * Zoom camera in or out
   */
  zoomCamera(delta: number): void {
    const newRadius = this.camera.radius + delta;
    this.camera.radius = Math.max(
      this.camera.lowerRadiusLimit || 2,
      Math.min(this.camera.upperRadiusLimit || 100, newRadius)
    );
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    this.camera.alpha = Math.PI / 4;
    this.camera.beta = Math.PI / 3;
    this.camera.radius = 20;
  }

  /**
   * Handle preview blocks changed event
   * Creates/updates ghost preview meshes
   *
   * Fetches preview from both sources:
   * 1. EditorStateManager: Local 2D-specific preview (outline drag, point hover)
   * 2. DraftingService: Shared painting preview (draft blocks during painting)
   *
   * Uses diffing to only update changed meshes (prevents flashing and improves performance)
   */
  private updatePreviewMeshes(): void {
    // Combine preview blocks from both sources
    const editorPreview = editorState.getPreviewBlocks() || [];
    const draftPreview = draftingService.getPreview() || [];
    const allPreviewBlocks = [...editorPreview, ...draftPreview];

    // Build set of new preview positions
    const newPreviewKeys = new Set(
      allPreviewBlocks.map((b) => `${b.position.x},${b.position.y},${b.position.z}`)
    );

    // Remove preview meshes that are no longer in preview
    for (const key of this.previewMeshes.keys()) {
      if (!newPreviewKeys.has(key)) {
        const mesh = this.previewMeshes.get(key)!;
        mesh.dispose();
        this.previewMeshes.delete(key);
      }
    }

    // Add/update preview meshes for new blocks
    for (const previewBlock of allPreviewBlocks) {
      if (!previewBlock.blockType) continue; // Skip null block types

      const key = `${previewBlock.position.x},${previewBlock.position.y},${previewBlock.position.z}`;

      // Only create if doesn't exist (keeps existing meshes, prevents flashing)
      if (!this.previewMeshes.has(key)) {
        this.createPreviewMesh(previewBlock);
      }
      // Note: If mesh exists, we keep it (no need to update material since block types don't change during stroke)
    }
  }

  /**
   * Create a ghost/preview mesh (semi-transparent)
   * In delete mode, shows red tint to indicate removal
   */
  private createPreviewMesh(previewBlock: import('../core/EditorState').PreviewBlock): void {
    const key = `${previewBlock.position.x},${previewBlock.position.y},${previewBlock.position.z}`;

    // Get block definition
    const block = blockRegistry.getBlock(previewBlock.blockType!);
    if (!block) return;

    // Create box mesh
    const box = MeshBuilder.CreateBox(
      `preview_${key}`,
      { size: 1 },
      this.scene
    );

    // Center block in grid cell by adding 0.5 offset in our coordinate system
    // BEFORE converting to Babylon coordinates
    const centeredPos: Vector3D = {
      x: previewBlock.position.x + 0.5,
      y: previewBlock.position.y + 0.5,
      z: previewBlock.position.z + 0.5,
    };
    box.position = this.toBabylonVector(centeredPos);

    // Apply ghost material (semi-transparent, with red tint if delete mode)
    const deleteMode = editorState.getDeleteMode();
    box.material = deleteMode
      ? this.getDeleteGhostMaterial(block.color)
      : this.getGhostMaterial(block.color);

    // Store reference
    this.previewMeshes.set(key, box);
  }

  /**
   * Get or create a ghost material (semi-transparent version)
   */
  private getGhostMaterial(color: string): StandardMaterial {
    // Check cache
    if (this.ghostMaterials.has(color)) {
      return this.ghostMaterials.get(color)!;
    }

    // Parse hex color
    const r = parseInt(color.substring(1, 3), 16) / 255;
    const g = parseInt(color.substring(3, 5), 16) / 255;
    const b = parseInt(color.substring(5, 7), 16) / 255;

    // Create material
    const material = new StandardMaterial(`ghost_${color}`, this.scene);
    material.diffuseColor = new Color3(r, g, b);
    material.specularColor = new Color3(0.3, 0.3, 0.3);
    material.alpha = 0.5; // Semi-transparent
    material.transparencyMode = 2; // Alpha blend mode

    this.ghostMaterials.set(color, material);
    return material;
  }

  /**
   * Get or create a delete ghost material (semi-transparent with red tint)
   * Used to show blocks that will be removed in delete mode
   */
  private getDeleteGhostMaterial(color: string): StandardMaterial {
    const deleteKey = `delete_${color}`;

    // Check cache
    if (this.ghostMaterials.has(deleteKey)) {
      return this.ghostMaterials.get(deleteKey)!;
    }

    // Parse hex color
    const r = parseInt(color.substring(1, 3), 16) / 255;
    const g = parseInt(color.substring(3, 5), 16) / 255;
    const b = parseInt(color.substring(5, 7), 16) / 255;

    // Create material with red tint
    const material = new StandardMaterial(`ghost_delete_${color}`, this.scene);

    // Mix original color with red (60% original, 40% red)
    material.diffuseColor = new Color3(
      r * 0.6 + 1.0 * 0.4,  // Add red tint
      g * 0.6,               // Reduce green
      b * 0.6                // Reduce blue
    );

    material.specularColor = new Color3(0.3, 0.1, 0.1); // Reddish specular
    material.emissiveColor = new Color3(0.2, 0, 0); // Slight red glow
    material.alpha = 0.6; // Slightly more opaque for delete preview
    material.transparencyMode = 2; // Alpha blend mode

    this.ghostMaterials.set(deleteKey, material);
    return material;
  }

}
