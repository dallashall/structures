import {
  Alert,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import type { ItemIcon } from '../utils/bedrockAddon';
import type { BuildSequence } from '../utils/bedrockAddonScript';
import type { CameraMode } from '../utils/cameraPath';

import { withExportState } from '../hocs/withExportState';
import type { WithExportStateProps } from '../hocs/withExportState';

import type { SkippedBlock } from '../commands/ExportBedrockAddonCommand';

import { Form } from './Form';
import { ModalDialog, IN_DIALOG_MENU_PROPS } from './ModalDialog';
import { NumberField } from './NumberField';

import { ITEM_ICONS, toAddonNames } from '../utils/bedrockAddon';

const TITLE_ID = 'export-title';

const CAMERA_LABELS: Record<CameraMode, string> = {
  none: 'Player keeps control',
  orbit: 'Orbit the build, end at the player',
  lookAround: 'Look around from the player',
};

const SEQUENCE_LABELS: Record<BuildSequence, string> = {
  rise: 'Rise, layer by layer',
  rippleOut: 'Ripple out from the anchor',
  rippleIn: 'Ripple in toward the anchor',
  instant: 'All at once',
};

interface ExportDialogOwnProps {
  isOpen: boolean;
  onClose: () => void;
}

const toSkippedLabel = ({ name, count }: SkippedBlock): string => `${name} (${count})`;

function ExportDialogComponent({
  isOpen,
  onClose,
  exportOptions,
  projectName,
  projectId,
  isExporting,
  exportResult,
  exportError,
  onExportOptionsChange,
  onExport,
  onPreview,
  onExportReset,
}: ExportDialogOwnProps & WithExportStateProps) {
  const { addonName, itemName, icon, sequence, seconds, uses, camera } = exportOptions;
  const resolvedAddonName = addonName.trim() || projectName;
  const placeholderName = `${resolvedAddonName} Wand`;
  const { itemId } = toAddonNames(resolvedAddonName, projectId);

  const handleAddonNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onExportOptionsChange({ addonName: event.target.value });
  };
  const handleItemNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onExportOptionsChange({ itemName: event.target.value });
  };
  const handleIconChange = (event: SelectChangeEvent<ItemIcon>): void => {
    onExportOptionsChange({ icon: event.target.value as ItemIcon });
  };
  const handleSequenceChange = (event: SelectChangeEvent<BuildSequence>): void => {
    onExportOptionsChange({ sequence: event.target.value as BuildSequence });
  };
  const handleSecondsChange = (value: number): void => {
    onExportOptionsChange({ seconds: value });
  };
  const handleCameraChange = (event: SelectChangeEvent<CameraMode>): void => {
    onExportOptionsChange({ camera: event.target.value as CameraMode });
  };
  const handleUsesChange = (value: number): void => {
    onExportOptionsChange({ uses: value });
  };
  const handleClose = (): void => {
    onExportReset();
    onClose();
  };

  const renderOption = ([value, label]: [string, string]) => (
    <MenuItem key={value} value={value}>{label}</MenuItem>
  );

  return (
    <ModalDialog open={isOpen} onClose={handleClose} labelledBy={TITLE_ID} maxWidth="xs" fullWidth>
      <DialogTitle id={TITLE_ID}>Export for Bedrock</DialogTitle>
      <Divider />
      <DialogContent>
        <Form>
          <Typography variant="body2" color="text.secondary">
            Saves an add-on with an item that builds this project around the player. Open the file to import it,
            then turn on its packs in a world's settings.
          </Typography>

          <TextField
            label="Add-on name"
            value={addonName}
            placeholder={projectName}
            onChange={handleAddonNameChange}
            helperText={`In game: /give @s ${itemId}. A new name installs as a separate add-on.`}
            fullWidth
            slotProps={{ htmlInput: { 'data-autofocus': true }, inputLabel: { shrink: true } }}
          />

          <TextField
            label="Item name"
            value={itemName}
            placeholder={placeholderName}
            onChange={handleItemNameChange}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <FormControl fullWidth>
            <InputLabel id="export-icon-label">Item icon</InputLabel>
            <Select labelId="export-icon-label" label="Item icon" value={icon} onChange={handleIconChange} MenuProps={IN_DIALOG_MENU_PROPS}>
              {Object.entries(ITEM_ICONS).map(renderOption)}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="export-animation-label">Build animation</InputLabel>
            <Select
              labelId="export-animation-label"
              label="Build animation"
              value={sequence}
              onChange={handleSequenceChange}
              MenuProps={IN_DIALOG_MENU_PROPS}
            >
              {Object.entries(SEQUENCE_LABELS).map(renderOption)}
            </Select>
          </FormControl>

          <NumberField
            label="Animation seconds"
            value={seconds}
            onChange={handleSecondsChange}
            minValue={1}
            maxValue={60}
            disabled={sequence === 'instant'}
          />

          <FormControl fullWidth disabled={sequence === 'instant'}>
            <InputLabel id="export-camera-label">Camera</InputLabel>
            <Select
              labelId="export-camera-label"
              label="Camera"
              value={sequence === 'instant' ? 'none' : camera}
              onChange={handleCameraChange}
              MenuProps={IN_DIALOG_MENU_PROPS}
            >
              {Object.entries(CAMERA_LABELS).map(renderOption)}
            </Select>
          </FormControl>

          <NumberField
            label="Uses before it breaks (0 for unlimited)"
            value={uses}
            onChange={handleUsesChange}
            minValue={0}
            maxValue={1000}
          />

          {exportResult && (
            <Alert severity="success">
              Saved {exportResult.fileName}. In game, find {itemName.trim() || placeholderName} in the creative
              inventory, or run <code>/give @s {exportResult.itemId}</code>.
            </Alert>
          )}

          {exportResult && exportResult.skipped.length > 0 && (
            <Alert severity="warning">
              These blocks have no Bedrock version and were left out: {exportResult.skipped.map(toSkippedLabel).join(', ')}.
            </Alert>
          )}

          {exportError && <Alert severity="error">{exportError}</Alert>}
        </Form>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleClose}>
          Close
        </Button>
        <Button variant="outlined" onClick={onPreview} disabled={sequence === 'instant' || isExporting}>
          Preview
        </Button>
        <Button
          variant="contained"
          onClick={onExport}
          disabled={isExporting}
          startIcon={isExporting ? <CircularProgress size={16} /> : undefined}
        >
          Export
        </Button>
      </DialogActions>
    </ModalDialog>
  );
}

export const ExportDialog = withExportState<ExportDialogOwnProps>(ExportDialogComponent);
