import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  AxesViewer,
  Animation,
  EasingFunction,
  ElasticEase,
} from '@babylonjs/core';
import { projectManager } from './ProjectManager';
import { blockRegistry } from './BlockRegistry';
import type { Vector3D, BlockData } from '../types';

/**
 * Babylon3DController - Pure TypeScript BabylonJS controller
 *
 * Handles all 3D rendering, camera controls, and scene management.
 * No React - just DOM and BabylonJS.
 *
 * COORDINATE SYSTEM CONVERSION:
 * Our system: Z-up, right-handed (X=width, Y=depth, Z=height)
 * BabylonJS: Y-up, left-handed (X, Y, Z)
 *
 * Conversion:
 * - Our X → Babylon X
 * - Our Y → Babylon -Z (negated for handedness conversion)
 * - Our Z → Babylon Y
 */
export class Babylon3DController {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private axesViewer: AxesViewer | null = null;

  // Block mesh instances
  private blockMeshes = new Map<string, Mesh>();

  // Materials cache (one per block color)
  private materials = new Map<string, StandardMaterial>();

  // Bound event handlers (for cleanup)
  private boundHandlers = {
    projectChanged: this.updateScene.bind(this),
    blockAdded: this.handleBlockAdded.bind(this),
    blockRemoved: this.handleBlockRemoved.bind(this),
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
    this.scene.clearColor = new Color3(0.95, 0.95, 0.95).toColor4();

    // Setup camera
    this.camera = this.setupCamera();

    // Setup lighting
    this.setupLighting();

    // Setup grid helper
    this.setupGrid();

    // Setup coordinate axes
    this.setupAxes();

    // Subscribe to project events
    // Note: We only listen to project:loaded for full rebuilds
    // and block:added/removed for incremental updates to avoid flickering
    projectManager.on('project:loaded', this.boundHandlers.projectChanged);
    projectManager.on('block:added', this.boundHandlers.blockAdded);
    projectManager.on('block:removed', this.boundHandlers.blockRemoved);

    // Subscribe to viewport events (future: sync camera state)
    // viewportManager.on('camera:changed', this.handleCameraChanged);

    // Handle window resize
    window.addEventListener('resize', this.boundHandlers.resize);

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Initial scene update
    this.updateScene();
  }

  destroy(): void {
    // Unsubscribe from events
    projectManager.off('project:loaded', this.boundHandlers.projectChanged);
    projectManager.off('block:added', this.boundHandlers.blockAdded);
    projectManager.off('block:removed', this.boundHandlers.blockRemoved);
    window.removeEventListener('resize', this.boundHandlers.resize);

    // Dispose axes viewer
    this.axesViewer?.dispose();

    // Dispose BabylonJS resources
    this.scene.dispose();
    this.engine.dispose();
  }

  /**
   * Setup camera with orbit controls
   */
  private setupCamera(): ArcRotateCamera {
    const project = projectManager.getProject();
    const dimensions = project?.dimensions || { width: 10, height: 10, depth: 10 };

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
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Ambient light from above
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;

    // Optional: Add directional light for better depth perception
    // const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), this.scene);
    // dirLight.intensity = 0.5;
  }

  /**
   * Setup ground grid for spatial reference
   */
  private setupGrid(): void {
    const project = projectManager.getProject();
    if (!project) return;

    const { width, depth } = project.dimensions;

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
   * Get or create material for a block color
   */
  private getMaterial(color: string): StandardMaterial {
    if (this.materials.has(color)) {
      return this.materials.get(color)!;
    }

    const material = new StandardMaterial(`material_${color}`, this.scene);

    // Parse hex color
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    material.diffuseColor = new Color3(r, g, b);
    material.specularColor = new Color3(0.2, 0.2, 0.2);

    this.materials.set(color, material);
    return material;
  }

  /**
   * Create a block mesh with scale-in animation
   */
  private createBlockMesh(blockData: BlockData, animate: boolean = true): void {
    const key = `${blockData.position.x},${blockData.position.y},${blockData.position.z}`;

    // Skip if already exists
    if (this.blockMeshes.has(key)) return;

    // Get block definition
    const block = blockRegistry.getBlock(blockData.blockType);
    if (!block) return;

    // Create box mesh
    const box = MeshBuilder.CreateBox(
      `block_${key}`,
      { size: 1 },
      this.scene
    );

    // Position in Babylon coordinates
    const babylonPos = this.toBabylonVector(blockData.position);
    box.position = babylonPos.add(new Vector3(0.5, 0.5, 0.5)); // Center on grid cell

    // Apply material
    box.material = this.getMaterial(block.color);

    // Store reference
    this.blockMeshes.set(key, box);

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
  private updateScene(): void {
    const project = projectManager.getProject();
    if (!project) {
      // Clear all blocks
      this.clearAllBlocks();
      return;
    }

    // Get all blocks from project
    const blocks = projectManager.getAllBlocks();
    const blockKeys = new Set(
      blocks.map((b) => `${b.position.x},${b.position.y},${b.position.z}`)
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
    this.updateGrid();

    // Focus camera on structure
    this.focusCameraOnStructure();
  }

  /**
   * Handle block added event (with animation)
   */
  private handleBlockAdded(blockData: BlockData): void {
    this.createBlockMesh(blockData, true);
  }

  /**
   * Handle block removed event (with animation)
   */
  private handleBlockRemoved(position: Vector3D): void {
    this.removeBlockMesh(position, true);
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
  private updateGrid(): void {
    // Remove old grid
    const oldGrid = this.scene.getMeshByName('grid');
    oldGrid?.dispose();

    // Recreate grid with new dimensions
    this.setupGrid();
  }

  /**
   * Focus camera on the structure
   */
  private focusCameraOnStructure(): void {
    const project = projectManager.getProject();
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
}
