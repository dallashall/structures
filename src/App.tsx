import { ThemeProvider, CssBaseline } from "@mui/material";

import type { Theme } from "@mui/material";
import type { ColorScheme } from "./config/colorSchemes";
import type { Dimensions } from "./types";

import { createAppTheme } from "./config/theme";

import { createProjectCommand } from "./commands/CreateProjectCommand";
import { loadProjectFileCommand } from "./commands/LoadProjectFileCommand";
import { openProjectCommand } from "./commands/OpenProjectCommand";
import { screenRouter } from "./core/ScreenRouter";

import { withAtlasStatus } from "./hocs/withAtlasStatus";
import type { WithAtlasStatusProps } from "./hocs/withAtlasStatus";
import { withScreenState } from "./hocs/withScreenState";
import type { WithScreenStateProps } from "./hocs/withScreenState";
import { withThemePreference } from "./hocs/withThemePreference";
import type { WithThemePreferenceProps } from "./hocs/withThemePreference";

import { CreditsDialog } from "./components/CreditsDialog";
import { ExportDialog } from "./components/ExportDialog";
import { FileErrorSnackbar } from "./components/FileErrorSnackbar";
import { NewProjectDialog } from "./components/NewProjectDialog";
import { ComponentPreview } from "./preview/ComponentPreview";
import { EditorView } from "./views/EditorView";
import { WelcomeView } from "./views/WelcomeView";

import { toFileErrorMessage } from "./utils/projectFile";

// Both themes build once at load. A scheme switch picks the other object.
const THEMES: Record<ColorScheme, Theme> = {
  light: createAppTheme("light"),
  dark: createAppTheme("dark"),
};

/**
 * Renders the screen ScreenRouter chose: WelcomeView, EditorView, or the preview gallery (#/preview).
 * Handlers run commands, then tell ScreenRouter where to go.
 */
function AppComponent({
  screen,
  isNewProjectDialogOpen,
  isCreditsDialogOpen,
  isExportDialogOpen,
  fileError,
  atlasStatus,
  colorScheme,
}: WithScreenStateProps & WithAtlasStatusProps & WithThemePreferenceProps) {
  const theme = THEMES[colorScheme];

  const handleCreateProject = async (name: string, dimensions: Dimensions) => {
    await createProjectCommand.execute(name, dimensions);
    screenRouter.closeNewProjectDialog();
    screenRouter.showEditor();
  };

  const handleOpenProject = async (projectId: string) => {
    if (await openProjectCommand.execute(projectId)) {
      screenRouter.showEditor();
    }
  };

  const handleLoadFromFile = async () => {
    try {
      if (await loadProjectFileCommand.execute()) {
        screenRouter.showEditor();
      }
    } catch (error) {
      console.error("Failed to load project file:", error);
      screenRouter.showFileError(toFileErrorMessage(error, "The project file could not be loaded."));
    }
  };

  if (screen === "preview") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <ComponentPreview />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {screen === "welcome" ? (
        <WelcomeView
          onNewProject={screenRouter.openNewProjectDialog}
          onOpenProject={handleOpenProject}
          onLoadFromFile={handleLoadFromFile}
          onShowCredits={screenRouter.openCreditsDialog}
          areTexturesMissing={atlasStatus === "missing"}
        />
      ) : (
        <EditorView onBackToWelcome={screenRouter.showWelcome} />
      )}

      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        onClose={screenRouter.closeNewProjectDialog}
        onCreate={handleCreateProject}
      />

      <CreditsDialog isOpen={isCreditsDialogOpen} onClose={screenRouter.closeCreditsDialog} />
      <ExportDialog isOpen={isExportDialogOpen} onClose={screenRouter.closeExportDialog} />

      <FileErrorSnackbar message={fileError} onClose={screenRouter.dismissFileError} />
    </ThemeProvider>
  );
}

export const App = withThemePreference(withAtlasStatus(withScreenState(AppComponent)));
