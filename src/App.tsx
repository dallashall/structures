import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { WelcomeView } from './views/WelcomeView';
import { EditorView } from './views/EditorView';
import { NewProjectDialog } from './components/NewProjectDialog';
import { ComponentPreview } from './preview/ComponentPreview';
import { projectManager } from './core/ProjectManager';
import { storageManager } from './core/StorageManager';
import type { Dimensions } from './types';

// Create dark professional theme inspired by Adobe/Blender
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4a9eff',
      dark: '#3d8ae5',
    },
    secondary: {
      main: '#ff9f40',
      dark: '#e68a2e',
    },
    background: {
      default: '#1a1a1a',
      paper: '#2a2a2a',
    },
    divider: '#3a3a3a',
    text: {
      primary: '#e0e0e0',
      secondary: '#a0a0a0',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#4a9eff',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#3d8ae5',
            },
          },
        },
      },
    },
  },
});

type AppView = 'welcome' | 'editor';

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
  const [currentView, setCurrentView] = React.useState<AppView>('welcome');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = React.useState(false);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);

  // Check for preview mode in hash on mount and hash changes
  React.useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      setIsPreviewMode(hash.startsWith('#/preview'));
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Handle new project
  const handleNewProject = () => {
    setIsNewProjectDialogOpen(true);
  };

  // Handle project creation
  const handleCreateProject = (name: string, dimensions: Dimensions) => {
    projectManager.createProject(name, dimensions);
    setIsNewProjectDialogOpen(false);
    setCurrentView('editor');
  };

  // Handle open project from welcome screen
  const handleOpenProject = async (projectId: string) => {
    const project = await storageManager.loadProject(projectId);
    if (project) {
      projectManager.loadProject(project);
      setCurrentView('editor');
    }
  };

  // Handle load from file
  const handleLoadFromFile = () => {
    // TODO: Implement file picker and import
    console.log('Load from file not yet implemented');
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
      {currentView === 'welcome' ? (
        <WelcomeView
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onLoadFromFile={handleLoadFromFile}
        />
      ) : (
        <EditorView />
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
