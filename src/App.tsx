import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { WelcomeView } from "./views/WelcomeView";
import { EditorView } from "./views/EditorView";
import { NewProjectDialog } from "./components/NewProjectDialog";
import { FileErrorSnackbar } from "./components/FileErrorSnackbar";
import { CreditsDialog } from "./components/CreditsDialog";
import { ComponentPreview } from "./preview/ComponentPreview";
import { createProjectCommand } from "./commands/CreateProjectCommand";
import { openProjectCommand } from "./commands/OpenProjectCommand";
import { loadProjectFileCommand } from "./commands/LoadProjectFileCommand";
import { screenRouter } from "./core/ScreenRouter";
import { withScreenState } from "./hocs/withScreenState";
import type { WithScreenStateProps } from "./hocs/withScreenState";
import { withAtlasStatus } from "./hocs/withAtlasStatus";
import type { WithAtlasStatusProps } from "./hocs/withAtlasStatus";
import type { Dimensions } from "./types";
import { toFileErrorMessage } from "./utils/projectFile";

// Create dark professional theme inspired by Adobe/Blender
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4a9eff",
      dark: "#3d8ae5",
    },
    secondary: {
      main: "#ff9f40",
      dark: "#e68a2e",
    },
    background: {
      default: "#1a1a1a",
      paper: "#2a2a2a",
    },
    divider: "#3a3a3a",
    text: {
      primary: "#e0e0e0",
      secondary: "#a0a0a0",
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  typography: {
    // Default font for general text
    fontFamily:
      '"Chakra Petch", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

    // Headers use Lexend
    h1: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
    },

    // Subtitle uses Lexend
    subtitle1: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    subtitle2: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },

    // Body text uses Chakra Petch (default)
    body1: {
      fontFamily:
        '"Chakra Petch", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    body2: {
      fontFamily:
        '"Chakra Petch", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },

    // Button text uses Chakra Petch
    button: {
      fontFamily:
        '"Chakra Petch", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
      textTransform: "none",
    },

    // Caption uses Chakra Petch
    caption: {
      fontFamily:
        '"Chakra Petch", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },

    // Overline uses Lexend (for labels)
    overline: {
      fontFamily:
        '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: "0.08em",
    },
  },
  components: {
    MuiToggleButton: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "#4a9eff",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#3d8ae5",
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          // Input fields use Red Hat Mono for data entry
          "& input": {
            fontFamily: '"Red Hat Mono", "Courier New", monospace',
            fontWeight: 500,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        label: {
          // Chips use Red Hat Mono for compact data display
          fontFamily: '"Red Hat Mono", "Courier New", monospace',
          fontWeight: 500,
        },
      },
    },
  },
});

/**
 * App - Root application component
 *
 * Renders the screen chosen by ScreenRouter: WelcomeView (project browser),
 * EditorView (main editor), or the component preview gallery (#/preview).
 * Handlers run commands, then tell ScreenRouter where to go.
 */
function AppComponent({
  screen,
  isNewProjectDialogOpen,
  isCreditsDialogOpen,
  fileError,
  atlasStatus,
}: WithScreenStateProps & WithAtlasStatusProps) {
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
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <ComponentPreview />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
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

      <FileErrorSnackbar message={fileError} onClose={screenRouter.dismissFileError} />
    </ThemeProvider>
  );
}

export const App = withAtlasStatus(withScreenState(AppComponent));
