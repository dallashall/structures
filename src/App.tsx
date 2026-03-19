import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useState, useEffect } from "react";
import { WelcomeView } from "./views/WelcomeView";
import { EditorView } from "./views/EditorView";
import { NewProjectDialog } from "./components/NewProjectDialog";
import { ComponentPreview } from "./preview/ComponentPreview";
import { createProjectCommand } from "./commands/CreateProjectCommand";
import { storage } from "./core/Storage";
import { editorState } from "./core/EditorState";
import { keyboardManager } from "./core/KeyboardManager";
import { metadataProjection } from "./projections/MetadataProjection";
import { modelProjection } from "./projections/ModelProjection";
import { blockProjection } from "./projections/BlockProjection";
import type { Dimensions } from "./types";

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

type AppView = "welcome" | "editor";

/**
 * App - Root application component
 *
 * Manages top-level application state and routing between:
 * - WelcomeView (project browser)
 * - EditorView (main editor)
 *
 * Handles project creation and loading flow.
 */
export function App() {
  const [currentView, setCurrentView] = useState<AppView>("welcome");
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Initialize keyboard shortcuts (once on mount)
  useEffect(() => {
    keyboardManager.initialize();
    return () => keyboardManager.destroy();
  }, []);

  // Check for preview mode in hash on mount and hash changes
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      setIsPreviewMode(hash.startsWith("#/preview"));
    };

    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  // Load last opened project on startup
  useEffect(() => {
    const loadLastProject = async () => {
      const lastProjectId = storage.getLastOpenedProjectId();
      if (lastProjectId) {
        // If there was a last opened project, open it automatically
        const project = storage.getProject(lastProjectId);
        if (project) {
          // Set project ID BEFORE resetting projections so rebuild() filters correctly
          editorState.setCurrentProjectId(lastProjectId);
          editorState.setPlacementMode(false);
          metadataProjection.reset();
          modelProjection.reset();
          blockProjection.reset();
          await Promise.all([
            metadataProjection.ensureFresh(),
            modelProjection.ensureFresh(),
            blockProjection.ensureFresh(),
          ]);
          setCurrentView("editor");
        }
      }
    };

    void loadLastProject();
  }, []);

  // Handle new project
  const handleNewProject = () => {
    setIsNewProjectDialogOpen(true);
  };

  // Handle project creation
  const handleCreateProject = async (name: string, dimensions: Dimensions) => {
    await createProjectCommand.execute(name, dimensions);
    setIsNewProjectDialogOpen(false);
    setCurrentView("editor");
  };

  // Handle open project from welcome screen
  const handleOpenProject = async (projectId: string) => {
    // Reset projections and rebuild for new project
    metadataProjection.reset();
    modelProjection.reset();
    blockProjection.reset();
    editorState.setCurrentProjectId(projectId);
    editorState.setPlacementMode(false);
    storage.setLastOpenedProjectId(projectId);

    // Wait for projections to rebuild with new project data
    await Promise.all([
      metadataProjection.ensureFresh(),
      modelProjection.ensureFresh(),
      blockProjection.ensureFresh(),
    ]);

    setCurrentView("editor");
  };

  // Handle back to welcome (close current project)
  const handleBackToWelcome = () => {
    setCurrentView("welcome");
  };

  // Handle load from file
  const handleLoadFromFile = () => {
    // TODO: Implement file picker and import
    console.log("Load from file not yet implemented");
  };

  // Handle close project dialog
  const handleCloseProjectDialog = () => {
    setIsNewProjectDialogOpen(false);
  };

  // Render preview mode if hash is #/preview
  if (isPreviewMode) {
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
      {currentView === "welcome" ? (
        <WelcomeView
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onLoadFromFile={handleLoadFromFile}
        />
      ) : (
        <EditorView onBackToWelcome={handleBackToWelcome} />
      )}

      {/* New Project Dialog */}
      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        onClose={handleCloseProjectDialog}
        onCreate={handleCreateProject}
      />
    </ThemeProvider>
  );
}
