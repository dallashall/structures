# CLAUDE.md

This file gives Claude Code (claude.ai/code) the coding standards and architectural rules for this repository.

## Development Commands

```bash
# Start the dev server (Vite + HMR). Downloads and builds the texture atlas when it is missing.
npm run dev

# Type check without building
npm run type-check

# Run the test suite (Vitest, jsdom, fake-indexeddb)
npm test

# Build for production (texture setup, type check, Vite build)
npm run build

# Preview the production build
npm run preview

# Download the pinned texture pack again and rebuild the atlas
npm run setup:textures
```

## Project Documentation

- **[CLAUDE.md](./CLAUDE.md)** (this file): coding standards and architectural rules
- **[ARCHITECTURE_PATTERNS.md](./.claude/skills/ARCHITECTURE_PATTERNS.md)**: the event log, commands, projections, undo history, the tool system, and DraftingService
- **[MACRO_COMPONENTS.md](./MACRO_COMPONENTS.md)**: singletons, HOCs, views, and components, with data flow
- **[PROJECT.md](./PROJECT.md)**: project specification and requirements
- **[UX_DECISIONS.md](./UX_DECISIONS.md)**: interaction and layout decisions
- **[TESTING.md](./TESTING.md)**: test plan
- **[README.md](./README.md)**: quick start, textures, deployment, licensing
- **[src/core/rendering/README.md](./src/core/rendering/README.md)**: the BabylonJS rendering modules

Consult ARCHITECTURE_PATTERNS.md before changing how state is written or read. Consult MACRO_COMPONENTS.md before adding a singleton, HOC, or view.

---

# Development Guidelines for Minecraft Magic Blueprint System

## Architectural Principles

This project follows strict architectural patterns to keep logic testable and rendering simple.

### Core Principle: Separation of Logic and Rendering

**Business logic lives in singleton classes. Rendering lives in React components.**

```
Business Logic (Singletons) → Notifications → HOCs → Props → Components (Rendering)
```

- **Singletons**: hold state, run business logic, emit notifications
- **HOCs**: subscribe to singleton notifications and pass data to the wrapped component as props
- **Components**: render from props and call back through props

### Three Patterns: Event Sourcing, Event-Driven, and Commands

The app uses three distinct patterns. Do not conflate them.

#### 1. Event Sourcing (Persisted State)

**Purpose:** store the truth about each project and derive state from it.

- One IndexedDB-backed log: `eventLog` in `src/core/EventLog.ts`
- Each row has an auto-increment `id`, `type`, `data`, `timestamp`, `projectId`, and an optional `actionId`
- State is derived by replaying rows through pure reducers in `src/reducers/`
- Rows are immutable. Undo appends a marker. It never deletes or edits a row.

```typescript
// One user action: markers and events commit in one transaction
await eventLog.appendAction(projectId, {
  kind: 'paint',
  tool: 'point',
  events: [{ type: 'model:blocksPlaced', data: { blocks } }],
});

// State is derived from the log
const model = await modelProjection.getModel();
```

**Key Files:**
- `src/core/EventLog.ts`: the log
- `src/reducers/modelReducer.ts`: applies `model:*` events to a Model
- `src/reducers/historyReducer.ts`: folds `action:started` markers into undo and redo stacks
- `src/projections/`: read models that replay the log

#### 2. Event-Driven Architecture (Notifications)

**Purpose:** tell other parts of the app that something happened, without coupling to them.

- The row is persisted FIRST. The notification follows.
- Singletons extend `EventEmitter` (`src/core/EventEmitter.ts`) and emit notifications
- HOCs subscribe to notifications to update the UI
- Notifications are ephemeral and never persisted

```typescript
// EventLog emits event:appended after the transaction commits.
// ModelProjection applies the row, then notifies.
class ModelProjection extends EventEmitter {
  private handleEvent(event: Event): void {
    if (this.replayer.receive(event) !== 'applied') return;
    if (BLOCK_EVENT_TYPES.includes(event.type)) {
      this.emit('model:blocks-rebuilt');
    }
    this.emit('model:rebuilt');
  }
}

// An HOC subscribes and re-reads the projection
React.useEffect(() => {
  const handleRebuilt = async () => {
    setProject(await projectView.getProject());
  };
  modelProjection.on('model:rebuilt', handleRebuilt);
  return () => modelProjection.off('model:rebuilt', handleRebuilt);
}, []);
```

#### 3. Commands (Imperative Requests)

**Purpose:** request that something be done.

- Command singletons live in `src/commands/`. UI state setters live on singletons in `src/core/`.
- A command may validate against projections and throw
- A command may append rows (Event Sourcing). Projections then emit notifications (Event-Driven).

```typescript
await createProjectCommand.execute('My Castle', { width: 16, height: 16, depth: 16 });
await shrinkDimensionsCommand.execute('x-');  // Throws when blocks would fall outside
editorState.setSelectedBlock('minecraft:stone');
void editHistory.undo();
```

#### Critical Distinctions

| Aspect | Event Sourcing | Event-Driven | Commands |
|--------|---------------|--------------|----------|
| **Purpose** | State reconstruction | Loose coupling | Request work |
| **Persisted?** | YES (EventLog, IndexedDB) | NO | NO |
| **Has id and timestamp?** | YES | NO | NO |
| **Immutable?** | YES | N/A | N/A |
| **Examples** | `model:blocksPlaced` row | `emit('model:rebuilt')` | `shrinkDimensionsCommand.execute('x-')` |
| **Naming** | `<domain>:<camelCasePastTense>` | `<entity>:<past-tense>` | Imperative verb |

#### How They Work Together

```
User Action → Command → EventLog row (persisted) → event:appended → Projection applies row
  → Projection notification → HOC re-reads → Props → Component renders
```

#### Anti-Patterns to Avoid

❌ **WRONG:**
```typescript
// Re-broadcasting persisted rows as notifications
eventLog.on('event:appended', (event) => {
  editorState.emit(event.type, event);  // ❌ Mixing concerns
});

// Building state from notifications
const state = emittedNotifications.reduce(reducer, null);  // ❌ Replay the EventLog

// Persisting a notification
this.emit('draft:updated');
await eventLog.append('draft:updated', previewBlocks);  // ❌ Previews are not history
```

✅ **CORRECT:**
```typescript
// Persist through a command or DraftingService, then read from a projection
await draftingService.finalize(operations);
const blocks = await blockProjection.getBlocks();

// Notify after state changes
this.emit('history:step-recorded');
```

### UI Component Selection Priority

1. **First: Material UI (MUI) components.** MUI 7 is installed (`@mui/material`, `@mui/icons-material`, `@mui/lab`). Documentation: https://mui.com/material-ui/
2. **Second: compose MUI components.**
3. **Third: the project's custom components** listed below.
4. **Last resort: a new custom component.**

MUI provides accessibility, keyboard navigation, theming, and TypeScript types.

**Custom Components:**

- **BlockTextureSwatch** (`src/components/BlockTextureSwatch.tsx`): block texture from the atlas
- **NumberField** (`src/components/NumberField.tsx`): numeric input with increment and decrement buttons
- **Form** (`src/components/Form.tsx`): form container with consistent spacing
- **DialogTrigger** (`src/components/DialogTrigger.tsx`): pattern for triggering dialogs and popovers
- **ModalDialog** (`src/components/ModalDialog.tsx`): native modal dialog that holds focus and the keyboard
- **ShortcutTooltip** (`src/components/ShortcutTooltip.tsx`): tooltip that shows a keyboard shortcut

**Commonly Used MUI Components:**

- Layout: `Box`, `Stack`, `Grid`, `Container`, `Paper`, `Card`, `Accordion`, `Divider`
- Typography: `Typography` (variants `h1` to `h6`, `body1`, `body2`, `caption`, `button`, `overline`)
- Buttons: `Button`, `IconButton`, `ButtonGroup`, `ToggleButton`, `ToggleButtonGroup`
- Inputs: `TextField`, `Select` + `MenuItem`, `Checkbox`, `Radio` + `RadioGroup`, `Switch`, `Slider`, `Autocomplete`
- Feedback: `Dialog`, `Snackbar`, `Tooltip`, `Alert`, `CircularProgress`, `LinearProgress`, `Skeleton`
- Navigation: `Tabs` + `Tab`, `Breadcrumbs`, `Link`, `Drawer`, `AppBar`
- Icons: `import { Add, Save, Delete } from '@mui/icons-material';`
- MUI Lab: `TabContext`, `TabList`, `TabPanel`

**Anti-patterns to avoid:**
- ❌ Custom divs with inline styles (use `Box` with the `sx` prop)
- ❌ Hand-built versions of common UI patterns that MUI provides
- ❌ Hardcoded colors, spacing, or sizes (use theme tokens via `sx`)
- ❌ Custom accessibility implementations (MUI handles this)
- ❌ Deprecated props (check the MUI 7 documentation)

**Styling with `sx`:**

- Spacing: `p: 2` (16px), `m: 1` (8px), `gap: 3` (24px)
- Colors: `bgcolor: 'primary.main'`, `color: 'text.secondary'`, `borderColor: 'divider'`
- Borders: `border: 1`, `borderRadius: 1`
- Typography: `fontSize: 'h6.fontSize'`, `fontWeight: 'bold'`
- Responsive values: `p: { xs: 1, sm: 2, md: 3 }`

```typescript
// ❌ WRONG
<div style={{ padding: '16px', border: '1px solid #e0e0e0' }}>
  <h2 style={{ fontSize: '20px' }}>Title</h2>
</div>

// ✓ RIGHT
<Box sx={{ p: 2, border: 1, borderColor: 'divider' }}>
  <Typography variant="h5">Title</Typography>
</Box>
```

## Coding Style Rules

### 1. Singleton Pattern for Business Logic

All business logic and shared state SHALL live in singleton class instances outside the React render cycle.

```typescript
// src/core/ScreenRouter.ts (abridged)
class ScreenRouter extends EventEmitter {
  private static instance: ScreenRouter;
  private appScreen: 'welcome' | 'editor' = 'welcome';

  private constructor() {
    super();
  }

  static getInstance(): ScreenRouter {
    if (!ScreenRouter.instance) {
      ScreenRouter.instance = new ScreenRouter();
    }
    return ScreenRouter.instance;
  }

  showEditor(): void {
    this.appScreen = 'editor';
    this.emit('screen:shown', this.getScreen());
  }
}

export const screenRouter = ScreenRouter.getInstance();
```

- Singletons that hold state the UI reads extend `EventEmitter` and emit a notification on each change.
- Singletons without observable state (commands, `toolRegistry`, `projectView`) skip `EventEmitter`.
- Every singleton exports one lowercase instance, such as `screenRouter`, `eventLog`, or `createProjectCommand`.

### 2. Higher-Order Components for State

HOCs subscribe to singleton notifications and pass data to the wrapped component as props.

```typescript
// src/hocs/withEditHistory.tsx (abridged)
const HISTORY_NOTIFICATIONS = [
  'history:replayed',
  'history:step-recorded',
  'history:step-undone',
  'history:step-redone',
];

export function withEditHistory<P extends object>(
  Component: React.ComponentType<P & WithEditHistoryProps>,
) {
  return function WithEditHistory(props: P) {
    const [canUndo, setCanUndo] = React.useState(editHistory.canUndo());
    const [canRedo, setCanRedo] = React.useState(editHistory.canRedo());

    React.useEffect(() => {
      const readStacks = (): void => {
        setCanUndo(editHistory.canUndo());
        setCanRedo(editHistory.canRedo());
      };
      const subscribe = (name: string): void => { editHistory.on(name, readStacks); };
      const unsubscribe = (name: string): void => { editHistory.off(name, readStacks); };
      const unsubscribeAll = (): void => HISTORY_NOTIFICATIONS.forEach(unsubscribe);

      HISTORY_NOTIFICATIONS.forEach(subscribe);
      readStacks();
      return unsubscribeAll;
    }, []);

    return <Component {...props} canUndo={canUndo} canRedo={canRedo} />;
  };
}
```

An HOC reads the singleton once more right after it subscribes. A change can land between the first render and the subscription.

### 3. Specific Notification Names (NO Generic Names)

**CRITICAL:** notification names MUST say what happened. NEVER use generic names like "changed", "updated", "modified", or "loaded".

A specific name lets each consumer subscribe to only what it needs.

**❌ WRONG:**

```typescript
this.emit('project:changed', project);
this.emit('editor:updated', state);
this.emit('data:loaded', result);
```

**✅ CORRECT (names the code emits):**

```typescript
editorState.emit('layer:adjusted', dimension, layer);
editorState.emit('paintmode:selected', mode);
editorState.emit('project:switched', projectId);
editHistory.emit('history:step-undone', { actionId });
screenRouter.emit('screen:shown', screen);
textureResolver.emit('atlas:ready');
draftingService.emit('draft:finalized');
draftingService.emit('draft:cancelled');
```

**Naming convention:** `<entity>:<past-tense-action>`. A sub-entity may sit in the middle: `materialbrowser:tab:switched`, `quickselect:foreground:selected`.

**Forbidden suffixes:** `:changed`, `:updated`, `:modified`, `:loaded`

Persisted EventLog row types follow a separate convention: `<domain>:<camelCasePastTense>`, such as `model:blocksPlaced`, `model:dimensionShrunk`, `metadata:renamed`. The undo markers are `action:started` and `action:ended`.

### 4. No Inline Anonymous Callbacks

ALL callbacks must be named functions.

```typescript
// ❌ WRONG
items.map((item) => item.name.toUpperCase())
<button onClick={() => doSomething()}>Click</button>
users.filter(u => u.active)

// ✅ CORRECT
const toUpperCaseName = (item: Item) => item.name.toUpperCase();
items.map(toUpperCaseName)

const handleClick = () => doSomething();
<button onClick={handleClick}>Click</button>

const isActive = (user: User) => user.active;
users.filter(isActive)
```

The rule covers every function passed as an argument, a JSX prop, an object property value, or a handler property (`request.onsuccess = ...`). That includes `new Promise` executors, `React.useEffect` bodies and their cleanups, and MUI `sx` functions.

Allowed:
- A closure returned by a named handler creator: `const createSlotClickHandler = (index: number) => () => onSelect(index);`
- Vitest structure callbacks (`describe`, `it`, `test`, `beforeEach`, `afterEach`). Callbacks inside a test body still need names.

`npm run lint:callbacks` lists every violation by file and line.

### 5. One Component Per File

**NO EXCEPTIONS.** Each React component lives in its own file. A file may export a `React.memo` wrapper of its one component.

**After editing any TSX file, you MUST:**
1. Read the entire file and check for multiple component definitions
2. Count all function or class components that return JSX
3. Extract each extra component into its own file

### 6. 350 Line Limit for Components

React components must not exceed 350 lines. When one grows past the limit:
1. Extract sub-components into separate files
2. Move complex logic into utility functions
3. Move state into singletons and HOCs

### 7. Minimal React Hooks Usage

**React hooks are ONLY permitted:**
- When an external library provides them (for example MUI's `useTheme`)
- In HOCs that bridge singletons and components (`src/hocs/`)
- In the component preview gallery (`src/preview/`), which is a development tool

**React hooks are FORBIDDEN in:**
- Rendering components in `components/`, `layouts/`, `panels/`, and `views/`
- Business logic (use singletons)

Canvas-backed panels attach their singleton through a ref callback (see `canvas2DMounter.refFor` and `babylon3d.attach`). They never use an effect for the canvas lifecycle. Canvas singletons follow size changes with a ResizeObserver.

### 8. Dumb Components

Most components are pure rendering:
- Receive all data via props
- Invoke callbacks passed as props
- Contain no business logic
- Do not subscribe to notifications
- Do not hold complex state

```typescript
interface ProjectDetailsProps {
  project: StorageMetadata;
  isRenaming: boolean;
  onOpen: () => void;
  onStartRename: () => void;
}

export function ProjectDetails({ project, isRenaming, onOpen, onStartRename }: ProjectDetailsProps) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">{project.name}</Typography>
      <Button onClick={onOpen}>Open</Button>
      <Button onClick={onStartRename} disabled={isRenaming}>Rename</Button>
    </Stack>
  );
}
```

### 9. Composable Components

- Accept configuration via props, not hardcoded values
- Use the `children` prop for composition
- Avoid coupling to a specific parent component

### 10. No "Manager" or "Controller" in Names

These names hide what a class does. Name a class by its behavior: `EditorState`, `ScreenRouter`, `TextureResolver`, `CameraRig`, `BlockRenderer`. When the folder already scopes the context (`src/core/rendering/`), do not repeat it in the class name.

## Folder Organization

```
src/
├── commands/          # Command singletons: validate, then append to the EventLog
│   ├── CreateProjectCommand.ts
│   ├── OpenProjectCommand.ts
│   ├── RenameProjectCommand.ts
│   ├── ExpandDimensionsCommand.ts
│   ├── ShrinkDimensionsCommand.ts
│   ├── SetMetaBlockCommand.ts
│   ├── SaveProjectFileCommand.ts
│   └── LoadProjectFileCommand.ts
├── projections/       # Read models replayed from the EventLog
│   ├── ModelProjection.ts    # dimensions, blocks, meta block
│   ├── BlockProjection.ts    # BlockIndex view of ModelProjection's blocks
│   ├── MetadataProjection.ts # id, name, timestamps
│   ├── ModelReplayer.ts      # keeps one Model current, replays on undo and redo
│   └── ProjectView.ts        # metadata + model
├── reducers/          # Pure functions that fold EventLog rows
│   ├── modelReducer.ts
│   └── historyReducer.ts
├── core/              # Singletons: logs, UI state, services, rendering
│   ├── EventEmitter.ts
│   ├── EventLog.ts           # IndexedDB event log
│   ├── EditHistory.ts        # undo and redo stacks
│   ├── DraftingService.ts    # ephemeral preview, commits paint actions
│   ├── EditorState.ts        # UI state: layers, tools, materials
│   ├── ScreenRouter.ts       # visible screen, app-level dialogs
│   ├── Storage.ts            # project list, last opened project
│   ├── BlockRegistry.ts      # block catalog
│   ├── TextureResolver.ts    # texture atlas
│   ├── HotkeyDispatcher.ts   # global keyboard shortcuts
│   ├── RenderLoop.ts         # shared requestAnimationFrame tick
│   ├── Babylon3D.ts          # 3D view orchestrator
│   ├── canvas2d/             # 2D view orchestrator and drawing
│   ├── rendering/            # BabylonJS modules
│   ├── tools/                # canvas tools and ToolRegistry
│   ├── painting/             # paint strategies and behaviors
│   └── shapes/               # block shapes (cube, slab, stair)
├── hocs/              # Bridges from singletons to props
├── components/        # Atomic UI components
├── layouts/           # Toolbar, TabbedLayout, QuadLayout
├── panels/            # Canvas2DView, Preview3DView
├── views/             # WelcomeView, EditorView, TabbedEditorView, QuadEditorView
├── config/            # Static configuration (credits)
├── types/             # Shared TypeScript types
├── utils/             # Pure helpers
├── test/              # Test setup and fixtures
└── preview/           # Component preview gallery (#/preview)
```

**Dependency flow:** components → layouts → panels → views

- **components/**: single-responsibility MUI compositions. Buttons, menus, form controls, dialogs.
- **layouts/**: compose components into units such as the toolbar and the panel layouts.
- **panels/**: canvas elements for the 2D and 3D views. The singletons in `core/canvas2d/` and `core/Babylon3D.ts` do the drawing.
- **views/**: compose layouts and panels into screens. Use HOCs to inject state.

## File Naming Conventions

- Components: PascalCase (`ProjectCard.tsx`)
- HOCs: camelCase with the `with` prefix (`withProjectState.tsx`)
- Singletons: PascalCase (`EditorState.ts`), exported instance in camelCase (`editorState`)
- Commands: PascalCase ending in `Command` (`RenameProjectCommand.ts`)
- Utils: camelCase (`projectFile.ts`)
- Tests: `__tests__/<name>.test.ts` beside the code

## Import Organization

1. External dependencies (React, libraries)
2. Type imports
3. Core singletons, projections, commands
4. HOCs
5. Components
6. Utils
7. Styles

```typescript
import { Button } from '@mui/material';

import type { Project } from '../types';

import { editorState } from '../core/EditorState';

import { withProjectState } from '../hocs/withProjectState';

import { ProjectCard } from '../components/ProjectCard';

import { toProjectFileName } from '../utils/projectFile';
```

## TypeScript Guidelines

- Strict mode is on (`"strict": true`)
- Avoid `any`. Use `unknown` and type guards.
- Give functions explicit return types
- Use interfaces for object shapes and types for unions and primitives

## Testing

- `npm test` runs Vitest in jsdom. `fake-indexeddb` stands in for IndexedDB (`src/test/setup.ts`).
- `startProject()` in `src/test/projectFixture.ts` gives each test an empty log, a fresh current project, reset projections, and empty undo history
- Reducers, commands, and projections are tested directly. Components are pure functions of props.

## Performance

- Named functions make `React.memo` effective
- HOCs subscribe only to the notifications they need
- `RenderLoop` runs one requestAnimationFrame tick for every view. Views read cached projection state during the tick.
- Projections apply new rows in place. Only undo and redo replay a whole project.

## Code Review Checklist

Before committing, check:
- [ ] No inline anonymous callbacks
- [ ] One component per file
- [ ] Components under 350 lines
- [ ] Business logic in singletons, not components
- [ ] HOCs used for state
- [ ] No forbidden hook usage
- [ ] Notification names are specific
- [ ] `npm run type-check` passes
- [ ] `npm test` passes
- [ ] Imports organized
- [ ] Files in the correct folders
