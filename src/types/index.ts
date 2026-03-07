/**
 * Core type definitions for the Structures editor
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
export type PaintMode = 'point' | 'fill' | 'outline' | 'circle' | 'arch' | 'curve';

// Painting behaviors (especially for fill mode)
export type PaintBehavior = 'normal' | 'only-replace' | 'selective-replace';

// Shape fill modes (separate from paint behavior)
export type ShapeFillMode = 'outline' | 'filled';

// Depth painting modes
export type DepthPaintMode = 'through' | 'until-collision';

// Depth configuration for painting through multiple layers
export interface DepthConfig {
  enabled: boolean;
  thickness: number; // 1-10 layers
  mode: DepthPaintMode;
}

// Circle drawing modes (for modifier keys)
export type CircleDrawMode = 'center-radius' | 'bounding-box' | 'constrained-box';

// Curve control state for bezier curve manipulation
export interface CurveControlState {
  controlPoint1: { x: number; y: number }; // Grid coordinates
  controlPoint2: { x: number; y: number };
}

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
  isConfirmed: boolean; // Whether the user has finalized this position
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

// Re-export event types for event sourcing
export type {
  BaseEvent,
  ProjectEvent,
  ProjectCreatedEvent,
  BlockPlacedEvent,
  BlockRemovedEvent,
  MetaBlockPlacedEvent,
  MetaBlockConfirmedEvent,
  DimensionExpandedEvent,
  DimensionShrunkEvent,
  ProjectRenamedEvent,
  CompoundEvent,
  ProjectDataEvent,
  Snapshot,
  VersionPointer,
} from '../events/types';
