import React from 'react';

import type { BedrockExportOptions, BedrockExportResult } from '../commands/ExportBedrockAddonCommand';

import { exportBedrockAddonCommand } from '../commands/ExportBedrockAddonCommand';
import { metadataProjection } from '../projections/MetadataProjection';
import { babylon3d } from '../core/Babylon3D';
import { editorState } from '../core/EditorState';
import { screenRouter } from '../core/ScreenRouter';
import type { ViewType } from '../types';

export interface WithExportStateProps {
  exportOptions: BedrockExportOptions;
  projectName: string;
  projectId: string;
  isExporting: boolean;
  exportResult: BedrockExportResult | null;
  exportError: string | null;
  onExportOptionsChange: (changes: Partial<BedrockExportOptions>) => void;
  onExport: () => void;
  onPreview: () => void;
  onExportReset: () => void;
}

const DEFAULT_OPTIONS: BedrockExportOptions = {
  addonName: '',
  itemName: '',
  icon: 'blaze_rod',
  sequence: 'rise',
  seconds: 6,
  uses: 0,
  camera: 'none',
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The add-on could not be exported.';

/**
 * HOC that holds the export form, runs ExportBedrockAddonCommand, plays the 3D preview, and keeps the last
 * export result for the dialog.
 * The options persist between openings. The result and error clear on reset.
 */
export function withExportState<P extends object>(
  Component: React.ComponentType<P & WithExportStateProps>,
) {
  return function WithExportState(props: P) {
    const [options, setOptions] = React.useState<BedrockExportOptions>(DEFAULT_OPTIONS);
    const [isExporting, setIsExporting] = React.useState(false);
    const [result, setResult] = React.useState<BedrockExportResult | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const handleOptionsChange = (changes: Partial<BedrockExportOptions>): void => {
      const applyChanges = (current: BedrockExportOptions): BedrockExportOptions => ({ ...current, ...changes });
      setOptions(applyChanges);
      setResult(null);
    };

    const handleExport = (): void => {
      const showResult = (exported: BedrockExportResult): void => {
        setResult(exported.isSaved ? exported : null);
        setIsExporting(false);
      };
      const showError = (failure: unknown): void => {
        setError(toErrorMessage(failure));
        setIsExporting(false);
      };
      setIsExporting(true);
      setResult(null);
      setError(null);
      exportBedrockAddonCommand.execute(options).then(showResult, showError);
    };

    // The dialog steps aside while the 3D view plays the animation, then comes back
    const handlePreview = (): void => {
      if (options.sequence === 'instant') return;
      screenRouter.closeExportDialog();
      if (editorState.getLayoutMode() === 'tabbed') editorState.setActiveView('3d' as ViewType);
      const reopen = (): void => screenRouter.openExportDialog();
      babylon3d.playBuildPreview(options.sequence, options.seconds).then(reopen, reopen);
    };

    const handleReset = (): void => {
      setResult(null);
      setError(null);
    };

    return (
      <Component
        {...props}
        exportOptions={options}
        projectName={metadataProjection.getCached()?.name ?? 'Build'}
        projectId={editorState.getCurrentProjectId() ?? ''}
        isExporting={isExporting}
        exportResult={result}
        exportError={error}
        onExportOptionsChange={handleOptionsChange}
        onExport={handleExport}
        onPreview={handlePreview}
        onExportReset={handleReset}
      />
    );
  };
}
