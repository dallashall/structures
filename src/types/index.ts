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

// Layout modes for editor
export type LayoutMode = 'tabbed' | 'quad';

// Orthographic view types with perspectives (front/back, left/right, top/bottom)
export type ViewType = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

// Painting modes
export type PaintMode = 'point' | 'fill' | 'outline';

// Painting behaviors (especially for fill mode)
export type PaintBehavior = 'normal' | 'only-replace' | 'selective-replace';

// Tool types (simplified for initial implementation)
export type ToolType = 'paint' | 'erase';

// Layer state for all three dimensions
export interface LayerState {
  x: number; // Active X layer (for Left/Right view)
  y: number; // Active Y layer (for Top/Bottom view)
  z: number; // Active Z layer (for Front/Back view)
}

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
  blockCount: number;
  thumbnail: string; // Base64 data URL
}

export interface EditorState {
  layoutMode: LayoutMode;
  activeView: ViewType;
  activeLayers: LayerState;
  selectedBlockId: string | null;
  activeTool: ToolType;
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  quickSelectSlots: (string | null)[]; // 5 slots for quick-select palette
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
