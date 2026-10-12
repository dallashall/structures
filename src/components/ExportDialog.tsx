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

import type { AnimationMode, ItemIcon } from '../utils/bedrockAddon';

import { withExportState } from '../hocs/withExportState';
import type { WithExportStateProps } from '../hocs/withExportState';

import type { SkippedBlock } from '../commands/ExportBedrockAddonCommand';

import { Form } from './Form';
import { ModalDialog, IN_DIALOG_MENU_PROPS } from './ModalDialog';
import { NumberField } from './NumberField';

import { ITEM_ICONS } from '../utils/bedrockAddon';

const TITLE_ID = 'export-title';

const ANIMATION_LABELS: Record<AnimationMode, string> = {
  Layers: 'Layer by layer, bottom up',
  Blocks: 'Block by block, random order',
  None: 'All at once',
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
  isExporting,
  exportResult,
  exportError,
  onExportOptionsChange,
  onExport,
  onExportReset,
}: ExportDialogOwnProps & WithExportStateProps) {
  const { itemName, icon, animationMode, animationSeconds } = exportOptions;
  const placeholderName = `${projectName} Wand`;

  const handleItemNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onExportOptionsChange({ itemName: event.target.value });
  };
  const handleIconChange = (event: SelectChangeEvent<ItemIcon>): void => {
    onExportOptionsChange({ icon: event.target.value as ItemIcon });
  };
  const handleAnimationChange = (event: SelectChangeEvent<AnimationMode>): void => {
    onExportOptionsChange({ animationMode: event.target.value as AnimationMode });
  };
  const handleSecondsChange = (seconds: number): void => {
    onExportOptionsChange({ animationSeconds: seconds });
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
            label="Item name"
            value={itemName}
            placeholder={placeholderName}
            onChange={handleItemNameChange}
            fullWidth
            slotProps={{ htmlInput: { 'data-autofocus': true }, inputLabel: { shrink: true } }}
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
              value={animationMode}
              onChange={handleAnimationChange}
              MenuProps={IN_DIALOG_MENU_PROPS}
            >
              {Object.entries(ANIMATION_LABELS).map(renderOption)}
            </Select>
          </FormControl>

          <NumberField
            label="Animation seconds"
            value={animationSeconds}
            onChange={handleSecondsChange}
            minValue={1}
            maxValue={60}
            disabled={animationMode === 'None'}
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
