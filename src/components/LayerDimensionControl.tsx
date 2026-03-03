import { Stack, IconButton, Typography, Slider, TextField } from '@mui/material';
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';

interface LayerDimensionControlProps {
  label: string;
  currentLayer: number;
  maxLayer: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (value: number) => void;
}

/**
 * LayerDimensionControl - Compact single dimension layer control
 *
 * Displays a label, decrement button, number field, increment button, and slider
 * for controlling a single layer dimension (X, Y, or Z).
 */
export function LayerDimensionControl({
  label,
  currentLayer,
  maxLayer,
  onIncrement,
  onDecrement,
  onChange,
}: LayerDimensionControlProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    onChange(value as number);
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2">
        <strong>{label}:</strong>
      </Typography>
      <IconButton
        onClick={onDecrement}
        disabled={currentLayer <= 0}
        size="small"
        aria-label={`Decrement ${label}`}
      >
        <KeyboardArrowDown />
      </IconButton>

      <TextField
        type="number"
        value={currentLayer}
        onChange={handleInputChange}
        slotProps={{
          htmlInput: {
            min: 0,
            max: maxLayer - 1,
          },
        }}
        size="small"
        sx={{ width: 80 }}
      />

      <IconButton
        onClick={onIncrement}
        disabled={currentLayer >= maxLayer - 1}
        size="small"
        aria-label={`Increment ${label}`}
      >
        <KeyboardArrowUp />
      </IconButton>

      <Slider
        value={currentLayer}
        onChange={handleSliderChange}
        min={0}
        max={maxLayer - 1}
        sx={{ width: 200 }}
      />
    </Stack>
  );
}
