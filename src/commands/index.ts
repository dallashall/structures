/**
 * Commands - Write side of CQRS architecture
 *
 * Commands validate against projections (read models), then append events to the EventLog
 * under the current project ID. They never modify projections directly.
 */

export { createProjectCommand } from './CreateProjectCommand';
export { openProjectCommand } from './OpenProjectCommand';
export { expandDimensionsCommand } from './ExpandDimensionsCommand';
export { shrinkDimensionsCommand } from './ShrinkDimensionsCommand';
export { renameProjectCommand } from './RenameProjectCommand';
export { setMetaBlockCommand } from './SetMetaBlockCommand';
export { confirmMetaBlockCommand } from './ConfirmMetaBlockCommand';
