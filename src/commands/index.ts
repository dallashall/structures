/**
 * Commands - Write side of CQRS architecture
 *
 * Commands handle business logic validation and append events to logs.
 * They query projections (read models) for validation but never modify them directly.
 *
 * Architecture:
 * - Commands that affect metadata → append to EventLog
 * - Commands that affect blocks → append to ModelHistory (via write())
 * - Cross-cutting commands (like ShrinkDimensions) query multiple projections
 */

export { createProjectCommand } from './CreateProjectCommand';
export { expandDimensionsCommand } from './ExpandDimensionsCommand';
export { shrinkDimensionsCommand } from './ShrinkDimensionsCommand';
export { renameProjectCommand } from './RenameProjectCommand';

// TODO: Add more commands:
// - PlaceMetaBlockCommand
// - ConfirmMetaBlockCommand
// Block commands use ModelHistory.write() directly (already implemented)
