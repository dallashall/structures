# Rendering Module

The Babylon.js modules behind the 3D view. `Babylon3D` (`src/core/Babylon3D.ts`) is the singleton that owns the engine and scene. It creates these modules in `attach(canvas)` and disposes them in `detach()`.

## Rules

- Each file handles one rendering concern.
- Babylon3D composes modules. No module subclasses another.
- Modules take the `Scene` and their configuration as constructor or function arguments.
- Stateless setup lives in plain functions (`setupShadows`, `applyLightingPreset`). Modules that hold meshes or lights are classes with a `destroy()` or `dispose()` method.

## Modules

| File | Kind | Job |
|---|---|---|
| `BlockRenderer.ts` | class | Committed blocks as instanced meshes. One hidden base mesh per block type and geometry key. Per-instance color buffers dim blocks outside the active layer. |
| `PreviewRenderer.ts` | class | Translucent preview meshes from EditorState hover previews and DraftingService drafts. Diffs against the previous frame. Delete mode tints previews red. |
| `MaterialResolver.ts` | class | Picks a material per block: tinted texture, then atlas texture, then flat color. Caches standard, PBR, ghost, and delete variants. |
| `GeometryFactory.ts` | functions | Slab, stair, and box-model meshes with transforms baked into vertices, so they work as instance bases. A box model (`src/core/shapes/BoxModel.ts`) projects each face's UVs from the full cube, so a box smaller than the cell shows the matching part of the texture. |
| `GrowAnimator.ts` | class | Scales block instances in and out on a stagger. One `onBeforeRender` observer drives every tween. |
| `CameraRig.ts` | class | Turntable camera: frame, orbit, pan, zoom, preset views. The only code path that moves the camera. |
| `CameraGestures.ts` | class | Maps pointer, wheel, and key input on the 3D canvas to CameraRig moves. |
| `SlicePlaneVisualizer.ts` | class | One translucent plane per axis at the active 2D slice. Listens for `layer:adjusted`. |
| `SceneSetup.ts` | functions | Hemisphere and directional lights, axes. |
| `LightingPresets.ts` | functions | Day, night, and cloudy presets for lights, clear color, environment intensity, and emissive scale. |
| `SkyPresets.ts` | data | Sky colors and sun direction per preset. `scripts/generateEnvironments.ts` imports it in Node, so it must stay data-only. |
| `EnvironmentSetup.ts` | functions | Loads the baked environment texture for a preset (`public/environment/<preset>.env`). PBR metals render black without it. |
| `BackdropRenderer.ts` | class | Background mode: plain color, skybox, or ground-projected sky. |
| `ShadowSetup.ts` | functions | Shadow generator on the directional light and a shadow-receiving ground plane. |
| `EmissiveLighting.ts` | class | Point lights at luminous blocks. Each fades linearly to zero at the block's Minecraft light level, so overlapping lights stay bounded. |
| `PBRCategoryMap.ts` | functions | Classifies blocks by name into metallic and roughness presets. |
| `PostProcessingSetup.ts` | functions | SSAO, bloom, and tone mapping pipelines. |
| `ThumbnailCapture.ts` | class | Poses the view camera at a fixed framing, renders one frame, and crops it to a small JPEG for the project card. It never switches `scene.activeCamera`, because that breaks the SSAO prepass. Needs the engine's `preserveDrawingBuffer`. |
| `babylonUtils.ts` | functions | Coordinate conversion, color parsing, position keys. |

Babylon3D subscribes to projection, DraftingService, EditorState, and TextureResolver notifications. It forwards them to the modules. `SlicePlaneVisualizer` is the one module that subscribes to EditorState itself.

## Coordinate system

The model is Z-up and right-handed. X and Y are horizontal and Z is vertical. Babylon.js is Y-up and left-handed.

`toBabylonVector` in `babylonUtils.ts` maps model `(x, y, z)` to Babylon `(x, z, y)` with no negation. Every module converts through it.

The bounds check in `src/reducers/modelReducer.ts` pairs X with `dimensions.width`, Y with `dimensions.height`, and Z with `dimensions.depth`. So `depth` is the vertical extent. The new-project dialog labels follow the same fields, so "Height" sets the front-to-back size and "Depth" sets the vertical size.

## Texture atlas

The atlas files are `public/atlas.png` and `public/atlas.json`. Git ignores both.

- `scripts/setupTextures.ts` downloads the Squareful pack version pinned in `resource-packs/squareful/pack-source.json`, checks its SHA-512, and extracts the block textures into `.cache/packs/squareful/`. It then runs `scripts/buildTextureAtlas.ts`. `npm run dev` and `npm run build` run it when the atlas is missing.
- `scripts/buildTextureAtlas.ts` stitches 16x16 textures into one square atlas and writes UV coordinates per block face.

`TextureResolver` (`src/core/TextureResolver.ts`) fetches both files at startup. Its `getAtlasStatus()` returns `loading`, `ready`, or `missing`. When the fetch fails, every view draws blocks in the flat colors from the block catalog.

### Face UVs

`atlas.json` holds two UV tables per block. Both use the face order front, back, right, left, top, bottom, which is the `CreateBox` face order.

- `blockFaceUV` points at the untransformed textures. Canvas2D and swatches use it.
- `blockFaceUV3D` points at pre-transformed copies. `CreateBox` gives each face its own default UV orientation, so untransformed textures appear rotated or flipped on some faces.

The atlas builder adds three variants of each texture for the 3D table:

| 3D face | Texture | Variant |
|---|---|---|
| 0 front (+Z) | front | `_hflip` |
| 1 back (-Z) | back | none, with the V range reversed |
| 2 right (+X) | left | `_rotated90ccw_vflip` |
| 3 left (-X) | right | `_rotated90ccw_vflip` |
| 4 top (+Y) | top | `_rotated90ccw` |
| 5 bottom (-Y) | bottom | none |

Faces 2 and 3 take the opposite side's texture. Base meshes bake these UVs into their geometry, so an atlas change rebuilds the meshes.

## Adding a module

1. Create a file in `src/core/rendering/`.
2. Take the `Scene` and configuration as arguments.
3. Give a class module a `destroy()` method that disposes its Babylon resources.
4. Let Babylon3D create it in `attach()`, call it from its notification handlers, and destroy it in `detach()`.
5. Subscribe to singleton notifications inside the module only when Babylon3D has no reason to see them. Unsubscribe in `destroy()`.
