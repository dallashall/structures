import { EventEmitter } from './EventEmitter';

export type Screen = 'welcome' | 'editor' | 'preview';

// URL hash that shows the component preview gallery instead of the app
const PREVIEW_HASH_PREFIX = '#/preview';

/**
 * ScreenRouter - Which top-level screen is shown, which app-level dialog is open,
 * and which file error message is on screen
 *
 * The #/preview hash overrides the app screens with the component preview gallery.
 *
 * Events:
 * - screen:shown (screen) - The visible screen switched
 * - newprojectdialog:toggled (isOpen) - The new project dialog opened or closed
 * - creditsdialog:toggled (isOpen) - The credits dialog opened or closed
 * - file-error:shown (message) - A file save or load failed
 * - file-error:dismissed - The file error message closed
 */
class ScreenRouter extends EventEmitter {
  private static instance: ScreenRouter;
  private appScreen: 'welcome' | 'editor' = 'welcome';
  private isPreviewHash = window.location.hash.startsWith(PREVIEW_HASH_PREFIX);
  private newProjectDialogOpen = false;
  private fileError: string | null = null;
  private creditsDialogOpen = false;

  private constructor() {
    super();
    window.addEventListener('hashchange', this.handleHashChange);
  }

  static getInstance(): ScreenRouter {
    if (!ScreenRouter.instance) {
      ScreenRouter.instance = new ScreenRouter();
    }
    return ScreenRouter.instance;
  }

  getScreen(): Screen {
    return this.isPreviewHash ? 'preview' : this.appScreen;
  }

  isNewProjectDialogOpen(): boolean {
    return this.newProjectDialogOpen;
  }

  isCreditsDialogOpen(): boolean {
    return this.creditsDialogOpen;
  }

  openCreditsDialog = (): void => {
    this.setCreditsDialogOpen(true);
  };

  closeCreditsDialog = (): void => {
    this.setCreditsDialogOpen(false);
  };

  getFileError(): string | null {
    return this.fileError;
  }

  showFileError = (message: string): void => {
    this.fileError = message;
    this.emit('file-error:shown', message);
  };

  dismissFileError = (): void => {
    if (this.fileError === null) return;
    this.fileError = null;
    this.emit('file-error:dismissed');
  };

  showWelcome = (): void => {
    this.showAppScreen('welcome');
  };

  showEditor = (): void => {
    this.showAppScreen('editor');
  };

  openNewProjectDialog = (): void => {
    this.setNewProjectDialogOpen(true);
  };

  closeNewProjectDialog = (): void => {
    this.setNewProjectDialogOpen(false);
  };

  private showAppScreen(screen: 'welcome' | 'editor'): void {
    if (this.appScreen === screen) return;
    this.appScreen = screen;
    this.emit('screen:shown', this.getScreen());
  }

  private setNewProjectDialogOpen(isOpen: boolean): void {
    if (this.newProjectDialogOpen === isOpen) return;
    this.newProjectDialogOpen = isOpen;
    this.emit('newprojectdialog:toggled', isOpen);
  }

  private setCreditsDialogOpen(isOpen: boolean): void {
    if (this.creditsDialogOpen === isOpen) return;
    this.creditsDialogOpen = isOpen;
    this.emit('creditsdialog:toggled', isOpen);
  }

  private handleHashChange = (): void => {
    const isPreviewHash = window.location.hash.startsWith(PREVIEW_HASH_PREFIX);
    if (this.isPreviewHash === isPreviewHash) return;
    this.isPreviewHash = isPreviewHash;
    this.emit('screen:shown', this.getScreen());
  };
}

export const screenRouter = ScreenRouter.getInstance();
