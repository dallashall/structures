# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (Vite + HMR)
npm run dev

# Type check without building
npm run type-check

# Build for production (includes type checking)
npm run build

# Preview production build
npm run preview
```

## Project Documentation

This project has extensive documentation:
- **[CLAUDE.md](./CLAUDE.md)** (this file) - Coding standards and architectural rules
- **[PROJECT.md](./PROJECT.md)** - Complete project specification and requirements
- **[MACRO_COMPONENTS.md](./MACRO_COMPONENTS.md)** - Detailed component architecture, data flow, and singleton specifications
- **[README.md](./README.md)** - Quick start guide

When implementing new features, consult MACRO_COMPONENTS.md for detailed specifications of singletons, HOCs, and components.

## Project State

This is an early-stage project. Currently implemented:
- Project structure and build configuration
- Type definitions (`src/types/index.ts`)
- EventEmitter base class (`src/core/EventEmitter.ts`)
- Bootstrap App component

Still to implement (see MACRO_COMPONENTS.md for full specifications):
- All core singleton classes (ProjectManager, BlockRegistry, EditorStateManager, etc.)
- All HOC components (withProjectState, withEditorState, etc.)
- All UI components and views
- Canvas2D and BabylonJS rendering

---

# Development Guidelines for Minecraft Magic Blueprint System

## Architectural Principles

This project follows strict architectural patterns to ensure maintainability, testability, and clear separation of concerns.

### Core Principle: Separation of Logic and Rendering

**Business logic lives in singleton classes, rendering lives in React components.**

```
Business Logic (Singletons) → Events → HOCs → Props → Components (Rendering)
```

- **Singletons**: Manage state, execute business logic, emit change events
- **HOCs**: Subscribe to singleton events, pass data as props to wrapped components
- **Components**: Pure rendering based on props, invoke singleton methods via callbacks

### UI Component Selection Priority

When building UI components, follow this priority order:

1. **First: Use Material-UI (MUI) components** - Always check MUI documentation first
   - See commonly used components list below
   - Documentation: https://mui.com/material-ui/
   - MUI v6 is installed in this project

2. **Second: Compose MUI components** - Build custom components by composing existing MUI components

3. **Third: Use custom components** - Use our custom components (ColorSwatch, NumberField, ActionGroup, etc.)

4. **Last Resort: Build new custom components** - Only when no suitable MUI or custom component exists

**Why Material-UI?**
- ✓ Industry-standard React component library
- ✓ Built-in accessibility (ARIA, keyboard navigation)
- ✓ Material Design 3 support
- ✓ Comprehensive theming system
- ✓ Excellent TypeScript support
- ✓ Large ecosystem and community
- ✓ Responsive behavior built-in

**Custom Components (Project-Specific):**

The following custom components have been created for this project:

- **ColorSwatch** (`src/components/ColorSwatch.tsx`) - Display color squares for block colors
- **NumberField** (`src/components/NumberField.tsx`) - Numeric input with increment/decrement buttons
- **ActionGroup** (`src/components/ActionGroup.tsx`) - Button group with selection state (uses MUI ToggleButtonGroup)
- **Form** (`src/components/Form.tsx`) - Form container with consistent spacing
- **DialogTrigger** (`src/components/DialogTrigger.tsx`) - Pattern for triggering dialogs/popovers

Use these custom components when needed instead of recreating similar functionality.

**Commonly Used MUI Components:**

**Layout & Containers:**
- `Box` - Generic container with `sx` prop for styling (replaces `View`)
- `Stack` - Flexbox layout with spacing (replaces `Flex`)
- `Grid` - CSS Grid layout (use for complex grids)
- `Container` - Responsive container with max-width
- `Paper` - Elevated surface with shadow
- `Card` - Content card with actions
- `Accordion` - Collapsible sections
- `Divider` - Visual separator

**Typography:**
- `Typography` - All text (headings, body, captions)
  - Variants: `h1`-`h6`, `body1`, `body2`, `caption`, `button`, `overline`

**Buttons:**
- `Button` - Standard button (variants: contained, outlined, text)
- `IconButton` - Icon-only button
- `ButtonGroup` - Group related buttons
- `ToggleButton` + `ToggleButtonGroup` - Selection buttons

**Form Inputs:**
- `TextField` - Text input (single/multi-line)
- `Select` + `MenuItem` - Dropdown selection
- `Checkbox` - Single checkbox
- `Radio` + `RadioGroup` - Radio buttons
- `Switch` - Toggle switch
- `Slider` - Value slider
- `Autocomplete` - Autocomplete input

**Feedback:**
- `Dialog` - Modal dialog
- `Snackbar` - Toast notification
- `Tooltip` - Hover tooltip
- `Alert` - Inline alert message
- `CircularProgress` / `LinearProgress` - Loading indicators
- `Skeleton` - Loading placeholder

**Navigation:**
- `Tabs` + `Tab` - Tab navigation
- `Breadcrumbs` - Navigation trail
- `Link` - Hyperlink
- `Drawer` - Side drawer
- `AppBar` - Top app bar

**Icons:**
- Import from `@mui/icons-material`
- Example: `import { Add, Save, Delete } from '@mui/icons-material';`

**MUI Lab (Additional Components):**
- `TabContext`, `TabList`, `TabPanel` - Enhanced tabs
- `LoadingButton` - Button with loading state

**Anti-patterns to avoid:**
- ❌ Custom divs with inline styles (use `Box` with `sx` prop)
- ❌ Manual implementation of common UI patterns (use MUI components)
- ❌ Hardcoded colors, spacing, or sizes (use theme tokens via `sx`)
- ❌ Custom accessibility implementations (MUI handles this)
- ❌ Re-inventing components that MUI provides
- ❌ Ignoring the custom components (ColorSwatch, NumberField, etc.)
- ❌ Using deprecated props (check MUI v6 documentation)

**MUI Styling with `sx` Prop:**

The `sx` prop is the preferred way to style MUI components. It provides:
- Direct access to theme tokens
- Responsive styling
- Pseudo-selectors
- Type safety

**Theme Tokens:**
- Spacing: `p: 2` (16px), `m: 1` (8px), `gap: 3` (24px)
- Colors: `bgcolor: 'primary.main'`, `color: 'text.secondary'`, `borderColor: 'divider'`
- Borders: `border: 1`, `borderRadius: 1`, `borderColor: 'grey.300'`
- Typography: `fontSize: 'h6.fontSize'`, `fontWeight: 'bold'`

**Example - Wrong vs Right:**

```typescript
// ❌ WRONG: Custom div with inline styles
<div style={{ padding: '16px', background: '#fafafa', border: '1px solid #e0e0e0' }}>
  <h2 style={{ fontSize: '20px' }}>Title</h2>
  <p>Content</p>
</div>

// ✓ RIGHT: MUI components with sx prop and theme tokens
<Box sx={{ p: 2, bgcolor: 'grey.50', border: 1, borderColor: 'grey.300' }}>
  <Typography variant="h5">Title</Typography>
  <Typography variant="body1">Content</Typography>
</Box>
```

**Responsive Design:**

```typescript
// MUI sx prop supports responsive values
<Box
  sx={{
    display: { xs: 'block', md: 'flex' },  // block on mobile, flex on desktop
    p: { xs: 1, sm: 2, md: 3 },            // 8px, 16px, 24px padding
  }}
>
  <Typography variant={{ xs: 'body2', md: 'body1' }}>Text</Typography>
</Box>
```

## Coding Style Rules

### 1. Singleton Pattern for Business Logic

All business logic and shared state SHALL be managed by singleton class instances that exist outside the React render cycle.

**Example:**

```typescript
// src/core/ProjectManager.ts
class ProjectManager extends EventEmitter {
  private static instance: ProjectManager;
  private currentProject: Project | null = null;

  private constructor() {
    super();
  }

  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  createProject(name: string, dimensions: Dimensions): void {
    this.currentProject = {
      id: generateId(),
      name,
      dimensions,
      blocks: new Map(),
      // ...
    };
    this.emit('project:changed', this.currentProject);
  }

  getProject(): Project | null {
    return this.currentProject;
  }
}

export const projectManager = ProjectManager.getInstance();
```

### 2. Higher-Order Components for State Management

HOCs handle subscriptions to singleton events and decouple logic from rendering.

**Example:**

```typescript
// src/hocs/withProjectState.tsx
export function withProjectState<P extends object>(
  Component: React.ComponentType<P & { project: Project | null }>
) {
  return function WithProjectState(props: P) {
    const [project, setProject] = React.useState(
      projectManager.getProject()
    );

    React.useEffect(() => {
      const handleChange = (updatedProject: Project) => {
        setProject(updatedProject);
      };

      projectManager.on('project:changed', handleChange);
      return () => projectManager.off('project:changed', handleChange);
    }, []);

    return <Component {...props} project={project} />;
  };
}
```

### 3. No Inline Anonymous Callbacks

ALL callbacks must be named functions. This improves readability, debugging, and performance.

**❌ WRONG:**

```typescript
// BAD: Anonymous inline callback
items.map((item) => item.name.toUpperCase())

// BAD: Anonymous event handler
<button onClick={() => doSomething()}>Click</button>

// BAD: Anonymous filter
users.filter(u => u.active)
```

**✅ CORRECT:**

```typescript
// GOOD: Named function
const toUpperCaseName = (item: Item) => item.name.toUpperCase();
items.map(toUpperCaseName)

// GOOD: Named event handler
const handleClick = () => doSomething();
<button onClick={handleClick}>Click</button>

// GOOD: Named predicate
const isActive = (user: User) => user.active;
users.filter(isActive)
```

### 4. One Component Per File

**NO EXCEPTIONS.** Each React component must live in its own file.

**❌ WRONG:**

```typescript
// components/Editor.tsx - BAD: Multiple components in one file
function Toolbar() { /* ... */ }
function Canvas() { /* ... */ }
export function Editor() { /* ... */ }
```

**✅ CORRECT:**

```typescript
// components/Toolbar.tsx
export function Toolbar() { /* ... */ }

// components/Canvas.tsx
export function Canvas() { /* ... */ }

// components/Editor.tsx
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
export function Editor() { /* ... */ }
```

**CRITICAL: After editing any TSX file, you MUST:**
1. Read the entire file to check for multiple component definitions
2. Count all function/class components (starts with `function`, `const`, `class` and returns JSX)
3. If multiple components exist, immediately extract each into separate files
4. This check is MANDATORY after every TSX file edit - NO EXCEPTIONS

### 5. 350 Line Limit for Components

React components must not exceed 350 lines. If a component grows beyond this limit:
1. Extract sub-components into separate files
2. Move complex logic into utility functions
3. Move state management into singletons/HOCs

### 6. Minimal React Hooks Usage

**React hooks are ONLY permitted:**
- When provided by external libraries (e.g., `useProvider` from react-spectrum)
- In HOC components that bridge singletons and components

**React hooks are FORBIDDEN in:**
- Regular rendering components (use HOCs instead)
- Business logic (use singletons instead)

### 7. Dumb Components

Most components should be "dumb" - pure rendering artifacts that:
- Receive all data via props
- Invoke callbacks passed as props
- Contain no business logic
- Don't directly subscribe to events
- Don't manage complex state

**Example:**

```typescript
// components/MaterialPalette.tsx
interface MaterialPaletteProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
}

export function MaterialPalette({
  blocks,
  selectedBlockId,
  onSelectBlock
}: MaterialPaletteProps) {
  const handleBlockClick = (blockId: string) => {
    onSelectBlock(blockId);
  };

  return (
    <div className="material-palette">
      {blocks.map((block) => (
        <BlockButton
          key={block.id}
          block={block}
          isSelected={block.id === selectedBlockId}
          onClick={handleBlockClick}
        />
      ))}
    </div>
  );
}
```

### 8. Composable Components

Design components to be loosely coupled and composable:
- Accept configuration via props, not hard-coded values
- Use children prop for composition
- Avoid tight coupling to specific parent components
- Design for reusability

## Folder Organization

```
src/
├── components/        # Atomic UI components (buttons, menus, form controls)
│   ├── BlockButton.tsx
│   ├── FullPaletteMenu.tsx
│   ├── LayerControls.tsx
│   ├── LayerDimensionControl.tsx
│   ├── MaterialPalette.tsx
│   ├── MetaBlockPlacementModal.tsx
│   ├── NewProjectDialog.tsx
│   ├── QuickSelectPalette.tsx
│   └── ViewSelector.tsx
├── layouts/           # Functional blocks composing components
│   ├── Toolbar.tsx           # App header with actions
│   ├── TabbedLayout.tsx      # Single-panel tab navigation
│   └── QuadLayout.tsx        # Four-panel grid layout
├── panels/            # Interactive view areas
│   ├── Canvas2DView.tsx      # 2D orthographic canvas
│   └── CanvasPlaceholder.tsx # Canvas placeholder
├── views/             # Top-level composed views
│   ├── EditorView.tsx        # Main editor orchestrator
│   └── WelcomeView.tsx       # Project browser/landing
├── hocs/              # Higher-order components for state
│   ├── withProjectState.tsx
│   ├── withEditorState.tsx
│   └── withBlockRegistry.tsx
├── core/              # Singleton classes (business logic)
│   ├── EventEmitter.ts
│   ├── ProjectManager.ts
│   ├── BlockRegistry.ts
│   ├── StorageManager.ts
│   ├── EditorStateManager.ts
│   └── ViewportManager.ts
├── types/             # TypeScript type definitions
│   └── index.ts
└── preview/           # Component preview system
    ├── ComponentPreview.tsx
    ├── PreviewLayout.tsx
    ├── mockData.ts
    └── previews/      # Individual component previews
```

## Folder Hierarchy Explained

The architecture follows a clear hierarchy from atomic to composed:

**1. components/** - Atomic UI elements
- Single-responsibility React Spectrum compositions
- Buttons, menus, form controls, dialogs
- No complex business logic
- Reusable across different contexts

**2. layouts/** - Functional blocks
- Compose atomic components into cohesive units
- Handle layout concerns and component orchestration
- Examples: Toolbar (header), TabbedLayout (navigation)
- May contain minor interaction logic

**3. panels/** - Interactive view areas
- Canvas-based or viewport components
- Handle rendering, zoom, pan, interactions
- Examples: 2D canvas, 3D viewport (future)
- Receive state via props from parent

**4. views/** - Top-level compositions
- Compose layouts and panels into complete screens
- Orchestrate data flow between subsystems
- Use HOCs to inject state from singletons
- Examples: EditorView, WelcomeView

**Dependency Flow:** components → layouts → panels → views

## File Naming Conventions

- Components: PascalCase (e.g., `MaterialPalette.tsx`)
- HOCs: camelCase with "with" prefix (e.g., `withProjectState.tsx`)
- Singletons: PascalCase (e.g., `ProjectManager.ts`)
- Types: PascalCase (e.g., `index.ts` with PascalCase exports)
- Utils: camelCase (e.g., `geometry.ts`)

## Import Organization

Organize imports in the following order:
1. External dependencies (React, libraries)
2. Type imports
3. Core/singletons
4. HOCs
5. Components
6. Utils
7. Styles

```typescript
import React from 'react';
import { Button } from '@adobe/react-spectrum';

import type { Project, Block } from '../types';

import { projectManager } from '../core/ProjectManager';

import { withProjectState } from '../hocs/withProjectState';

import { MaterialPalette } from '../components/MaterialPalette';

import { validateDimensions } from '../utils/validation';
```

## TypeScript Guidelines

- Use strict mode (`"strict": true` in tsconfig.json)
- Avoid `any` - use `unknown` and type guards instead
- Define explicit return types for functions
- Use interfaces for object shapes, types for unions/primitives
- Leverage type inference where it improves readability

## Testing Considerations

While tests aren't required initially, the architecture supports easy testing:
- Singletons can be reset/mocked for unit tests
- Components are pure functions of props (easy to test)
- HOCs can be tested independently
- Business logic is isolated from rendering

## Performance Considerations

- Named functions enable React.memo optimization
- Singleton pattern prevents unnecessary re-instantiation
- HOCs minimize re-renders by subscribing only to relevant changes
- Canvas operations are optimized via requestAnimationFrame
- BabylonJS scene updates are throttled to 60fps

## Code Review Checklist

Before committing, verify:
- [ ] No inline anonymous callbacks
- [ ] One component per file
- [ ] Components under 350 lines
- [ ] Business logic in singletons, not components
- [ ] HOCs used for state management
- [ ] No forbidden hook usage
- [ ] TypeScript strict mode passes
- [ ] Imports organized correctly
- [ ] Files in correct folders
