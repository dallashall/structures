import { Switch } from '@mui/material';

import { SettingRow } from './SettingRow';

interface SwitchSettingProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export function SwitchSetting({ label, checked, onChange }: SwitchSettingProps) {
  return (
    <SettingRow label={label}>
      <Switch checked={checked} onChange={onChange} size="small" />
    </SettingRow>
  );
}
