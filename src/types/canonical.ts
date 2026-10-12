/**
 * Shapes of the block catalog (public/data/canonical-blocks.json) and of the resource pack files the build scripts read.
 * The app maps these into the editor's Block type at load.
 */

export interface BlockTextures {
  all?: string;
  top?: string;
  bottom?: string;
  north?: string;
  south?: string;
  east?: string;
  west?: string;
  /** Any horizontal face without its own entry */
  side?: string;
  /** Top and bottom of axis blocks such as logs */
  end?: string;
  /** Biome-tinted overlay, such as the grass block's */
  topOverlay?: string;
  sideOverlay?: string;
}

export interface BlockState {
  [property: string]: string | number | boolean;
}

export interface CanonicalBlock {
  displayName: string;
  category: string;
  /** Hex fill drawn when no texture renders */
  color: string;
  /** Logical texture names. A pack manifest maps them to files. */
  textures: BlockTextures;
  hasBlockState?: boolean;
  defaultState?: BlockState;
  variants?: string[];
  isCube?: boolean;
  isTransparent?: boolean;
  /** Minecraft model parent, such as "block/cube_all" */
  parentModel?: string;
  /** A face or state texture of another block. It renders where placed but never lists in the material browser. */
  hidden?: boolean;
  /** The real Minecraft block ID when this entry's ID is a texture name for it, such as grass for short_grass */
  javaId?: string;
}

/** Keyed by namespaced ID, such as "minecraft:oak_log" */
export interface CanonicalBlocks {
  [blockId: string]: CanonicalBlock;
}

/** resource-packs/<pack>/pack-manifest.json */
export interface PackManifest {
  packId: string;
  packName: string;
  version: string;
  /** Texture edge in pixels: 16, 32, 64, and so on */
  resolution: number;
  /** Relative to the extracted pack root */
  textureBasePath: string;
  textureMappings: {
    [logicalName: string]: string;
  };
  variants?: {
    [blockId: string]: string[];
  };
  fallbacks: {
    missing: string;
  };
  /** From pack.mcmeta */
  packFormat?: number;
  supportedFormats?: [number, number];
}

/** A resource pack's blockstates/*.json */
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

/** A resource pack's models/*.json */
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

/** pack.mcmeta */
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
