/**
 * Type definitions for canonical block system and resource pack management
 */

/**
 * Texture face mapping for blocks
 * Supports both simple (all faces) and complex (per-face) textures
 */
export interface BlockTextures {
  /** Single texture for all faces (simple blocks like stone) */
  all?: string;
  /** Texture for top face */
  top?: string;
  /** Texture for bottom face */
  bottom?: string;
  /** Texture for north face */
  north?: string;
  /** Texture for south face */
  south?: string;
  /** Texture for east face */
  east?: string;
  /** Texture for west face */
  west?: string;
  /** Texture for side faces (used if specific directions not defined) */
  side?: string;
  /** Texture for end faces (top/bottom for logs) */
  end?: string;
  /** Overlay texture for top face (biome-tinted, e.g., grass_block_top overlay) */
  topOverlay?: string;
  /** Overlay texture for side faces (biome-tinted, e.g., grass_block_side_overlay) */
  sideOverlay?: string;
}

/**
 * Block state properties (e.g., axis for logs, facing for directional blocks)
 */
export interface BlockState {
  [property: string]: string | number | boolean;
}

/**
 * Canonical block definition using Minecraft namespace IDs
 */
export interface CanonicalBlock {
  /** Display name for UI */
  displayName: string;
  /** Block category (stone, wood, glass, etc.) */
  category: string;
  /** Fallback color for rendering (hex string) */
  color: string;
  /** Logical texture names mapped to face positions */
  textures: BlockTextures;
  /** Whether this block has blockstate variants */
  hasBlockState?: boolean;
  /** Default blockstate properties */
  defaultState?: BlockState;
  /** Array of texture variant names for random selection */
  variants?: string[];
  /** Whether the block is a simple cube */
  isCube?: boolean;
  /** Whether the block is transparent (glass, leaves, etc.) */
  isTransparent?: boolean;
  /** Parent model reference (e.g., "block/cube_all") */
  parentModel?: string;
  /** A face or state texture of another block. It renders where placed but never lists in the material browser. */
  hidden?: boolean;
}

/**
 * Collection of canonical blocks indexed by Minecraft namespace ID
 * Example key: "minecraft:stone", "minecraft:oak_log"
 */
export interface CanonicalBlocks {
  [blockId: string]: CanonicalBlock;
}

/**
 * Resource pack manifest describing texture mappings
 */
export interface PackManifest {
  /** Unique pack identifier (e.g., "squareful", "excaliber") */
  packId: string;
  /** Display name of the pack */
  packName: string;
  /** Pack version string */
  version: string;
  /** Texture resolution in pixels (16, 32, 64, etc.) */
  resolution: number;
  /** Base path to texture files relative to pack root */
  textureBasePath: string;
  /** Maps logical texture names to actual filenames */
  textureMappings: {
    [logicalName: string]: string;
  };
  /** Maps block IDs to variant texture arrays */
  variants?: {
    [blockId: string]: string[];
  };
  /** Fallback textures for missing blocks */
  fallbacks: {
    missing: string;
  };
  /** Pack format version from pack.mcmeta */
  packFormat?: number;
  /** Supported format range */
  supportedFormats?: [number, number];
}

/**
 * Blockstate JSON structure from resource pack
 */
export interface BlockstateVariant {
  model: string;
  x?: number;
  y?: number;
  z?: number;
  uvlock?: boolean;
  weight?: number;
}

export interface BlockstateDefinition {
  variants?: {
    [variant: string]: BlockstateVariant | BlockstateVariant[];
  };
  multipart?: Array<{
    when?: Record<string, string | string[]>;
    apply: BlockstateVariant | BlockstateVariant[];
  }>;
}

/**
 * Model JSON structure from resource pack
 */
export interface ModelDefinition {
  parent?: string;
  textures?: {
    [key: string]: string;
  };
  elements?: Array<{
    from: [number, number, number];
    to: [number, number, number];
    faces?: {
      [face: string]: {
        texture: string;
        uv?: [number, number, number, number];
        cullface?: string;
      };
    };
  }>;
}

/**
 * Pack metadata from pack.mcmeta
 */
export interface PackMetadata {
  pack: {
    pack_format: number;
    description: string;
    supported_formats?: [number, number];
  };
  overlays?: {
    entries: Array<{
      formats: [number, number];
      directory: string;
    }>;
  };
}
