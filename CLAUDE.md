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
- **[ARCHITECTURE_PATTERNS.md](./.claude/skills/ARCHITECTURE_PATTERNS.md)** - Core architectural patterns and decisions (Tool system, Event Sourcing, Drafting Service)
- **[PROJECT.md](./PROJECT.md)** - Complete project specification and requirements
- **[MACRO_COMPONENTS.md](./MACRO_COMPONENTS.md)** - Detailed component architecture, data flow, and singleton specifications
- **[README.md](./README.md)** - Quick start guide

When implementing new features:
- Consult **ARCHITECTURE_PATTERNS.md** for core patterns (Event Sourcing vs Event-Driven, Tool system, DraftingService)
- Consult **MACRO_COMPONENTS.md** for detailed specifications of singletons, HOCs, and components

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

### Three Patterns: Event Sourcing, Event-Driven, and Commands

This application uses three distinct patterns that must NOT be conflated:

#### 1. Event Sourcing (Internal State)

**Purpose:** Understanding, storing, and reading "truth" and "state" in the app.

**Characteristics:**
- Persisted, linear sequence of events in EventStore
- Events have version numbers, timestamps, eventId, sessionId
- State is derived by replaying events: `state = events.reduce(reducer, initialState)`
- Events are immutable facts about what happened
- Used for undo/redo, audit trail, state reconstruction

**Example:**
```typescript
// Event Sourcing - persisted events in EventStore
const event: BlockPlacedEvent = {
  type: 'block:placed',
  eventId: generateUUID(),
  timestamp: Date.now(),
  sessionId: getSessionId(),
  projectId: project.id,
  version: -1,  // Assigned by EventStore
  payload: {
    position: { x: 5, y: 2, z: 3 },
    blockType: 'stone',
    previousBlockType: 'air',
  },
};
eventStore.appendEvent(event);

// State computed from events
const project = eventStore.replayEvents(projectId);
```

**Key Files:**
- `src/core/EventStore.ts` - Event journal and replay
- `src/events/types.ts` - Event type definitions
- `src/reducers/projectReducer.ts` - Pure reducer functions

#### 2. Event-Driven Architecture (Integration/Notifications)

**Purpose:** Communicating changes in a loosely coupled way.

**Characteristics:**
- Event is persisted FIRST (proof it happened)
- Then notification is broadcast (allowing reactions)
- Different from RPC - no expectation of specific work being done
- Singletons emit notifications via EventEmitter
- HOCs subscribe to notifications to update UI
- Notifications are ephemeral (not persisted)

**Example:**
```typescript
// Event-Driven - notifications via EventEmitter
class ProjectManager extends EventEmitter {
  setBlock(position: Vector3D, blockType: string): void {
    // 1. Persist the event (Event Sourcing)
    const event: BlockPlacedEvent = { /* ... */ };
    eventStore.appendEvent(event);

    // 2. Broadcast notification (Event-Driven)
    // This is NOT the same event - it's a notification
    this.emit('block:placed', { position, blockType });
    this.emit('state:changed');  // Generic notification that state updated
  }
}

// HOC subscribes to notifications
useEffect(() => {
  const handleBlockPlaced = (data) => {
    // React to the notification - update UI
    updateBlockVisualization(data.position);
  };

  projectManager.on('block:placed', handleBlockPlaced);
  return () => projectManager.off('block:placed', handleBlockPlaced);
}, []);
```

**Key Files:**
- `src/core/EventEmitter.ts` - Base class for pub/sub
- `src/hocs/withProjectState.tsx` - Subscribe to notifications
- All singleton classes - Emit notifications

#### 3. Commands (RPC-style)

**Purpose:** Request that something be done.

**Characteristics:**
- Imperative method calls on singletons
- May validate, may fail
- May result in events being created (Event Sourcing)
- May result in notifications being emitted (Event-Driven)
- Synchronous API calls

**Example:**
```typescript
// Command - imperative request
projectManager.setBlock({ x: 5, y: 2, z: 3 }, 'stone');  // Command
projectManager.removeBlock({ x: 5, y: 2, z: 3 });        // Command
projectManager.createProject('My Castle', dimensions);   // Command

// Command may be rejected
if (!isValidPosition(position)) {
  throw new Error('Invalid position');  // Command fails
}
```

**Key Pattern:**
```
User Action → Command (method call) → Persist Event (Event Sourcing) → Emit Notification (Event-Driven) → UI Updates
```

#### Critical Distinctions

| Aspect | Event Sourcing | Event-Driven | Commands |
|--------|---------------|--------------|----------|
| **Purpose** | State reconstruction | Loose coupling | Request work |
| **Persisted?** | YES (EventStore) | NO (ephemeral) | NO (just a call) |
| **Has version?** | YES | NO | NO |
| **Has timestamp?** | YES (exact time) | NO | NO |
| **Immutable?** | YES | N/A | N/A |
| **Examples** | BlockPlacedEvent in journal | `emit('block:placed', data)` | `setBlock(pos, type)` |
| **Naming** | Past tense (block:placed) | Past tense (block:placed) | Imperative (setBlock) |

#### How They Work Together

```typescript
// 1. USER ACTION: Click to place block
handleClick(position: Vector3D) {
  // 2. COMMAND: Call singleton method
  projectManager.setBlock(position, selectedBlockType);
}

// Inside ProjectManager.setBlock():
setBlock(position: Vector3D, blockType: string): void {
  // 3. EVENT SOURCING: Create and persist event
  const event: BlockPlacedEvent = {
    type: 'block:placed',
    eventId: generateUUID(),
    version: -1,
    // ... full event structure
  };
  eventStore.appendEvent(event);  // Persisted to localStorage

  // 4. EVENT-DRIVEN: Emit notification for UI updates
  this.emit('block:placed', { position, blockType });
  this.emit('state:changed');
}

// 5. HOC REACTS: UI updates in response to notification
useEffect(() => {
  const handleStateChange = () => {
    // Get computed state from event store
    setProject(projectManager.getProject());
  };
  projectManager.on('state:changed', handleStateChange);
  return () => projectManager.off('state:changed', handleStateChange);
}, []);
```

#### Anti-Patterns to Avoid

❌ **WRONG - Conflating patterns:**
```typescript
// BAD: Emitting persisted events as notifications
eventStore.on('event:appended', (event) => {
  // Don't broadcast persisted events directly
  projectManager.emit(event.type, event);  // ❌ Mixing concerns
});

// BAD: Using EventEmitter events for state reconstruction
const state = emittedEvents.reduce(reducer, null);  // ❌ Wrong - use EventStore

// BAD: Persisting notification events
this.emit('block:placed', blockData);
eventStore.appendEvent(notificationEvent);  // ❌ Notifications aren't persisted
```

✅ **CORRECT - Clear separation:**
```typescript
// GOOD: Event Sourcing - persist, then compute state
const event: BlockPlacedEvent = { /* full structure */ };
eventStore.appendEvent(event);
const state = eventStore.replayEvents(projectId);

// GOOD: Event-Driven - notify after persistence
this.emit('block:placed', { position, blockType });

// GOOD: Commands - clear imperative API
projectManager.setBlock(position, blockType);
```

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

      projectManager.on('project:created', handleChange);
      projectManager.on('block:placed', handleChange);
      projectManager.on('block:removed', handleChange);
      return () => {
        projectManager.off('project:created', handleChange);
        projectManager.off('block:placed', handleChange);
        projectManager.off('block:removed', handleChange);
      };
    }, []);

    return <Component {...props} project={project} />;
  };
}
```

### 3. Specific Event Names (NO Generic Events)

**CRITICAL:** Event names MUST be specific and convey meaning. NEVER use generic events like "changed", "updated", "modified", or "loaded".

This architectural rule ensures consumers can make intelligent decisions about which events matter to them without having to intuit whether an event is meaningful.

**❌ WRONG - Generic Events:**

```typescript
// BAD: Generic, forces consumers to guess what changed
this.emit('project:changed', this.currentProject);
this.emit('editor:updated', state);
this.emit('thing:modified', data);
this.emit('data:loaded', result);

// BAD: Consumer has no idea if this event matters to them
projectManager.on('project:changed', (project) => {
  // Did the name change? Dimensions? A block? No way to know!
  // Must re-render everything because we can't tell
  this.setState({ project });
});
```

**✅ CORRECT - Specific Events:**

```typescript
// GOOD: Specific, consumers know exactly what happened
this.emit('project:created', this.currentProject);
this.emit('project:renamed', { previousName, newName });
this.emit('project:dimensions-expanded', { direction, newDimensions });
this.emit('block:placed', blockData);
this.emit('block:removed', position);
this.emit('meta-block:placed', position);
this.emit('meta-block:confirmed', position);
this.emit('layer:changed', { axis, layer });
this.emit('paint-mode:changed', { mode });
this.emit('draft:created', draftEvent);
this.emit('draft:updated', draftEvent);
this.emit('draft:finalized', compoundEvent);
this.emit('draft:cancelled');

// GOOD: Consumer can subscribe to only the events that matter
projectManager.on('project:renamed', ({ newName }) => {
  // Only update the name display, no need to re-render canvas
  this.updateProjectName(newName);
});

projectManager.on('block:placed', (blockData) => {
  // Only re-render the affected area
  this.updateBlockAtPosition(blockData.position);
});
```

**Why Specific Events Matter:**

1. **Performance**: Consumers can subscribe to only the events they care about and avoid unnecessary re-renders
2. **Clarity**: Event name tells you exactly what changed without reading documentation
3. **Debugging**: Event logs are self-documenting and easier to understand
4. **Optimization**: Different consumers can respond differently to specific events
5. **Type Safety**: Specific events have specific payload types

**Event Naming Convention:**

```
<entity>:<specific-action>
```

Examples:
- `project:created`, `project:renamed`, `project:dimensions-expanded`
- `block:placed`, `block:removed`, `block:updated-type`
- `layer:changed`, `layer:visibility-toggled`
- `paint-mode:changed`, `paint-behavior:changed`
- `selection:changed`, `selection:cleared`
- `draft:created`, `draft:updated`, `draft:finalized`, `draft:cancelled`

**Forbidden Generic Suffixes:**
- `:changed` (too generic - what changed?)
- `:updated` (too generic - what was updated?)
- `:modified` (too generic - what was modified?)
- `:loaded` (too generic - what was loaded?)

### 4. No Inline Anonymous Callbacks

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

### 5. One Component Per File

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

### 6. 350 Line Limit for Components

React components must not exceed 350 lines. If a component grows beyond this limit:
1. Extract sub-components into separate files
2. Move complex logic into utility functions
3. Move state management into singletons/HOCs

### 7. Minimal React Hooks Usage

**React hooks are ONLY permitted:**
- When provided by external libraries (e.g., `useProvider` from react-spectrum)
- In HOC components that bridge singletons and components

**React hooks are FORBIDDEN in:**
- Regular rendering components (use HOCs instead)
- Business logic (use singletons instead)

### 8. Dumb Components

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

### 9. Composable Components

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
