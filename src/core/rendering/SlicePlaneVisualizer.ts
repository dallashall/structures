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
 * SlicePlaneVisualizer - A translucent plane in the 3D view at each axis's active 2D layer
 *
 * Each plane sits on the origin side of its layer and uses the 2D axis colors: X red, Y blue, Z green.
 * Lines mark where the planes cross. EditorState holds which planes are visible.
 *
 * Positions here are Babylon space: model x → Babylon x, model y → Babylon z, model z → Babylon y.
 * Model y spans dimensions.height and model z (vertical) spans dimensions.depth.
 */
export class SlicePlaneVisualizer {
  private scene: Scene;
  private dimensions: Dimensions;

  private xPlane: Mesh | null = null;
  private yPlane: Mesh | null = null;
  private zPlane: Mesh | null = null;

  private intersectionLines: LinesMesh[] = [];

  private xMaterial: StandardMaterial;
  private yMaterial: StandardMaterial;
  private zMaterial: StandardMaterial;

  private boundLayerChanged = this.handleLayerChanged.bind(this);

  constructor(scene: Scene, dimensions: Dimensions) {
    this.scene = scene;
    this.dimensions = dimensions;

    this.xMaterial = this.createMaterial('xSliceMaterial', '#e74c3c');
    this.yMaterial = this.createMaterial('ySliceMaterial', '#3498db');
    this.zMaterial = this.createMaterial('zSliceMaterial', '#27ae60');

    this.createAllPlanes();

    editorState.on('layer:adjusted', this.boundLayerChanged);
  }

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

  updateDimensions(dimensions: Dimensions): void {
    this.dimensions = dimensions;
    this.createAllPlanes();
  }

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

  private createMaterial(name: string, hexColor: string): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);

    const color = hexToColor3(hexColor);

    material.diffuseColor = color.scale(0.5);
    material.specularColor = new Color3(1.5, 1.5, 1.5);
    material.specularPower = 16;
    material.emissiveColor = color.scale(0.2);
    // Low alpha with a strong specular reads as tinted glass without hiding the blocks behind it
    material.alpha = 0.08;
    material.backFaceCulling = false;

    material.disableLighting = false;

    return material;
  }

  private createAllPlanes(): void {
    const activeLayers = editorState.getActiveLayers();

    this.disposePlane(this.xPlane);
    this.disposePlane(this.yPlane);
    this.disposePlane(this.zPlane);
    this.disposeIntersectionLines();

    this.xPlane = this.createPlane(
      'xSlice',
      activeLayers.x,
      'x',
      this.xMaterial
    );

    this.yPlane = this.createPlane(
      'ySlice',
      activeLayers.y,
      'y',
      this.yMaterial
    );

    this.zPlane = this.createPlane(
      'zSlice',
      activeLayers.z,
      'z',
      this.zMaterial
    );

    this.createIntersectionLines(activeLayers);

    const visibility = editorState.getSliceGuideVisibility();
    this.setPlaneVisibility(this.xPlane, visibility.x);
    this.setPlaneVisibility(this.yPlane, visibility.y);
    this.setPlaneVisibility(this.zPlane, visibility.z);
  }

  private createPlane(
    baseName: string,
    sliceIndex: number,
    axis: 'x' | 'y' | 'z',
    material: StandardMaterial
  ): Mesh {
    const maxDim = Math.max(
      this.dimensions.width,
      this.dimensions.height,
      this.dimensions.depth
    );
    // Three times the largest dimension, so the plane's edge stays out of view and it reads as infinite
    const planeSize = maxDim * 3;

    const plane = MeshBuilder.CreatePlane(
      baseName,
      { size: planeSize, sideOrientation: Mesh.DOUBLESIDE },
      this.scene
    );

    plane.material = material;

    const edgeColor = material.diffuseColor;
    plane.enableEdgesRendering();
    plane.edgesWidth = 2.0;
    plane.edgesColor = new Color3(edgeColor.r * 2, edgeColor.g * 2, edgeColor.b * 2).toColor4(0.6);

    this.positionPlane(plane, sliceIndex, axis);

    return plane;
  }

  /**
   * CreatePlane builds in Babylon's XY plane, facing Z. The x and z planes rotate from there.
   * The 0.01 offset keeps a plane just outside its layer, so it does not z-fight the blocks on it.
   */
  private positionPlane(
    plane: Mesh,
    sliceIndex: number,
    axis: 'x' | 'y' | 'z'
  ): void {
    const offset = 0.01;

    switch (axis) {
      case 'x':
        plane.rotation.y = Math.PI / 2;

        plane.position.x = sliceIndex - offset;

        plane.position.y = this.dimensions.depth / 2;
        plane.position.z = this.dimensions.height / 2;
        break;

      case 'y':
        plane.rotation.x = 0;
        plane.rotation.y = 0;
        plane.rotation.z = 0;

        plane.position.z = sliceIndex - offset;

        plane.position.x = this.dimensions.width / 2;
        plane.position.y = this.dimensions.depth / 2;
        break;

      case 'z':
        plane.rotation.x = Math.PI / 2;

        plane.position.y = sliceIndex - offset;

        plane.position.x = this.dimensions.width / 2;
        plane.position.z = this.dimensions.height / 2;
        break;
    }
  }

  /**
   * One line per pair of planes, spanning the build volume. Colors blend the two planes' colors.
   */
  private createIntersectionLines(activeLayers: LayerState): void {
    this.disposeIntersectionLines();

    const offset = 0.01;

    this.createIntersectionLine(
      activeLayers.x - offset,
      activeLayers.y - offset,
      'xy',
      this.dimensions.depth,
      '#9b59b6'
    );

    this.createIntersectionLine(
      activeLayers.x - offset,
      activeLayers.z - offset,
      'xz',
      this.dimensions.height,
      '#f39c12'
    );

    this.createIntersectionLine(
      activeLayers.y - offset,
      activeLayers.z - offset,
      'yz',
      this.dimensions.width,
      '#16a085'
    );
  }

  /**
   * coord1 and coord2 are the two model layers the line sits at, in the order the type names them
   */
  private createIntersectionLine(
    coord1: number,
    coord2: number,
    type: 'xy' | 'xz' | 'yz',
    length: number,
    color: string
  ): void {
    let points: Vector3[] = [];

    switch (type) {
      case 'xy':
        points = [
          new Vector3(coord1, 0, coord2),
          new Vector3(coord1, length, coord2),
        ];
        break;

      case 'xz':
        points = [
          new Vector3(coord1, coord2, 0),
          new Vector3(coord1, coord2, length),
        ];
        break;

      case 'yz':
        points = [
          new Vector3(0, coord2, coord1),
          new Vector3(length, coord2, coord1),
        ];
        break;
    }

    const line = MeshBuilder.CreateLines(
      `intersection_${type}_${coord1}_${coord2}`,
      { points },
      this.scene
    );

    line.color = hexToColor3(color);
    line.alpha = 0.5;

    this.intersectionLines.push(line);
  }

  private disposeIntersectionLines(): void {
    for (const line of this.intersectionLines) {
      line.dispose();
    }
    this.intersectionLines = [];
  }

  /**
   * Rebuilds only the plane whose layer moved, then every intersection line
   */
  private handleLayerChanged(dimension: 'x' | 'y' | 'z', layer: number): void {
    const activeLayers = editorState.getActiveLayers();
    const visibility = editorState.getSliceGuideVisibility();

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

    this.disposeIntersectionLines();
    this.createIntersectionLines(activeLayers);
  }

  private disposePlane(plane: Mesh | null): void {
    if (!plane) return;
    plane.dispose();
  }

  private setPlaneVisibility(plane: Mesh | null, visible: boolean): void {
    if (!plane) return;
    plane.setEnabled(visible);
  }
}
