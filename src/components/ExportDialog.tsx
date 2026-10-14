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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import type { ItemIcon } from '../utils/bedrockAddon';
import type { BuildSequence } from '../utils/bedrockAddonScript';
import type { CameraMode } from '../utils/cameraPath';

import { withExportState } from '../hocs/withExportState';
import type { WithExportStateProps } from '../hocs/withExportState';

import type { ExportEdition, SkippedBlock } from '../commands/exportParts';

import { Form } from './Form';
import { ModalDialog, IN_DIALOG_MENU_PROPS } from './ModalDialog';
import { NumberField } from './NumberField';

import { BEDROCK_VERSION, ITEM_ICONS, toAddonNames } from '../utils/bedrockAddon';
import { JAVA_VERSION } from '../utils/javaDatapack';
import type { WandRecipe } from '../utils/javaDatapack';

const TITLE_ID = 'export-title';

const EDITION_TEXT: Record<ExportEdition, { intro: string; name: string; skipped: string }> = {
  bedrock: {
    intro: `Saves an add-on with an item that builds this project around the player. Open the file to import it, then turn on its packs in a world's settings. It needs Bedrock ${BEDROCK_VERSION} or newer.`,
    name: 'Add-on name',
    skipped: 'These blocks have no Bedrock version and were left out',
  },
  java: {
    intro: `Saves a data pack with a wand that builds this project around the player. It needs Java ${JAVA_VERSION}.`,
    name: 'Data pack name',
    skipped: 'These blocks have no Java block state and were left out',
  },
};

const CAMERA_LABELS: Record<CameraMode, string> = {
  none: 'Player keeps control',
  orbit: 'Orbit the build, end at the player',
  lookAround: 'Look around from the player',
};

// The icon item's name goes in front: "Blaze Rod + Diamond"
const RECIPE_COSTS: Record<WandRecipe, string | null> = {
  none: null,
  gold: 'Gold Ingot',
  diamond: 'Diamond',
  netherStar: 'Nether Star',
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
  const { edition, addonName, itemName, icon, sequence, seconds, uses, camera, recipe } = exportOptions;
  const text = EDITION_TEXT[edition];
  const resolvedAddonName = addonName.trim() || projectName;
  const placeholderName = `${resolvedAddonName} Wand`;
  const { itemId, namespace } = toAddonNames(resolvedAddonName, projectId);
  const giveCommand = edition === 'java' ? `/function ${namespace}:give` : `/give @s ${itemId}`;
  const hasCamera = edition === 'bedrock' && sequence !== 'instant';

  const handleEditionChange = (_: React.MouseEvent<HTMLElement>, value: ExportEdition | null): void => {
    if (value) onExportOptionsChange({ edition: value });
  };
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
  const handleRecipeChange = (event: SelectChangeEvent<WandRecipe>): void => {
    onExportOptionsChange({ recipe: event.target.value as WandRecipe });
  };
  const toRecipeOption = ([value, cost]: [string, string | null]): [string, string] => [
    value,
    cost ? `Craft: ${ITEM_ICONS[icon]} + ${cost}` : 'No recipe',
  ];
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
      <DialogTitle id={TITLE_ID}>Export to Minecraft</DialogTitle>
      <Divider />
      <DialogContent>
        <Form>
          <ToggleButtonGroup value={edition} exclusive fullWidth size="small" onChange={handleEditionChange} aria-label="Minecraft edition">
            <ToggleButton value="bedrock">Bedrock</ToggleButton>
            <ToggleButton value="java">Java</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="body2" color="text.secondary">
            {text.intro}
          </Typography>

          <TextField
            label={text.name}
            value={addonName}
            placeholder={projectName}
            onChange={handleAddonNameChange}
            helperText={`In game: ${giveCommand}`}
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

          {sequence !== 'instant' && (
            <NumberField
              label="Animation seconds"
              value={seconds}
              onChange={handleSecondsChange}
              minValue={1}
              maxValue={60}
            />
          )}

          {hasCamera && (
            <FormControl fullWidth>
              <InputLabel id="export-camera-label">Camera</InputLabel>
              <Select
                labelId="export-camera-label"
                label="Camera"
                value={camera}
                onChange={handleCameraChange}
                MenuProps={IN_DIALOG_MENU_PROPS}
              >
                {Object.entries(CAMERA_LABELS).map(renderOption)}
              </Select>
            </FormControl>
          )}

          {edition === 'java' && (
            <FormControl fullWidth>
              <InputLabel id="export-recipe-label">Crafting recipe</InputLabel>
              <Select
                labelId="export-recipe-label"
                label="Crafting recipe"
                value={recipe}
                onChange={handleRecipeChange}
                MenuProps={IN_DIALOG_MENU_PROPS}
              >
                {Object.entries(RECIPE_COSTS).map(toRecipeOption).map(renderOption)}
              </Select>
            </FormControl>
          )}

          <NumberField
            label="Uses before it breaks (0 for unlimited)"
            value={uses}
            onChange={handleUsesChange}
            minValue={0}
            maxValue={1000}
          />

          {exportResult && edition === 'bedrock' && (
            <Alert severity="success">
              Saved {exportResult.fileName}. In game, find {itemName.trim() || placeholderName} in the creative
              inventory, or run <code>{exportResult.command}</code>.
            </Alert>
          )}

          {exportResult && edition === 'java' && (
            <Alert severity="success">
              Saved {exportResult.fileName}. For a new world, drag it into the Data Packs screen. For a saved world,
              put it in the world's <code>datapacks</code> folder and run <code>/reload</code>. Then run{' '}
              <code>{exportResult.command}</code> for the wand.
            </Alert>
          )}

          {exportResult && exportResult.skipped.length > 0 && (
            <Alert severity="warning">
              {text.skipped}: {exportResult.skipped.map(toSkippedLabel).join(', ')}.
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
