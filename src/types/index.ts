import type { BlockIndex } from "../core/BlockIndex";

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

// Directions name the app's own axes (Z up), not Minecraft compass names
export type AxisDirection = `${'x' | 'y' | 'z'}${'+' | '-'}`;
export type HorizontalDirection = `${'x' | 'y'}${'+' | '-'}`;

export type LayoutMode = "tabbed" | "quad";

export type ViewType = "front" | "back" | "left" | "right" | "top" | "bottom";

export type PaintMode =
  | "point"
  | "fill"
  | "outline"
  | "circle"
  | "arch"
  | "curve";

export type PaintBehavior =
  | "normal"
  | "only-replace"
  | "selective-replace"
  | "delete";

export type ShapeFillMode = "outline" | "filled";

export type LightingPreset = "day" | "night" | "cloudy";

// color: flat clearColor. skybox: environment texture. ground: environment texture projected onto a floor.
export type BackgroundMode = "color" | "skybox" | "ground";

// until-collision stops a stroke's depth at the first existing block
export type DepthPaintMode = "through" | "until-collision";

export interface DepthConfig {
  enabled: boolean;
  thickness: number; // 1-10 layers along the view's depth axis
  mode: DepthPaintMode;
}

// Shift keeps a shape's sides equal and turns a point click into a line. Alt draws a shape from its center.
export interface HeldModifiers {
  shift: boolean;
  alt: boolean;
}

export type ToolType = "paint" | "erase";

// The layer each 2D view draws on. Left/Right fix X, Front/Back fix Y, Top/Bottom fix Z.
export interface LayerState {
  x: number;
  y: number;
  z: number;
}

// Minecraft blockstate properties, with directions in the app's axes
export interface BlockStateProperties {
  facing?: AxisDirection;
  axis?: "x" | "y" | "z";

  half?: "upper" | "lower" | "top" | "bottom";
  // Stair shape in absolute axes: straight_{facing} or {inner|outer}_{facing}_{cornerSide},
  // such as "straight_x+", "outer_y+_x-", "inner_y-_x+"
  shape?: string;

  // Fences, walls, and glass panes
  connections?: Partial<Record<AxisDirection, boolean>>;

  waterlogged?: boolean;
  lit?: boolean;
  powered?: boolean;
  open?: boolean;

  age?: number; // crops: 0-7
  level?: number; // water: 0-15
  rotation?: number; // 0-15

  variant?: string; // 'oak', 'spruce', 'birch', etc.

  // Slab type (distinct from half — slabs use 'type', stairs/doors use 'half')
  type?: 'top' | 'bottom' | 'double';

  hinge?: 'left' | 'right';
}

// Face names follow Minecraft, so the axis notes use Minecraft's Y-up axes
export interface TextureFaceMap {
  all?: string;
  top?: string; // Y+ face
  bottom?: string; // Y- face
  side?: string; // X+, X-, Z+, Z- faces
  north?: string; // Z- face
  south?: string; // Z+ face
  east?: string; // X+ face
  west?: string; // X- face
  front?: string; // Follows the block's facing
  back?: string;
}

export interface BlockVariant {
  id: string; // e.g. 'oak_stairs_facing_north'
  name: string;
  stateProperties: BlockStateProperties; // The state this variant renders
  textures: TextureFaceMap;
}

export interface LoadedTexture {
  id: string;
  path: string;
  image: HTMLImageElement;
  babylonTexture?: any;
  width: number;
  height: number;
  loaded: boolean;
  error?: string;
}

// Written by scripts/buildTextureAtlas.ts into public/atlas.json
export interface AtlasMetadata {
  atlasSize: number;
  textureSize: number;
  textureCount: number;
  textureMap: Record<string, { x: number; y: number; u: number; v: number }>;
  blockFaceUV: Record<
    string,
    {
      faceUV: Array<{ u0: number; v0: number; u1: number; v1: number }>;
      faceOrder: string[];
    }
  >;
  blockFaceUV3D: Record<
    string,
    {
      faceUV: Array<{ u0: number; v0: number; u1: number; v1: number }>;
      faceOrder: string[];
    }
  >;
}

export interface Block {
  id: string; // Namespaced Minecraft ID, such as 'minecraft:stone'
  name: string;
  category: string;
  color: string; // Hex fill drawn when no texture renders

  javaId?: string;
  bedrockId?: string;

  textures?: TextureFaceMap;

  hasBlockState: boolean;
  variants?: BlockVariant[];
  defaultState?: BlockStateProperties;

  isCube: boolean;
  isTransparent: boolean;
  hidden?: boolean; // A face or state texture of another block. Renders where placed, never listed for picking.
}

export interface BlockData {
  position: Vector3D;
  blockType: string; // A Block.id
  blockState?: BlockStateProperties;
}

export interface MetaBlock {
  position: Vector3D;
  direction: HorizontalDirection;
  isConfirmed: boolean;
}

// The model joined with its metadata, as the editor UI reads it
export interface Project {
  id: string;
  name: string;
  created: Date;
  modified: Date;
  dimensions: Dimensions;
  metaBlock: MetaBlock;
  blocks: BlockIndex;
}

// One project-browser card, derived from the event log
export interface StorageMetadata {
  id: string;
  name: string;
  created: Date;
  modified: Date;
  dimensions: Dimensions;
  blockCount: number;
  thumbnail: string; // JPEG data URL, or empty before the first capture
}

export interface PBRPreset {
  metallic: number;
  roughness: number;
  environmentIntensity: number;
}

// Stored per project in RenderSettingsStore
export interface RenderSettings {
  fxaaEnabled: boolean;
  msaaSamples: number;

  pbrEnabled: boolean;

  environmentIntensity: number;

  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowDarkness: number;

  ssaoEnabled: boolean;
  ssaoRadius: number;
  ssaoIntensity: number;
  ssaoSamples: number;

  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;

  toneMapping: boolean;
  contrast: number;
  exposure: number;

  layerHighlightEnabled: boolean;

  lightingPreset: LightingPreset;

  backgroundMode: BackgroundMode;

  showFrameStats: boolean;
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  fxaaEnabled: false,
  msaaSamples: 4,
  pbrEnabled: true,
  environmentIntensity: 0.5,
  shadowsEnabled: true,
  shadowMapSize: 1024,
  shadowDarkness: 0.5,
  ssaoEnabled: true,
  ssaoRadius: 2.0,
  ssaoIntensity: 1.0,
  ssaoSamples: 16,
  bloomEnabled: true,
  bloomIntensity: 0.25,
  bloomThreshold: 0.3,
  toneMapping: true,
  contrast: 1.1,
  exposure: 1.0,
  layerHighlightEnabled: false,
  lightingPreset: "night",
  backgroundMode: "skybox",
  showFrameStats: false,
};

export type EventHandler<T = any> = (...args: T[]) => void;
