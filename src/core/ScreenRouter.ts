import { EventEmitter } from './EventEmitter';

export type Screen = 'welcome' | 'editor' | 'preview';

// URL hash that shows the component preview gallery instead of the app
const PREVIEW_HASH_PREFIX = '#/preview';

/**
 * ScreenRouter - Which top-level screen is shown, and whether the new project dialog is open
 *
 * The #/preview hash overrides the app screens with the component preview gallery.
 *
 * Events:
 * - screen:shown (screen) - The visible screen switched
 * - newprojectdialog:toggled (isOpen) - The new project dialog opened or closed
 */
class ScreenRouter extends EventEmitter {
  private static instance: ScreenRouter;
  private appScreen: 'welcome' | 'editor' = 'welcome';
  private isPreviewHash = window.location.hash.startsWith(PREVIEW_HASH_PREFIX);
  private newProjectDialogOpen = false;

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

  private handleHashChange = (): void => {
    const isPreviewHash = window.location.hash.startsWith(PREVIEW_HASH_PREFIX);
    if (this.isPreviewHash === isPreviewHash) return;
    this.isPreviewHash = isPreviewHash;
    this.emit('screen:shown', this.getScreen());
  };
}

export const screenRouter = ScreenRouter.getInstance();
