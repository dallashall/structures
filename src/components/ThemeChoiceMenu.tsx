import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { Check, DarkModeOutlined, LightModeOutlined, SettingsBrightness } from '@mui/icons-material';

import type { ThemeChoice } from '../core/ThemePreference';

import { withDisclosureState } from '../hocs/withDisclosureState';
import type { WithDisclosureStateProps } from '../hocs/withDisclosureState';
import { withThemePreference } from '../hocs/withThemePreference';
import type { WithThemePreferenceProps } from '../hocs/withThemePreference';

interface ChoiceOption {
  choice: ThemeChoice;
  label: string;
  icon: React.ReactNode;
}

const OPTIONS: ChoiceOption[] = [
  { choice: 'light', label: 'Light', icon: <LightModeOutlined fontSize="small" /> },
  { choice: 'dark', label: 'Dark', icon: <DarkModeOutlined fontSize="small" /> },
  { choice: 'system', label: 'System', icon: <SettingsBrightness fontSize="small" /> },
];

const isOptionFor = (choice: ThemeChoice) => (option: ChoiceOption): boolean => option.choice === choice;

function ThemeChoiceMenuComponent({
  themeChoice,
  onThemeChoiceSelect,
  anchorEl,
  onOpen,
  onClose,
}: WithThemePreferenceProps & WithDisclosureStateProps) {
  const current = OPTIONS.find(isOptionFor(themeChoice)) ?? OPTIONS[2];

  const createSelectHandler = (choice: ThemeChoice) => (): void => {
    onThemeChoiceSelect(choice);
    onClose();
  };

  const renderOption = ({ choice, label }: ChoiceOption) => (
    <MenuItem
      key={choice}
      selected={choice === themeChoice}
      onClick={createSelectHandler(choice)}
      role="menuitemradio"
      aria-checked={choice === themeChoice}
    >
      <ListItemIcon>{choice === themeChoice && <Check fontSize="small" />}</ListItemIcon>
      <ListItemText>{label}</ListItemText>
    </MenuItem>
  );

  return (
    <>
      <Tooltip title={`Theme: ${current.label}`}>
        <IconButton
          onClick={onOpen}
          aria-label="Theme"
          aria-haspopup="menu"
          aria-expanded={anchorEl !== null}
        >
          {current.icon}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={anchorEl !== null} onClose={onClose}>
        {OPTIONS.map(renderOption)}
      </Menu>
    </>
  );
}

export const ThemeChoiceMenu = withThemePreference<object>(
  withDisclosureState<WithThemePreferenceProps>(ThemeChoiceMenuComponent),
);
