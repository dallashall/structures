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

1. **First: Use React Spectrum components** - Always check React Spectrum documentation first
   - See available components list below
   - Documentation: https://react-spectrum.adobe.com/react-spectrum/
   - MCP server available for Spectrum queries

2. **Second: Compose React Spectrum components** - Build custom components by composing existing Spectrum components

3. **Last Resort: Custom components** - Only create custom components when no suitable Spectrum component exists

**Why React Spectrum?**
- ✓ Heavily tested by Adobe team
- ✓ Built-in accessibility (ARIA, keyboard navigation)
- ✓ Automatic theme adaptation (light/dark mode, platform-specific)
- ✓ Design system consistency
- ✓ Responsive behavior built-in
- ✓ Spectrum design tokens for spacing, colors, sizing

**Available React Spectrum Components:**

```
Accordion              - Collapsible sections
ActionBar              - Contextual action toolbar
ActionButton           - Icon-focused button
ActionButtonGroup      - Group of action buttons
ActionMenu             - Menu triggered by action button
Avatar                 - User profile image
AvatarGroup            - Collection of avatars
Badge                  - Small status indicator
Breadcrumbs            - Navigation trail
Button                 - Standard button
ButtonGroup            - Group of related buttons
Calendar               - Date selection calendar
Card                   - Content container
CardView               - Grid of cards
Checkbox               - Single checkbox
CheckboxGroup          - Group of checkboxes
ColorArea              - 2D color picker
ColorField             - Color input field
ColorSlider            - Color gradient slider
ColorSwatch            - Color preview square
ColorSwatchPicker      - Grid of color swatches
ColorWheel             - Circular hue selector
ComboBox               - Autocomplete input
ContextualHelp         - Inline help popover
DateField              - Date text input
DatePicker             - Date picker with calendar
DateRangePicker        - Date range selection
Dialog                 - Modal dialog
Disclosure             - Expandable section
Divider                - Visual separator
DropZone               - File drag-and-drop area
Form                   - Form container
Icons                  - Icon components
IllustratedMessage     - Empty state with illustration
Illustrations          - Illustration assets
Image                  - Responsive image
InlineAlert            - Inline notification
Link                   - Hyperlink
LinkButton             - Link styled as button
Menu                   - Dropdown menu
Meter                  - Progress/value indicator
NumberField            - Numeric input
Picker                 - Select dropdown
Popover                - Floating container
ProgressBar            - Linear progress indicator
ProgressCircle         - Circular progress indicator
Provider               - Theme/locale provider
RadioGroup             - Radio button group
RangeCalendar          - Calendar range selection
RangeSlider            - Dual-handle slider
SearchField            - Search input
SegmentedControl       - Exclusive selection buttons
SelectBoxGroup         - Selectable card group
Skeleton               - Loading placeholder
Slider                 - Single-value slider
StatusLight            - Colored status indicator
Switch                 - Toggle switch
TableView              - Data table
Tabs                   - Tab navigation
TagGroup               - Collection of tags
TextArea               - Multi-line text input
TextField              - Single-line text input
TimeField              - Time input
Toast                  - Temporary notification
ToggleButton           - Toggle state button
ToggleButtonGroup      - Group of toggle buttons
Tooltip                - Hover info popup
TreeView               - Hierarchical tree
```

**Layout Components:**
- `View` - Generic container with styling props
- `Grid` - CSS Grid layout
- `Flex` - Flexbox layout
- `Content` - Text content wrapper
- `Heading` - Heading text (levels 1-6)
- `Text` - Body text
- `Well` - Inset container

**Anti-patterns to avoid:**
- ❌ Custom divs with inline styles
- ❌ Manual implementation of common UI patterns
- ❌ Hardcoded colors, spacing, or sizes (use Spectrum tokens)
- ❌ Custom accessibility implementations (Spectrum handles this)
- ❌ Re-inventing components that Spectrum provides
- ❌ **UNSAFE_style is FORBIDDEN** - Always use proper Spectrum props and patterns
- ❌ Building custom components without checking the available Spectrum components list first

**Before building any UI component:**
1. Check the available Spectrum components list in this file
2. Search React Spectrum documentation: https://react-spectrum.adobe.com/react-spectrum/
3. Query the Spectrum MCP server if available
4. Only build custom if no suitable Spectrum component exists

**React Spectrum Skills:**
- Available via: `npx skills add https://react-spectrum.adobe.com`
- Provides additional tooling and capabilities for Spectrum components

**Example - Wrong vs Right:**

```typescript
// ❌ WRONG: Custom div with inline styles
<div style={{ padding: '16px', background: '#fafafa', border: '1px solid #e0e0e0' }}>
  <h2 style={{ fontSize: '20px' }}>Title</h2>
  <p>Content</p>
</div>

// ✓ RIGHT: React Spectrum components with tokens
<View padding="size-200" backgroundColor="gray-100" borderWidth="thin" borderColor="gray-300">
  <Heading level={2}>Title</Heading>
  <Content>Content</Content>
</View>
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
