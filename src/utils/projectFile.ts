/**
 * Project file codec - one project's event log as a JSON document on disk
 *
 * A file holds the project's event rows in log order, so undo history survives a round trip.
 * Rows drop the log's auto-increment id and projectId. Loading assigns a new project ID,
 * so a file loads beside the project it came from without colliding with it.
 */

import { ACTION_STARTED, type Event } from '../core/EventLog';

export const PROJECT_FILE_FORMAT = 'mc-blueprint';
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXTENSION = '.mcblueprint';
export const PROJECT_FILE_TYPE = {
  description: 'Structures project',
  mimeType: 'application/json',
  extension: PROJECT_FILE_EXTENSION,
};

export interface ProjectFileEvent {
  type: string;
  data: unknown;
  timestamp: number;
  actionId?: string;
}

export interface ProjectFile {
  format: typeof PROJECT_FILE_FORMAT;
  version: number;
  // Informational only. The name the app shows comes from the metadata events.
  name: string;
  savedAt: number;
  events: ProjectFileEvent[];
}

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectFileError';
  }
}

const toFileEvent = ({ type, data, timestamp, actionId }: Event): ProjectFileEvent =>
  actionId === undefined ? { type, data, timestamp } : { type, data, timestamp, actionId };

export function toProjectFile(name: string, events: Event[], savedAt: number): ProjectFile {
  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    name,
    savedAt,
    events: events.map(toFileEvent),
  };
}

export function serializeProjectFile(file: ProjectFile): string {
  return JSON.stringify(file, null, 2);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFileEvent = (value: unknown): value is ProjectFileEvent =>
  isRecord(value)
  && typeof value.type === 'string'
  && 'data' in value
  && typeof value.timestamp === 'number'
  && (value.actionId === undefined || typeof value.actionId === 'string');

/**
 * Parse and check a project file. Throws ProjectFileError when the text is not a loadable file.
 */
export function parseProjectFile(text: string): ProjectFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ProjectFileError('The file is not valid JSON.');
  }

  if (!isRecord(parsed) || parsed.format !== PROJECT_FILE_FORMAT) {
    throw new ProjectFileError('The file is not a Structures project file.');
  }
  if (typeof parsed.version !== 'number' || parsed.version > PROJECT_FILE_VERSION) {
    throw new ProjectFileError('The file comes from a newer version of Structures.');
  }
  if (!Array.isArray(parsed.events) || !parsed.events.every(isFileEvent)) {
    throw new ProjectFileError('The file has a damaged event list.');
  }

  const events = parsed.events as ProjectFileEvent[];
  if (events[0]?.type !== 'metadata:created') {
    throw new ProjectFileError('The file has no project creation event.');
  }

  return {
    format: PROJECT_FILE_FORMAT,
    version: parsed.version,
    name: typeof parsed.name === 'string' ? parsed.name : '',
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    events,
  };
}

/**
 * Rows ready to append for a project loaded under projectId.
 *
 * Action IDs get fresh values. EventLog looks actions up by actionId alone, across projects,
 * so a second load of the same file would otherwise merge its actions with the first.
 * Undo and redo markers name their target action, so targets take the same new values.
 */
export function toLoadedEvents(file: ProjectFile, projectId: string, createId: () => string): Event[] {
  const actionIds = new Map<string, string>();
  const remapActionId = (actionId: string): string => {
    const existing = actionIds.get(actionId);
    if (existing) return existing;
    const created = createId();
    actionIds.set(actionId, created);
    return created;
  };

  const remapData = ({ type, data }: ProjectFileEvent): unknown => {
    if (!isRecord(data)) return data;
    if (type === 'metadata:created') return { ...data, id: projectId };
    if (type === 'model:initialized') return { ...data, projectId };
    if (type === ACTION_STARTED && typeof data.target === 'string') {
      return { ...data, target: remapActionId(data.target) };
    }
    return data;
  };

  const toEvent = (event: ProjectFileEvent): Event => {
    const loaded: Event = { type: event.type, data: remapData(event), timestamp: event.timestamp, projectId };
    if (event.actionId !== undefined) loaded.actionId = remapActionId(event.actionId);
    return loaded;
  };

  return file.events.map(toEvent);
}

/**
 * The project name after the file's metadata events, which is the name the app would show
 */
export function toProjectName(file: ProjectFile): string {
  let name = '';
  for (const { type, data } of file.events) {
    if (!isRecord(data)) continue;
    if (type === 'metadata:created' && typeof data.name === 'string') name = data.name;
    if (type === 'metadata:renamed' && typeof data.newName === 'string') name = data.newName;
  }
  return name;
}

/**
 * The name unchanged when no other project has it, else the first free "(from file)" variant
 */
export function toUnusedName(name: string, takenNames: ReadonlySet<string>): string {
  if (!takenNames.has(name)) return name;
  let candidate = `${name} (from file)`;
  for (let count = 2; takenNames.has(candidate); count++) {
    candidate = `${name} (from file ${count})`;
  }
  return candidate;
}

/**
 * Message for the user. A ProjectFileError already says what is wrong with the file.
 */
export function toFileErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ProjectFileError ? error.message : fallback;
}

// Characters that Windows or macOS refuse in a file name
const UNSAFE_FILE_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;

export function toProjectFileName(name: string): string {
  const base = name.replace(UNSAFE_FILE_NAME_CHARS, '').trim() || 'project';
  return `${base}${PROJECT_FILE_EXTENSION}`;
}
