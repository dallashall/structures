import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThemeChoice } from '../ThemePreference';

const STORAGE_KEY = 'mc-blueprint-theme';

interface FakeDarkQuery {
  matches: boolean;
  listener: (() => void) | null;
}

// Node 25 defines a global localStorage that shadows jsdom's and lacks most methods, so each test installs this one
class MemoryStorage {
  private values = new Map<string, string>();
  failWrites = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('denied');
    this.values.set(key, value);
  }
}

// The singleton reads storage and the media query when its module loads, so each test loads a fresh copy
async function loadThemePreference() {
  vi.resetModules();
  const module = await import('../ThemePreference');
  return module.themePreference;
}

function stubDarkQuery(matches: boolean): FakeDarkQuery {
  const query: FakeDarkQuery = { matches, listener: null };
  const addEventListener = (_type: string, listener: () => void): void => {
    query.listener = listener;
  };
  const matchMedia = (): unknown => ({
    get matches() {
      return query.matches;
    },
    addEventListener,
  });
  vi.stubGlobal('matchMedia', matchMedia);
  return query;
}

describe('ThemePreference', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to system and follows the OS scheme', async () => {
    stubDarkQuery(true);
    const themePreference = await loadThemePreference();

    expect(themePreference.getChoice()).toBe('system');
    expect(themePreference.getScheme()).toBe('dark');
  });

  it('reads a stored choice and ignores an unknown value', async () => {
    stubDarkQuery(true);
    storage.setItem(STORAGE_KEY, 'light');
    expect((await loadThemePreference()).getScheme()).toBe('light');

    storage.setItem(STORAGE_KEY, 'sepia');
    expect((await loadThemePreference()).getChoice()).toBe('system');
  });

  it('stores a selected choice and emits both events when the scheme flips', async () => {
    stubDarkQuery(false);
    const themePreference = await loadThemePreference();
    const selected: ThemeChoice[] = [];
    const switched: string[] = [];
    const recordSelected = (choice: ThemeChoice): void => { selected.push(choice); };
    const recordSwitched = (scheme: string): void => { switched.push(scheme); };
    themePreference.on('themechoice:selected', recordSelected);
    themePreference.on('colorscheme:switched', recordSwitched);

    themePreference.selectChoice('dark');

    expect(storage.getItem(STORAGE_KEY)).toBe('dark');
    expect(selected).toEqual(['dark']);
    expect(switched).toEqual(['dark']);
  });

  it('emits no scheme switch when the new choice resolves to the same scheme', async () => {
    stubDarkQuery(false);
    const themePreference = await loadThemePreference();
    const switched: string[] = [];
    const recordSwitched = (scheme: string): void => { switched.push(scheme); };
    themePreference.on('colorscheme:switched', recordSwitched);

    themePreference.selectChoice('light');

    expect(switched).toEqual([]);
  });

  it('switches with the OS only while the choice is system', async () => {
    const query = stubDarkQuery(false);
    const themePreference = await loadThemePreference();

    query.matches = true;
    query.listener?.();
    expect(themePreference.getScheme()).toBe('dark');

    themePreference.selectChoice('light');
    query.matches = false;
    query.listener?.();
    query.matches = true;
    query.listener?.();
    expect(themePreference.getScheme()).toBe('light');
  });

  it('keeps the choice for the session when storage throws', async () => {
    stubDarkQuery(false);
    storage.failWrites = true;
    const themePreference = await loadThemePreference();

    themePreference.selectChoice('dark');

    expect(themePreference.getScheme()).toBe('dark');
  });
});
