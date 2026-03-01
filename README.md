# Minecraft Magic Blueprint System

A web-based 2D/3D editor for designing Minecraft structures using a pixel-art style interface.

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Documentation

- **[PROJECT.md](./PROJECT.md)** - Complete project specification and architecture
- **[CLAUDE.md](./CLAUDE.md)** - Coding standards and development guidelines
- **[MACRO_COMPONENTS.md](./MACRO_COMPONENTS.md)** - System architecture and component overview

## Project Structure

```
src/
├── components/     # Dumb rendering components (one per file)
├── hocs/          # Higher-order components for state management
├── core/          # Singleton classes (business logic)
├── types/         # TypeScript type definitions
├── utils/         # Pure utility functions
├── views/         # Top-level view components
├── App.tsx        # Root application component
└── main.tsx       # Application entry point
```

## Technology Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React** - UI component framework
- **react-spectrum** - Adobe's design system
- **HTML Canvas** - 2D pixel editor rendering
- **BabylonJS** - 3D visualization

## Development Guidelines

### Architectural Principles

1. **Business logic in singleton classes** outside React render cycle
2. **HOCs for state management** to decouple logic from rendering
3. **No inline callbacks** - all functions must be named
4. **One component per file** - strict rule, no exceptions
5. **350 line limit** for React components
6. **Minimal React hooks** - only from external libraries, only in HOCs

### Example: Named Callbacks

```typescript
// ❌ WRONG
items.map((item) => item.name)

// ✅ CORRECT
const getName = (item: Item) => item.name;
items.map(getName)
```

See [CLAUDE.md](./CLAUDE.md) for complete coding standards.

## Next Steps

The project is bootstrapped and ready for development. To continue:

1. Implement core singleton classes:
   - `ProjectManager` - Manage project state and blocks
   - `BlockRegistry` - Catalog of Minecraft blocks
   - `EditorStateManager` - UI state management
   - `StorageManager` - localStorage persistence

2. Build HOC components:
   - `withProjectState` - Subscribe to project changes
   - `withEditorState` - Subscribe to editor state changes
   - `withBlockRegistry` - Provide block catalog data

3. Create UI components and views:
   - `EditorView` - Main application container
   - `Canvas2DView` - 2D pixel editor
   - `Preview3DView` - BabylonJS 3D preview
   - `MaterialPalette` - Block selection UI

See [MACRO_COMPONENTS.md](./MACRO_COMPONENTS.md) for the complete component architecture.
