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
  Typography,
  Select,
  MenuItem,
  Divider,
  IconButton,
  TextField,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';

import type { RenderSettings, LightingPreset, BackgroundMode } from '../types';

import { SettingRow } from './SettingRow';
import { SettingsSection } from './SettingsSection';
import { SliderSetting } from './SliderSetting';
import { SwitchSetting } from './SwitchSetting';

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

  const handleSelect = (key: keyof RenderSettings) => (event: SelectChangeEvent<number>) => {
    onApply({ ...settings, [key]: Number(event.target.value) });
  };

  const handlePresetChange = (event: SelectChangeEvent<LightingPreset>) => {
    onApply({ ...settings, lightingPreset: event.target.value as LightingPreset });
  };

  const handleBackgroundChange = (event: SelectChangeEvent<BackgroundMode>) => {
    onApply({ ...settings, backgroundMode: event.target.value as BackgroundMode });
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onApply({ ...settings, edgesColor: event.target.value });
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
        <SettingsSection title="Anti-Aliasing" defaultExpanded>
          <SwitchSetting label="FXAA" checked={settings.fxaaEnabled} onChange={createToggleHandler('fxaaEnabled')} />
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
        </SettingsSection>

        <SettingsSection title="Lighting & Environment">
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

          <SwitchSetting label="PBR Materials" checked={settings.pbrEnabled} onChange={createToggleHandler('pbrEnabled')} />
          <SliderSetting label="Environment Intensity" value={settings.environmentIntensity} onChange={handleSlider('environmentIntensity')} min={0} max={2} step={0.1} disabled={!settings.pbrEnabled} />
        </SettingsSection>

        <SettingsSection title="Edge Rendering">
          <SwitchSetting label="Enable Edges" checked={settings.edgesEnabled} onChange={createToggleHandler('edgesEnabled')} />
          <SliderSetting label="Edge Width" value={settings.edgesWidth} onChange={handleSlider('edgesWidth')} min={0.5} max={4} step={0.5} disabled={!settings.edgesEnabled} />
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
        </SettingsSection>

        <SettingsSection title="Shadows">
          <SwitchSetting label="Enable Shadows" checked={settings.shadowsEnabled} onChange={createToggleHandler('shadowsEnabled')} />
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
          <SliderSetting label="Shadow Darkness" value={settings.shadowDarkness} onChange={handleSlider('shadowDarkness')} min={0} max={1} step={0.05} disabled={!settings.shadowsEnabled} />
        </SettingsSection>

        <SettingsSection title="Ambient Occlusion">
          <SwitchSetting label="Enable SSAO" checked={settings.ssaoEnabled} onChange={createToggleHandler('ssaoEnabled')} />
          <SliderSetting label="Radius" value={settings.ssaoRadius} onChange={handleSlider('ssaoRadius')} min={0.5} max={4} step={0.25} disabled={!settings.ssaoEnabled} />
          <SliderSetting label="Intensity" value={settings.ssaoIntensity} onChange={handleSlider('ssaoIntensity')} min={0.5} max={2} step={0.1} disabled={!settings.ssaoEnabled} />
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
        </SettingsSection>

        <SettingsSection title="Post Processing">
          <SwitchSetting label="Enable Bloom" checked={settings.bloomEnabled} onChange={createToggleHandler('bloomEnabled')} />
          <SliderSetting label="Bloom Intensity" value={settings.bloomIntensity} onChange={handleSlider('bloomIntensity')} min={0} max={1} step={0.05} disabled={!settings.bloomEnabled} />
          <SliderSetting label="Bloom Threshold" value={settings.bloomThreshold} onChange={handleSlider('bloomThreshold')} min={0.1} max={1.5} step={0.05} disabled={!settings.bloomEnabled} />

          <Divider sx={{ my: 0.5 }} />

          <SwitchSetting label="Tone Mapping" checked={settings.toneMapping} onChange={createToggleHandler('toneMapping')} />
          <SliderSetting label="Contrast" value={settings.contrast} onChange={handleSlider('contrast')} min={0.5} max={2} step={0.05} disabled={!settings.toneMapping} />
          <SliderSetting label="Exposure" value={settings.exposure} onChange={handleSlider('exposure')} min={0.5} max={2} step={0.05} disabled={!settings.toneMapping} />
        </SettingsSection>

        <SettingsSection title="Layer Highlight">
          <SwitchSetting label="Highlight Active Layer" checked={settings.layerHighlightEnabled} onChange={createToggleHandler('layerHighlightEnabled')} />
        </SettingsSection>

        <SettingsSection title="Diagnostics">
          <SwitchSetting label="Show Frame Stats" checked={settings.showFrameStats} onChange={createToggleHandler('showFrameStats')} />
        </SettingsSection>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button
          onClick={onReset}
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
