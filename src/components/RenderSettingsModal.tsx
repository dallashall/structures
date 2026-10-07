/**
 * RenderSettingsModal - Configuration dialog for 3D render settings
 *
 * Provides controls for PBR, edges, shadows, SSAO, bloom, and tone mapping.
 * Changes apply immediately (live preview). Settings persist per-project.
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Switch,
  Slider,
  Select,
  MenuItem,
  Stack,
  Divider,
  IconButton,
  TextField,
} from '@mui/material';
import { ExpandMore, Close } from '@mui/icons-material';

import type { RenderSettings, LightingPreset, BackgroundMode } from '../types';

import { SettingRow } from './SettingRow';

interface RenderSettingsModalProps {
  isOpen: boolean;
  settings: RenderSettings;
  onClose: () => void;
  onApply: (settings: RenderSettings) => void;
  onReset: () => void;
}

export function RenderSettingsModal({
  isOpen,
  settings,
  onClose,
  onApply,
  onReset,
}: RenderSettingsModalProps) {
  // Named handler creator: one toggle handler per boolean setting
  const createToggleHandler = (key: keyof RenderSettings) => () => {
    onApply({ ...settings, [key]: !settings[key] });
  };

  const handleSlider = (key: keyof RenderSettings) => (_event: Event, value: number | number[]) => {
    onApply({ ...settings, [key]: value as number });
  };

  const handleSelect = (key: keyof RenderSettings) => (event: any) => {
    onApply({ ...settings, [key]: Number(event.target.value) });
  };

  const handlePresetChange = (event: any) => {
    onApply({ ...settings, lightingPreset: event.target.value as LightingPreset });
  };

  const handleBackgroundChange = (event: any) => {
    onApply({ ...settings, backgroundMode: event.target.value as BackgroundMode });
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onApply({ ...settings, edgesColor: event.target.value });
  };

  const handleResetDefaults = () => {
    onReset();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { maxHeight: '80vh' },
        },
      }}
    >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
          <Typography variant="h6" component="div">Render Settings</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {/* Anti-Aliasing */}
        <Accordion defaultExpanded disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Anti-Aliasing</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <SettingRow label="FXAA">
                <Switch
                  checked={settings.fxaaEnabled}
                  onChange={createToggleHandler('fxaaEnabled')}
                  size="small"
                />
              </SettingRow>
              <SettingRow label="MSAA Samples">
                <Select
                  value={settings.msaaSamples}
                  onChange={handleSelect('msaaSamples')}
                  size="small"
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value={1}>Off (1x)</MenuItem>
                  <MenuItem value={2}>Low (2x)</MenuItem>
                  <MenuItem value={4}>Medium (4x)</MenuItem>
                  <MenuItem value={8}>High (8x)</MenuItem>
                </Select>
              </SettingRow>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Lighting & Environment */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Lighting & Environment</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <SettingRow label="Lighting Preset">
                <Select
                  value={settings.lightingPreset}
                  onChange={handlePresetChange}
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="night">Night</MenuItem>
                  <MenuItem value="cloudy">Cloudy</MenuItem>
                </Select>
              </SettingRow>
              <SettingRow label="Background">
                <Select
                  value={settings.backgroundMode}
                  onChange={handleBackgroundChange}
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="color">Flat Color</MenuItem>
                  <MenuItem value="skybox">Sky</MenuItem>
                  <MenuItem value="ground">Sky + Ground</MenuItem>
                </Select>
              </SettingRow>
              <Divider sx={{ my: 0.5 }} />

              <SettingRow label="PBR Materials">
                <Switch
                  checked={settings.pbrEnabled}
                  onChange={createToggleHandler('pbrEnabled')}
                  size="small"
                />
              </SettingRow>
              <SettingRow label="Environment Intensity">
                <Slider
                  value={settings.environmentIntensity}
                  onChange={handleSlider('environmentIntensity')}
                  min={0} max={2} step={0.1}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.pbrEnabled}
                />
              </SettingRow>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Edge Rendering */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Edge Rendering</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <SettingRow label="Enable Edges">
                <Switch
                  checked={settings.edgesEnabled}
                  onChange={createToggleHandler('edgesEnabled')}
                  size="small"
                />
              </SettingRow>
              <SettingRow label="Edge Width">
                <Slider
                  value={settings.edgesWidth}
                  onChange={handleSlider('edgesWidth')}
                  min={0.5} max={4} step={0.5}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.edgesEnabled}
                />
              </SettingRow>
              <SettingRow label="Edge Color">
                <TextField
                  type="color"
                  value={settings.edgesColor}
                  onChange={handleColorChange}
                  size="small"
                  disabled={!settings.edgesEnabled}
                  sx={{ width: 60 }}
                  slotProps={{ input: { sx: { p: 0.5, height: 32 } } }}
                />
              </SettingRow>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Shadows */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Shadows</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <SettingRow label="Enable Shadows">
                <Switch
                  checked={settings.shadowsEnabled}
                  onChange={createToggleHandler('shadowsEnabled')}
                  size="small"
                />
              </SettingRow>
              <SettingRow label="Shadow Quality">
                <Select
                  value={settings.shadowMapSize}
                  onChange={handleSelect('shadowMapSize')}
                  size="small"
                  disabled={!settings.shadowsEnabled}
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value={512}>Low (512)</MenuItem>
                  <MenuItem value={1024}>Medium (1024)</MenuItem>
                  <MenuItem value={2048}>High (2048)</MenuItem>
                </Select>
              </SettingRow>
              <SettingRow label="Shadow Darkness">
                <Slider
                  value={settings.shadowDarkness}
                  onChange={handleSlider('shadowDarkness')}
                  min={0} max={1} step={0.05}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.shadowsEnabled}
                />
              </SettingRow>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Ambient Occlusion */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Ambient Occlusion</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <SettingRow label="Enable SSAO">
                <Switch
                  checked={settings.ssaoEnabled}
                  onChange={createToggleHandler('ssaoEnabled')}
                  size="small"
                />
              </SettingRow>
              <SettingRow label="Radius">
                <Slider
                  value={settings.ssaoRadius}
                  onChange={handleSlider('ssaoRadius')}
                  min={0.5} max={4} step={0.25}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.ssaoEnabled}
                />
              </SettingRow>
              <SettingRow label="Intensity">
                <Slider
                  value={settings.ssaoIntensity}
                  onChange={handleSlider('ssaoIntensity')}
                  min={0.5} max={2} step={0.1}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.ssaoEnabled}
                />
              </SettingRow>
              <SettingRow label="Samples">
                <Select
                  value={settings.ssaoSamples}
                  onChange={handleSelect('ssaoSamples')}
                  size="small"
                  disabled={!settings.ssaoEnabled}
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value={8}>Low (8)</MenuItem>
                  <MenuItem value={16}>Medium (16)</MenuItem>
                  <MenuItem value={32}>High (32)</MenuItem>
                </Select>
              </SettingRow>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Post Processing */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Post Processing</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <SettingRow label="Enable Bloom">
                <Switch
                  checked={settings.bloomEnabled}
                  onChange={createToggleHandler('bloomEnabled')}
                  size="small"
                />
              </SettingRow>
              <SettingRow label="Bloom Intensity">
                <Slider
                  value={settings.bloomIntensity}
                  onChange={handleSlider('bloomIntensity')}
                  min={0} max={1} step={0.05}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.bloomEnabled}
                />
              </SettingRow>
              <SettingRow label="Bloom Threshold">
                <Slider
                  value={settings.bloomThreshold}
                  onChange={handleSlider('bloomThreshold')}
                  min={0.1} max={1.5} step={0.05}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.bloomEnabled}
                />
              </SettingRow>

              <Divider sx={{ my: 0.5 }} />

              <SettingRow label="Tone Mapping">
                <Switch
                  checked={settings.toneMapping}
                  onChange={createToggleHandler('toneMapping')}
                  size="small"
                />
              </SettingRow>
              <SettingRow label="Contrast">
                <Slider
                  value={settings.contrast}
                  onChange={handleSlider('contrast')}
                  min={0.5} max={2} step={0.05}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.toneMapping}
                />
              </SettingRow>
              <SettingRow label="Exposure">
                <Slider
                  value={settings.exposure}
                  onChange={handleSlider('exposure')}
                  min={0.5} max={2} step={0.05}
                  size="small"
                  valueLabelDisplay="auto"
                  disabled={!settings.toneMapping}
                />
              </SettingRow>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Layer Highlight */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">Layer Highlight</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <SettingRow label="Highlight Active Layer">
                <Switch
                  checked={settings.layerHighlightEnabled}
                  onChange={createToggleHandler('layerHighlightEnabled')}
                  size="small"
                />
              </SettingRow>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button
          onClick={handleResetDefaults}
          variant="text"
          size="small"
          sx={{ mr: 'auto' }}
        >
          Reset to Defaults
        </Button>
        <Button onClick={onClose} variant="outlined" size="small">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
