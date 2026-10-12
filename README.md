# Structures

A web-based 2D/3D editor for designing Minecraft structures using a pixel-art style interface.

## Quick Start

```bash
npm install
npm run dev
```

The first `npm run dev` or `npm run build` downloads the block textures (about 7 MB). See [Textures](#textures).

```bash
npm run build        # Production build into dist/
npm run type-check   # Type check only
npm test             # Unit tests
```

## Textures

Block textures come from the [Squareful](https://modrinth.com/resourcepack/xekrsquarepattern) resource pack by XeKr, licensed [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). The repo holds no copy of the pack.

`scripts/setupTextures.ts` runs before `dev` and `build` when `public/atlas.png` or `public/atlas.json` is missing. It:

1. Downloads the exact version pinned in `resource-packs/squareful/pack-source.json` from Modrinth.
2. Checks the file against the SHA-512 in that pin.
3. Extracts the block textures into `.cache/packs/squareful/`.
4. Builds `public/atlas.png` and `public/atlas.json`.

The app still runs when the download fails or the machine is offline. Blocks show flat colors, and the welcome screen shows a notice. Retry with:

```bash
npm run setup:textures
```

`setup:textures` always rebuilds. `build:atlas` rebuilds the atlas from the extracted pack without downloading it.

## Deploying

The app is a static site. The `Dockerfile` builds it and serves `dist/` with nginx on port 80.

On Coolify, choose the Dockerfile build pack and expose port 80. The image build sets `TEXTURES_REQUIRED=1`, so it fails when the texture download fails. A deploy never ships without textures.

Projects live in each visitor's browser (IndexedDB) under the site's domain. Moving the site to a different domain leaves existing projects behind. Visitors can carry a project across with Save (toolbar) and Load from File (welcome screen).

## Licensing

The code is MIT licensed. See [LICENSE](./LICENSE).

The textures keep their own CC BY-NC-ND 4.0 license. A public deployment must stay non-commercial and keep the credits dialog, which names the author, the license, and the source. The in-app Credits dialog also lists fonts and libraries.

## Documentation

- [PROJECT.md](./PROJECT.md) - Project specification and data model
- [UX_DECISIONS.md](./UX_DECISIONS.md) - Interaction decisions and keyboard shortcuts
- [MACRO_COMPONENTS.md](./MACRO_COMPONENTS.md) - Singletons, HOCs, and components
- [CLAUDE.md](./CLAUDE.md) - Coding standards and architectural rules
- [TESTING.md](./TESTING.md) - Manual test plan

## Project Structure

```
src/
├── commands/      # Commands that validate a request and append events
├── components/    # Rendering components, one per file
├── config/        # Static configuration (credits)
├── core/          # Singletons: event log, editor state, tools, 2D and 3D rendering
├── hocs/          # Higher-order components that subscribe to singletons
├── layouts/       # Toolbar, tabbed layout, quad layout
├── panels/        # 2D canvas and 3D view panels
├── preview/       # Component preview pages
├── projections/   # Read models replayed from the event log
├── reducers/      # Pure functions that fold events into state
├── types/         # TypeScript type definitions
├── utils/         # Pure helper functions
├── views/         # Welcome screen and editor views
├── App.tsx        # Root component
└── main.tsx       # Entry point
scripts/           # Texture download, atlas build, catalog checks
resource-packs/    # Texture pack pin and manifest
public/data/       # Block catalog and the Java-to-Bedrock block table
```

## Technology Stack

- TypeScript, React 18, Vite 6
- MUI 7
- dnd kit (drag and drop) and react-window (windowed lists)
- HTML Canvas for the 2D views
- Babylon.js 7 for the 3D view
- IndexedDB for projects, thumbnails, and preferences
- Vitest, jsdom, and fake-indexeddb for tests

## Development Guidelines

1. Business logic lives in singleton classes outside the React render cycle.
2. HOCs subscribe to singletons and pass state to components as props.
3. Callbacks are named functions. No inline anonymous callbacks.
4. Each file holds one component.
5. Components stay under 350 lines.
6. React hooks appear only in HOCs.
7. Event names are specific (`block:placed`, not `project:changed`).

```typescript
// Wrong
items.map((item) => item.name)

// Right
const getName = (item: Item) => item.name;
items.map(getName)
```

See [CLAUDE.md](./CLAUDE.md) for the full coding standards.
