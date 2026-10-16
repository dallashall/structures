import type { ColorScheme } from '../config/colorSchemes';

import { EventEmitter } from './EventEmitter';

export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mc-blueprint-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'];

const isThemeChoice = (value: unknown): value is ThemeChoice =>
  THEME_CHOICES.includes(value as ThemeChoice);

/**
 * ThemePreference - The light, dark, or system theme choice, and the color scheme it resolves to
 *
 * The choice lives in localStorage, outside any project. Storage can throw in private windows,
 * so a failed read falls back to system and a failed write keeps the choice for this session only.
 *
 * Events:
 * - themechoice:selected (choice) - The user picked light, dark, or system
 * - colorscheme:switched (scheme) - The resolved scheme flipped, from a new choice or an OS setting change
 */
class ThemePreference extends EventEmitter {
  private static instance: ThemePreference;
  private choice: ThemeChoice = readStoredChoice();
  private darkQuery: MediaQueryList | null =
    typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  private scheme: ColorScheme = this.resolveScheme();

  private constructor() {
    super();
    this.darkQuery?.addEventListener('change', this.handleSystemSchemeChange);
  }

  static getInstance(): ThemePreference {
    if (!ThemePreference.instance) {
      ThemePreference.instance = new ThemePreference();
    }
    return ThemePreference.instance;
  }

  getChoice(): ThemeChoice {
    return this.choice;
  }

  getScheme(): ColorScheme {
    return this.scheme;
  }

  selectChoice = (choice: ThemeChoice): void => {
    if (choice === this.choice) return;
    this.choice = choice;
    writeStoredChoice(choice);
    this.emit('themechoice:selected', choice);
    this.applyResolvedScheme();
  };

  private handleSystemSchemeChange = (): void => {
    this.applyResolvedScheme();
  };

  private resolveScheme(): ColorScheme {
    if (this.choice !== 'system') return this.choice;
    return this.darkQuery?.matches ? 'dark' : 'light';
  }

  private applyResolvedScheme(): void {
    const scheme = this.resolveScheme();
    if (scheme === this.scheme) return;
    this.scheme = scheme;
    this.emit('colorscheme:switched', scheme);
  }
}

function readStoredChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writeStoredChoice(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // The choice still applies for this session
  }
}

export const themePreference = ThemePreference.getInstance();
