/**
 * Event type definitions for event-sourced architecture
 *
 * Events represent immutable facts about what happened in the system.
 * State is derived by reducing these events through pure reducer functions.
 */

import type { Vector3D, Dimensions, BlockData, BlockStateProperties } from '../types';

/**
 * Base event interface - all events extend this
 */
export interface BaseEvent {
  type: string;              // Event type discriminator
  eventId: string;           // Unique event ID (UUID)
  timestamp: number;         // Unix timestamp in milliseconds
  sessionId: string;         // Session identifier for multi-device sync (future)
}

/**
 * Project event - events that affect project data
 */
export interface ProjectEvent extends BaseEvent {
  projectId: string;         // Which project this event belongs to
  version: number;           // Event version (position in journal)
}

// ============ TIER 1: PROJECT DATA EVENTS (need undo/redo, persisted) ============

/**
 * Project created event
 */
export interface ProjectCreatedEvent extends ProjectEvent {
  type: 'project:created';
  payload: {
    name: string;
    dimensions: Dimensions;
  };
}

/**
 * Block placed event
 */
export interface BlockPlacedEvent extends ProjectEvent {
  type: 'block:placed';
  payload: {
    position: Vector3D;
    blockType: string;
    blockState?: BlockStateProperties;  // Optional blockstate
    previousBlockType?: string; // For undo - what was there before
    previousBlockState?: BlockStateProperties;  // For undo
  };
}

/**
 * Block removed event
 */
export interface BlockRemovedEvent extends ProjectEvent {
  type: 'block:removed';
  payload: {
    position: Vector3D;
    blockType: string;         // Store removed block for undo
    blockState?: BlockStateProperties;  // Store for undo
  };
}

/**
 * Meta block placed/moved event
 */
export interface MetaBlockPlacedEvent extends ProjectEvent {
  type: 'metablock:placed';
  payload: {
    position: Vector3D;
    previousPosition: Vector3D; // For undo
  };
}

/**
 * Meta block confirmed event (finalized placement)
 */
export interface MetaBlockConfirmedEvent extends ProjectEvent {
  type: 'metablock:confirmed';
  payload: {
    position: Vector3D;
  };
}

/**
 * Dimension expanded event
 */
export interface DimensionExpandedEvent extends ProjectEvent {
  type: 'dimension:expanded';
  payload: {
    direction: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';
    previousDimensions: Dimensions;
    newDimensions: Dimensions;
    shift: Vector3D;           // Block shift amount (for undo)
  };
}

/**
 * Dimension shrunk event
 */
export interface DimensionShrunkEvent extends ProjectEvent {
  type: 'dimension:shrunk';
  payload: {
    direction: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';
    previousDimensions: Dimensions;
    newDimensions: Dimensions;
    shift: Vector3D;
    removedBlocks: BlockData[]; // Store removed blocks for undo
  };
}

/**
 * Project renamed event
 */
export interface ProjectRenamedEvent extends ProjectEvent {
  type: 'project:renamed';
  payload: {
    previousName: string;
    newName: string;
  };
}

/**
 * Compound event - groups multiple events as atomic operation
 * Used for bulk operations like shape fills
 */
export interface CompoundEvent extends ProjectEvent {
  type: 'compound';
  events: ProjectDataEvent[];    // Child events executed atomically
  metadata: {
    description: string;         // Human-readable description (e.g., "Fill 127 blocks")
    category: 'shape' | 'bulk-edit' | 'dimension-shift';
  };
}

// ============ UNION TYPES ============

/**
 * Union of all project data events (for discriminated union pattern)
 */
export type ProjectDataEvent =
  | ProjectCreatedEvent
  | BlockPlacedEvent
  | BlockRemovedEvent
  | MetaBlockPlacedEvent
  | MetaBlockConfirmedEvent
  | DimensionExpandedEvent
  | DimensionShrunkEvent
  | ProjectRenamedEvent
  | CompoundEvent;

/**
 * Snapshot - point-in-time state capture for replay optimization
 */
export interface Snapshot {
  projectId: string;
  version: number;        // Event version at snapshot
  state: any;             // Fully reduced state (Project object)
  timestamp: number;
}

/**
 * Version pointer for undo/redo tracking
 */
export interface VersionPointer {
  currentVersion: number;  // Where we are in history
  headVersion: number;     // Latest event version
}
