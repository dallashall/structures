import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Vector3,
  LinesMesh,
} from '@babylonjs/core';
import { editorState } from '../EditorState';
import { hexToColor3 } from './babylonUtils';
import type { Dimensions, LayerState } from '../../types';

/**
 * SlicePlaneVisualizer - Manages translucent planes showing 2D slice locations in 3D space
 *
 * Creates a single semi-transparent infinite plane on the origin side of the active slice
 * for each axis (X, Y, Z). Uses color-coding consistent with the 2D view:
 * - Red (#e74c3c) = X plane
 * - Blue (#3498db) = Y plane
 * - Green (#27ae60) = Z plane
 *
 * COORDINATE SYSTEM CONVERSION:
 * Our system: Z-up, right-handed (X=width, Y=depth, Z=height)
 * BabylonJS: Y-up, left-handed
 *
 * Conversion applied internally via toBabylonVector:
 * - Our X → Babylon X
 * - Our Y → Babylon Z
 * - Our Z → Babylon Y
 */
export class SlicePlaneVisualizer {
  private scene: Scene;
  private dimensions: Dimensions;

  // Plane meshes for each axis (1 plane per axis = 3 total, on origin side)
  private xPlane: Mesh | null = null;
  private yPlane: Mesh | null = null;
  private zPlane: Mesh | null = null;

  // Intersection lines showing where planes cross each other
  private intersectionLines: LinesMesh[] = [];

  // Materials for each axis
  private xMaterial: StandardMaterial;
  private yMaterial: StandardMaterial;
  private zMaterial: StandardMaterial;

  // Bound event handler for cleanup
  private boundLayerChanged = this.handleLayerChanged.bind(this);

  constructor(scene: Scene, dimensions: Dimensions) {
    this.scene = scene;
    this.dimensions = dimensions;

    // Create materials
    this.xMaterial = this.createMaterial('xSliceMaterial', '#e74c3c'); // Red
    this.yMaterial = this.createMaterial('ySliceMaterial', '#3498db'); // Blue
    this.zMaterial = this.createMaterial('zSliceMaterial', '#27ae60'); // Green

    // Create initial planes
    this.createAllPlanes();

    // Subscribe to layer changes
    editorState.on('layer:adjusted', this.boundLayerChanged);
  }

  /**
   * Cleanup resources and event listeners
   */
  destroy(): void {
    editorState.off('layer:adjusted', this.boundLayerChanged);

    this.disposePlane(this.xPlane);
    this.disposePlane(this.yPlane);
    this.disposePlane(this.zPlane);
    this.disposeIntersectionLines();

    this.xMaterial.dispose();
    this.yMaterial.dispose();
    this.zMaterial.dispose();
  }

  /**
   * Update dimensions and recreate planes
   */
  updateDimensions(dimensions: Dimensions): void {
    this.dimensions = dimensions;
    this.createAllPlanes();
  }

  /**
   * Apply visibility for a specific axis slice plane
   * EditorState is the single source of truth for visibility state
   */
  setAxisVisible(axis: 'x' | 'y' | 'z', visible: boolean): void {
    switch (axis) {
      case 'x':
        this.setPlaneVisibility(this.xPlane, visible);
        break;
      case 'y':
        this.setPlaneVisibility(this.yPlane, visible);
        break;
      case 'z':
        this.setPlaneVisibility(this.zPlane, visible);
        break;
    }
  }

  /**
   * Create material for slice planes with glass-like appearance
   */
  private createMaterial(name: string, hexColor: string): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);

    const color = hexToColor3(hexColor);

    // Glass-like appearance with visible color tint and shine
    material.diffuseColor = color.scale(0.5); // Saturated tint
    material.specularColor = new Color3(1.5, 1.5, 1.5); // Very bright specular for obvious shine
    material.specularPower = 16; // Lower power = broader, more visible highlights
    material.emissiveColor = color.scale(0.2); // Glow to show color
    material.alpha = 0.08; // More opaque to see color and shine
    material.backFaceCulling = false; // Visible from both sides

    // Ensure material receives lighting
    material.disableLighting = false;

    return material;
  }

  /**
   * Create all slice planes for all axes
   */
  private createAllPlanes(): void {
    const activeLayers = editorState.getActiveLayers();

    // Dispose old planes and lines
    this.disposePlane(this.xPlane);
    this.disposePlane(this.yPlane);
    this.disposePlane(this.zPlane);
    this.disposeIntersectionLines();

    // Create X plane (red) - perpendicular to X axis (width), on origin side
    this.xPlane = this.createPlane(
      'xSlice',
      activeLayers.x,
      'x',
      this.xMaterial
    );

    // Create Y plane (blue) - perpendicular to Y axis (height), on origin side
    this.yPlane = this.createPlane(
      'ySlice',
      activeLayers.y,
      'y',
      this.yMaterial
    );

    // Create Z plane (green) - perpendicular to Z axis (depth), on origin side
    this.zPlane = this.createPlane(
      'zSlice',
      activeLayers.z,
      'z',
      this.zMaterial
    );

    // Create intersection lines
    this.createIntersectionLines(activeLayers);

    // Apply visibility from EditorState (single source of truth)
    const visibility = editorState.getSliceGuideVisibility();
    this.setPlaneVisibility(this.xPlane, visibility.x);
    this.setPlaneVisibility(this.yPlane, visibility.y);
    this.setPlaneVisibility(this.zPlane, visibility.z);
  }

  /**
   * Create a single plane on the origin side of a slice
   */
  private createPlane(
    baseName: string,
    sliceIndex: number,
    axis: 'x' | 'y' | 'z',
    material: StandardMaterial
  ): Mesh {
    // Calculate size - make planes large enough to cover entire build area
    const maxDim = Math.max(
      this.dimensions.width,
      this.dimensions.height,
      this.dimensions.depth
    );
    const planeSize = maxDim * 3; // Oversized to appear infinite

    // Create plane geometry
    // In Babylon: CreatePlane creates a plane in XY orientation (facing +Z)
    const plane = MeshBuilder.CreatePlane(
      baseName,
      { size: planeSize, sideOrientation: Mesh.DOUBLESIDE },
      this.scene
    );

    // Apply material
    plane.material = material;

    // Enable edge rendering for glass-like outline
    const edgeColor = material.diffuseColor;
    plane.enableEdgesRendering();
    plane.edgesWidth = 2.0;
    plane.edgesColor = new Color3(edgeColor.r * 2, edgeColor.g * 2, edgeColor.b * 2).toColor4(0.6);

    // Position and orient plane based on axis (origin side only)
    this.positionPlane(plane, sliceIndex, axis);

    return plane;
  }

  /**
   * Position and orient a single plane on origin side for a specific axis and slice index
   *
   * Coordinate conversion (from toBabylonVector):
   * - Our X (width) → Babylon X
   * - Our Y (height) → Babylon Z
   * - Our Z (depth) → Babylon Y
   *
   * CreatePlane defaults to XY orientation (perpendicular to +Z)
   */
  private positionPlane(
    plane: Mesh,
    sliceIndex: number,
    axis: 'x' | 'y' | 'z'
  ): void {
    // Offset amount (0.01 to place just outside the slice boundary on origin side)
    const offset = 0.01;

    switch (axis) {
      case 'x':
        // X plane perpendicular to X axis (width), on origin side
        // Our X → Babylon X, so perpendicular to Babylon X axis
        // Need YZ plane in Babylon, rotate 90° around Y
        plane.rotation.y = Math.PI / 2;

        // Position on origin side of the slice
        plane.position.x = sliceIndex - offset;

        // Center on build area
        // Babylon Y = our Z (depth), Babylon Z = our Y (height)
        plane.position.y = this.dimensions.depth / 2;
        plane.position.z = this.dimensions.height / 2;
        break;

      case 'y':
        // Y plane perpendicular to Y axis (height), on origin side
        // Our Y → Babylon Z, so perpendicular to Babylon Z axis
        // Default CreatePlane is XY (perpendicular to Z), so no rotation needed!
        plane.rotation.x = 0;
        plane.rotation.y = 0;
        plane.rotation.z = 0;

        // Position on origin side of the slice
        plane.position.z = sliceIndex - offset;

        // Center on build area
        // Babylon X = our X (width), Babylon Y = our Z (depth)
        plane.position.x = this.dimensions.width / 2;
        plane.position.y = this.dimensions.depth / 2;
        break;

      case 'z':
        // Z plane perpendicular to Z axis (depth), on origin side
        // Our Z → Babylon Y, so perpendicular to Babylon Y axis
        // Need XZ plane in Babylon, rotate 90° around X
        plane.rotation.x = Math.PI / 2;

        // Position on origin side of the slice
        plane.position.y = sliceIndex - offset;

        // Center on build area
        // Babylon X = our X (width), Babylon Z = our Y (height)
        plane.position.x = this.dimensions.width / 2;
        plane.position.z = this.dimensions.height / 2;
        break;
    }
  }

  /**
   * Create intersection lines showing where slice planes cross
   * Creates 3 lines total (one per pair of axes)
   * Lines extend to the edges of the build volume
   */
  private createIntersectionLines(activeLayers: LayerState): void {
    // Dispose old lines
    this.disposeIntersectionLines();

    const offset = 0.01; // Match plane offset

    // X-Y intersection (red-blue): vertical line along depth axis (Babylon Y)
    // Line extends along our Z (depth) dimension = Babylon Y
    // At the intersection of X origin plane and Y origin plane
    this.createIntersectionLine(
      activeLayers.x - offset,
      activeLayers.y - offset,
      'xy',
      this.dimensions.depth, // Our Z (depth) → Babylon Y
      '#9b59b6' // Purple blend
    );

    // X-Z intersection (red-green): vertical line along height axis (Babylon Z)
    // Line extends along our Y (height) dimension = Babylon Z
    // At the intersection of X origin plane and Z origin plane
    this.createIntersectionLine(
      activeLayers.x - offset,
      activeLayers.z - offset,
      'xz',
      this.dimensions.height, // Our Y (height) → Babylon Z
      '#f39c12' // Orange blend
    );

    // Y-Z intersection (blue-green): horizontal line along width axis (Babylon X)
    // Line extends along our X (width) dimension = Babylon X
    // At the intersection of Y origin plane and Z origin plane
    this.createIntersectionLine(
      activeLayers.y - offset,
      activeLayers.z - offset,
      'yz',
      this.dimensions.width, // Our X (width) → Babylon X
      '#16a085' // Teal blend
    );
  }

  /**
   * Create a single intersection line extending to build volume edges
   */
  private createIntersectionLine(
    coord1: number,
    coord2: number,
    type: 'xy' | 'xz' | 'yz',
    length: number,
    color: string
  ): void {
    let points: Vector3[] = [];

    // Define line endpoints based on intersection type
    // Lines span from 0 to length (edge to edge of build volume)
    switch (type) {
      case 'xy':
        // X-Y intersection: line parallel to Babylon Y (our Z/depth)
        // At Babylon X = coord1, Babylon Z = coord2
        points = [
          new Vector3(coord1, 0, coord2),
          new Vector3(coord1, length, coord2),
        ];
        break;

      case 'xz':
        // X-Z intersection: line parallel to Babylon Z (our Y/height)
        // At Babylon X = coord1, Babylon Y = coord2
        points = [
          new Vector3(coord1, coord2, 0),
          new Vector3(coord1, coord2, length),
        ];
        break;

      case 'yz':
        // Y-Z intersection: line parallel to Babylon X (our X/width)
        // At Babylon Z = coord1, Babylon Y = coord2
        points = [
          new Vector3(0, coord2, coord1),
          new Vector3(length, coord2, coord1),
        ];
        break;
    }

    // Create line mesh
    const line = MeshBuilder.CreateLines(
      `intersection_${type}_${coord1}_${coord2}`,
      { points },
      this.scene
    );

    line.color = hexToColor3(color);
    line.alpha = 0.5;

    this.intersectionLines.push(line);
  }

  /**
   * Dispose all intersection lines
   */
  private disposeIntersectionLines(): void {
    for (const line of this.intersectionLines) {
      line.dispose();
    }
    this.intersectionLines = [];
  }

  /**
   * Handle layer change event from EditorStateManager
   */
  private handleLayerChanged(dimension: 'x' | 'y' | 'z', layer: number): void {
    const activeLayers = editorState.getActiveLayers();
    const visibility = editorState.getSliceGuideVisibility();

    // Update only the affected plane and restore visibility from EditorState
    switch (dimension) {
      case 'x':
        this.disposePlane(this.xPlane);
        this.xPlane = this.createPlane('xSlice', layer, 'x', this.xMaterial);
        this.setPlaneVisibility(this.xPlane, visibility.x);
        break;
      case 'y':
        this.disposePlane(this.yPlane);
        this.yPlane = this.createPlane('ySlice', layer, 'y', this.yMaterial);
        this.setPlaneVisibility(this.yPlane, visibility.y);
        break;
      case 'z':
        this.disposePlane(this.zPlane);
        this.zPlane = this.createPlane('zSlice', layer, 'z', this.zMaterial);
        this.setPlaneVisibility(this.zPlane, visibility.z);
        break;
    }

    // Recreate intersection lines with updated positions
    this.disposeIntersectionLines();
    this.createIntersectionLines(activeLayers);
  }

  /**
   * Dispose a single plane
   */
  private disposePlane(plane: Mesh | null): void {
    if (!plane) return;
    plane.dispose();
  }

  /**
   * Set visibility for a single plane
   */
  private setPlaneVisibility(plane: Mesh | null, visible: boolean): void {
    if (!plane) return;
    plane.setEnabled(visible);
  }
}
