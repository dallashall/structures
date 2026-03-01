/**
 * Core type definitions for the Minecraft Magic Blueprint System
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export type Direction = 'north' | 'south' | 'east' | 'west';

export type ViewType = 'front' | 'side' | 'back';

export type ToolType = 'paint' | 'erase' | 'eyedropper' | 'fill';

export interface Block {
  id: string;
  name: string;
  category: string;
  color: string; // Hex color for 2D rendering
  textureRef?: string; // Reference to texture for 3D rendering
}

export interface BlockData {
  position: Vector3D;
  blockType: string; // References Block.id
}

export interface MetaBlock {
  position: Vector3D;
  direction: Direction;
}

export interface Project {
  id: string;
  name: string;
  dimensions: Dimensions;
  metaBlock: MetaBlock;
  blocks: Map<string, BlockData>; // Key format: "x,y,z"
  created: Date;
  modified: Date;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  created: Date;
  modified: Date;
  dimensions: Dimensions;
}

export interface EditorState {
  activeView: ViewType;
  activeLayer: number;
  selectedBlockId: string | null;
  activeTool: ToolType;
  is3DMode: boolean;
}

export interface CameraState {
  position: Vector3D;
  target: Vector3D;
  zoom: number;
}

export interface ExportConfig {
  format: 'json' | 'nbt';
  filename: string;
  includeMetadata: boolean;
}

// Utility type for event handlers
export type EventHandler<T = any> = (...args: T[]) => void;
