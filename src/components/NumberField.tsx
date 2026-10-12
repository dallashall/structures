import { TextField, IconButton, Stack } from "@mui/material";
import { KeyboardArrowUp, KeyboardArrowDown } from "@mui/icons-material";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  disabled?: boolean;
}

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
