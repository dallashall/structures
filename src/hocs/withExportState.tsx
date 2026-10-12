import React from 'react';

import type { BedrockExportOptions, BedrockExportResult } from '../commands/ExportBedrockAddonCommand';

import { exportBedrockAddonCommand } from '../commands/ExportBedrockAddonCommand';
import { metadataProjection } from '../projections/MetadataProjection';

export interface WithExportStateProps {
  exportOptions: BedrockExportOptions;
  projectName: string;
  isExporting: boolean;
  exportResult: BedrockExportResult | null;
  exportError: string | null;
  onExportOptionsChange: (changes: Partial<BedrockExportOptions>) => void;
  onExport: () => void;
  onExportReset: () => void;
}

const DEFAULT_OPTIONS: BedrockExportOptions = {
  itemName: '',
  icon: 'blaze_rod',
  animationMode: 'Layers',
  animationSeconds: 5,
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The add-on could not be exported.';

/**
 * HOC that holds the export form, runs ExportBedrockAddonCommand, and keeps its last result for the dialog.
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

    const handleReset = (): void => {
      setResult(null);
      setError(null);
    };

    return (
      <Component
        {...props}
        exportOptions={options}
        projectName={metadataProjection.getCached()?.name ?? 'Build'}
        isExporting={isExporting}
        exportResult={result}
        exportError={error}
        onExportOptionsChange={handleOptionsChange}
        onExport={handleExport}
        onExportReset={handleReset}
      />
    );
  };
}
