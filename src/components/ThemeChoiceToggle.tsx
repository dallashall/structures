import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { DarkModeOutlined, LightModeOutlined, SettingsBrightness } from '@mui/icons-material';

import type { ThemeChoice } from '../core/ThemePreference';

import { withThemePreference } from '../hocs/withThemePreference';
import type { WithThemePreferenceProps } from '../hocs/withThemePreference';

interface ChoiceOption {
  choice: ThemeChoice;
  label: string;
  icon: React.ReactNode;
}

const OPTIONS: ChoiceOption[] = [
  { choice: 'light', label: 'Light theme', icon: <LightModeOutlined fontSize="small" /> },
  { choice: 'dark', label: 'Dark theme', icon: <DarkModeOutlined fontSize="small" /> },
  { choice: 'system', label: 'System theme', icon: <SettingsBrightness fontSize="small" /> },
];

function ThemeChoiceToggleComponent({ themeChoice, onThemeChoiceSelect }: WithThemePreferenceProps) {
  // An exclusive group reports null when the selected button is clicked again. The choice stays.
  const handleChange = (_event: React.MouseEvent<HTMLElement>, choice: ThemeChoice | null): void => {
    if (choice) onThemeChoiceSelect(choice);
  };

  const renderOption = ({ choice, label, icon }: ChoiceOption) => (
    <Tooltip key={choice} title={label}>
      <ToggleButton value={choice} aria-label={label}>
        {icon}
      </ToggleButton>
    </Tooltip>
  );

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={themeChoice}
      onChange={handleChange}
      aria-label="Theme"
    >
      {OPTIONS.map(renderOption)}
    </ToggleButtonGroup>
  );
}

export const ThemeChoiceToggle = withThemePreference<object>(ThemeChoiceToggleComponent);
