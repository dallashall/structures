import { Slider } from '@mui/material';

import { SettingRow } from './SettingRow';

interface SliderSettingProps {
  label: string;
  value: number;
  onChange: (event: Event, value: number | number[]) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}

export function SliderSetting({ label, value, onChange, min, max, step, disabled }: SliderSettingProps) {
  return (
    <SettingRow label={label}>
      <Slider
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        size="small"
        valueLabelDisplay="auto"
        disabled={disabled}
      />
    </SettingRow>
  );
}
