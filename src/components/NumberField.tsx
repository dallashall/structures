import React from 'react';
import { TextField, IconButton, Stack } from '@mui/material';
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';

interface NumberFieldProps {
  /** Label for the field */
  label: string;
  /** Current value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Minimum allowed value */
  minValue?: number;
  /** Maximum allowed value */
  maxValue?: number;
  /** Step for increment/decrement */
  step?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
}

/**
 * NumberField - Numeric input with increment/decrement buttons
 *
 * Provides a text field for numeric input with up/down buttons
 * for incrementing and decrementing the value.
 */
export function NumberField({
  label,
  value,
  onChange,
  minValue = Number.MIN_SAFE_INTEGER,
  maxValue = Number.MAX_SAFE_INTEGER,
  step = 1,
  disabled = false,
}: NumberFieldProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    if (!isNaN(newValue)) {
      const clampedValue = Math.max(minValue, Math.min(maxValue, newValue));
      onChange(clampedValue);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(maxValue, value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(minValue, value - step);
    onChange(newValue);
  };

  const isAtMax = value >= maxValue;
  const isAtMin = value <= minValue;

  return (
    <Stack direction="row" alignItems="flex-end" spacing={0.5}>
      <TextField
        label={label}
        type="number"
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        slotProps={{
          htmlInput: {
            min: minValue,
            max: maxValue,
            step: step,
          },
        }}
        size="small"
        fullWidth
      />
      <Stack direction="column" spacing={0}>
        <IconButton
          size="small"
          onClick={handleIncrement}
          disabled={disabled || isAtMax}
          aria-label={`Increment ${label}`}
          sx={{ padding: 0.25 }}
        >
          <KeyboardArrowUp fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleDecrement}
          disabled={disabled || isAtMin}
          aria-label={`Decrement ${label}`}
          sx={{ padding: 0.25 }}
        >
          <KeyboardArrowDown fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
