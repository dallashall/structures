import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Vector3,
  LinesMesh,
} from '@babylonjs/core';
import { editorStateManager } from '../EditorStateManager';
import type { Dimensions, LayerState } from '../../types';

/**
 * SlicePlaneVisualizer - Manages translucent planes showing 2D slice locations in 3D space
 *
 * Creates pairs of semi-transparent infinite planes on each side of the active slice
 * for each axis (X, Y, Z). Uses color-coding consistent with the 2D view:
 * - Red (#e74c3c) = X planes
 * - Blue (#3498db) = Y planes
 * - Green (#27ae60) = Z planes
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

  // Plane meshes for each axis (2 planes per axis = 6 total)
  private xPlanes: [Mesh, Mesh] | null = null;
  private yPlanes: [Mesh, Mesh] | null = null;
  private zPlanes: [Mesh, Mesh] | null = null;

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
    editorStateManager.on('layer:changed', this.boundLayerChanged);
  }

  /**
   * Cleanup resources and event listeners
   */
  destroy(): void {
    editorStateManager.off('layer:changed', this.boundLayerChanged);

    this.disposePlanes(this.xPlanes);
    this.disposePlanes(this.yPlanes);
    this.disposePlanes(this.zPlanes);
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
   * Toggle visibility of all slice planes and intersection lines
   */
  setVisible(visible: boolean): void {
    this.setPlaneVisibility(this.xPlanes, visible);
    this.setPlaneVisibility(this.yPlanes, visible);
    this.setPlaneVisibility(this.zPlanes, visible);

    // Toggle intersection lines
    for (const line of this.intersectionLines) {
      line.setEnabled(visible);
    }
  }

  /**
   * Toggle visibility of a specific axis slice planes
   */
  setAxisVisible(axis: 'x' | 'y' | 'z', visible: boolean): void {
    switch (axis) {
      case 'x':
        this.setPlaneVisibility(this.xPlanes, visible);
        break;
      case 'y':
        this.setPlaneVisibility(this.yPlanes, visible);
        break;
      case 'z':
        this.setPlaneVisibility(this.zPlanes, visible);
        break;
    }
    // Intersection lines visibility is handled separately - they show when any planes are visible
  }

  /**
   * Create material for slice planes with glass-like appearance
   */
  private createMaterial(name: string, hexColor: string): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);

    // Parse hex color
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;

    // Glass-like appearance with visible color tint and shine
    material.diffuseColor = new Color3(r * 0.5, g * 0.5, b * 0.5); // Saturated tint
    material.specularColor = new Color3(1.5, 1.5, 1.5); // Very bright specular for obvious shine
    material.specularPower = 16; // Lower power = broader, more visible highlights
    material.emissiveColor = new Color3(r * 0.2, g * 0.2, b * 0.2); // Glow to show color
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
    const activeLayers = editorStateManager.getActiveLayers();

    // Dispose old planes and lines
    this.disposePlanes(this.xPlanes);
    this.disposePlanes(this.yPlanes);
    this.disposePlanes(this.zPlanes);
    this.disposeIntersectionLines();

    // Create X planes (red) - perpendicular to X axis (width)
    this.xPlanes = this.createPlanePair(
      'xSlice',
      activeLayers.x,
      'x',
      this.xMaterial
    );

    // Create Y planes (blue) - perpendicular to Y axis (height)
    this.yPlanes = this.createPlanePair(
      'ySlice',
      activeLayers.y,
      'y',
      this.yMaterial
    );

    // Create Z planes (green) - perpendicular to Z axis (depth)
    this.zPlanes = this.createPlanePair(
      'zSlice',
      activeLayers.z,
      'z',
      this.zMaterial
    );

    // Create intersection lines
    this.createIntersectionLines(activeLayers);
  }

  /**
   * Create a pair of planes on either side of a slice
   */
  private createPlanePair(
    baseName: string,
    sliceIndex: number,
    axis: 'x' | 'y' | 'z',
    material: StandardMaterial
  ): [Mesh, Mesh] {
    // Calculate size - make planes large enough to cover entire build area
    const maxDim = Math.max(
      this.dimensions.width,
      this.dimensions.height,
      this.dimensions.depth
    );
    const planeSize = maxDim * 3; // Oversized to appear infinite

    // Create plane geometry
    // In Babylon: CreatePlane creates a plane in XY orientation (facing +Z)
    const plane1 = MeshBuilder.CreatePlane(
      `${baseName}_before`,
      { size: planeSize, sideOrientation: Mesh.DOUBLESIDE },
      this.scene
    );

    const plane2 = MeshBuilder.CreatePlane(
      `${baseName}_after`,
      { size: planeSize, sideOrientation: Mesh.DOUBLESIDE },
      this.scene
    );

    // Apply material
    plane1.material = material;
    plane2.material = material;

    // Enable edge rendering for glass-like outline
    const edgeColor = material.diffuseColor;
    plane1.enableEdgesRendering();
    plane1.edgesWidth = 2.0;
    plane1.edgesColor = new Color3(edgeColor.r * 2, edgeColor.g * 2, edgeColor.b * 2).toColor4(0.6);

    plane2.enableEdgesRendering();
    plane2.edgesWidth = 2.0;
    plane2.edgesColor = new Color3(edgeColor.r * 2, edgeColor.g * 2, edgeColor.b * 2).toColor4(0.6);

    // Position and orient planes based on axis
    this.positionPlanePair(plane1, plane2, sliceIndex, axis);

    return [plane1, plane2];
  }

  /**
   * Position and orient a plane pair for a specific axis and slice index
   *
   * Coordinate conversion (from toBabylonVector):
   * - Our X (width) → Babylon X
   * - Our Y (height) → Babylon Z
   * - Our Z (depth) → Babylon Y
   *
   * CreatePlane defaults to XY orientation (perpendicular to +Z)
   */
  private positionPlanePair(
    plane1: Mesh,
    plane2: Mesh,
    sliceIndex: number,
    axis: 'x' | 'y' | 'z'
  ): void {
    // Offset amount (0.01 to place just outside the slice boundaries)
    const offset = 0.01;

    switch (axis) {
      case 'x':
        // X planes perpendicular to X axis (width)
        // Our X → Babylon X, so perpendicular to Babylon X axis
        // Need YZ plane in Babylon, rotate 90° around Y
        plane1.rotation.y = Math.PI / 2;
        plane2.rotation.y = Math.PI / 2;

        // Position on either side of the slice
        plane1.position.x = sliceIndex - offset;
        plane2.position.x = sliceIndex + 1 + offset;

        // Center on build area
        // Babylon Y = our Z (depth), Babylon Z = our Y (height)
        plane1.position.y = this.dimensions.depth / 2;
        plane1.position.z = this.dimensions.height / 2;

        plane2.position.y = this.dimensions.depth / 2;
        plane2.position.z = this.dimensions.height / 2;
        break;

      case 'y':
        // Y planes perpendicular to Y axis (height)
        // Our Y → Babylon Z, so perpendicular to Babylon Z axis
        // Default CreatePlane is XY (perpendicular to Z), so no rotation needed!
        plane1.rotation.x = 0;
        plane1.rotation.y = 0;
        plane1.rotation.z = 0;
        plane2.rotation.x = 0;
        plane2.rotation.y = 0;
        plane2.rotation.z = 0;

        // Position on either side of the slice
        plane1.position.z = sliceIndex - offset;
        plane2.position.z = sliceIndex + 1 + offset;

        // Center on build area
        // Babylon X = our X (width), Babylon Y = our Z (depth)
        plane1.position.x = this.dimensions.width / 2;
        plane1.position.y = this.dimensions.depth / 2;

        plane2.position.x = this.dimensions.width / 2;
        plane2.position.y = this.dimensions.depth / 2;
        break;

      case 'z':
        // Z planes perpendicular to Z axis (depth)
        // Our Z → Babylon Y, so perpendicular to Babylon Y axis
        // Need XZ plane in Babylon, rotate 90° around X
        plane1.rotation.x = Math.PI / 2;
        plane2.rotation.x = Math.PI / 2;

        // Position on either side of the slice
        plane1.position.y = sliceIndex - offset;
        plane2.position.y = sliceIndex + 1 + offset;

        // Center on build area
        // Babylon X = our X (width), Babylon Z = our Y (height)
        plane1.position.x = this.dimensions.width / 2;
        plane1.position.z = this.dimensions.height / 2;

        plane2.position.x = this.dimensions.width / 2;
        plane2.position.z = this.dimensions.height / 2;
        break;
    }
  }

  /**
   * Create intersection lines showing where slice planes cross
   * Creates 4 lines for each pair of axes (2 planes × 2 planes = 4 intersections)
   * Lines extend to the edges of the build volume
   */
  private createIntersectionLines(activeLayers: LayerState): void {
    // Dispose old lines
    this.disposeIntersectionLines();

    const offset = 0.01; // Match plane offset

    // X-Y intersections (red-blue): vertical lines along depth axis (Babylon Y)
    // Lines extend along our Z (height) dimension = Babylon Y
    // 2 X planes × 2 Y planes = 4 lines
    for (const xCoord of [activeLayers.x - offset, activeLayers.x + 1 + offset]) {
      for (const yCoord of [activeLayers.y - offset, activeLayers.y + 1 + offset]) {
        this.createIntersectionLine(
          xCoord,
          yCoord,
          'xy',
          this.dimensions.depth, // Our Z (depth) → Babylon Y
          '#9b59b6' // Purple blend
        );
      }
    }

    // X-Z intersections (red-green): vertical lines along height axis (Babylon Z)
    // Lines extend along our Y (height) dimension = Babylon Z
    // 2 X planes × 2 Z planes = 4 lines
    for (const xCoord of [activeLayers.x - offset, activeLayers.x + 1 + offset]) {
      for (const zCoord of [activeLayers.z - offset, activeLayers.z + 1 + offset]) {
        this.createIntersectionLine(
          xCoord,
          zCoord,
          'xz',
          this.dimensions.height, // Our Y (height) → Babylon Z
          '#f39c12' // Orange blend
        );
      }
    }

    // Y-Z intersections (blue-green): horizontal lines along width axis (Babylon X)
    // Lines extend along our X (width) dimension = Babylon X
    // 2 Y planes × 2 Z planes = 4 lines
    for (const yCoord of [activeLayers.y - offset, activeLayers.y + 1 + offset]) {
      for (const zCoord of [activeLayers.z - offset, activeLayers.z + 1 + offset]) {
        this.createIntersectionLine(
          yCoord,
          zCoord,
          'yz',
          this.dimensions.width, // Our X (width) → Babylon X
          '#16a085' // Teal blend
        );
      }
    }
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

    // Parse hex color
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    line.color = new Color3(r, g, b);
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
    const activeLayers = editorStateManager.getActiveLayers();

    // Update only the affected planes
    switch (dimension) {
      case 'x':
        this.disposePlanes(this.xPlanes);
        this.xPlanes = this.createPlanePair('xSlice', layer, 'x', this.xMaterial);
        break;
      case 'y':
        this.disposePlanes(this.yPlanes);
        this.yPlanes = this.createPlanePair('ySlice', layer, 'y', this.yMaterial);
        break;
      case 'z':
        this.disposePlanes(this.zPlanes);
        this.zPlanes = this.createPlanePair('zSlice', layer, 'z', this.zMaterial);
        break;
    }

    // Recreate intersection lines with updated positions
    this.disposeIntersectionLines();
    this.createIntersectionLines(activeLayers);
  }

  /**
   * Dispose a pair of planes
   */
  private disposePlanes(planes: [Mesh, Mesh] | null): void {
    if (!planes) return;
    planes[0].dispose();
    planes[1].dispose();
  }

  /**
   * Set visibility for a pair of planes
   */
  private setPlaneVisibility(planes: [Mesh, Mesh] | null, visible: boolean): void {
    if (!planes) return;
    planes[0].setEnabled(visible);
    planes[1].setEnabled(visible);
  }
}
