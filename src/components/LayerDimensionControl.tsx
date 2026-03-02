import { Flex, NumberField, ActionButton, Text, Slider } from '@adobe/react-spectrum';
import ChevronUp from '@spectrum-icons/workflow/ChevronUp';
import ChevronDown from '@spectrum-icons/workflow/ChevronDown';

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
  return (
    <Flex direction="row" gap="size-100" alignItems="center">
      <Text>
        <strong>{label}:</strong>
      </Text>
      <ActionButton
        onPress={onDecrement}
        isDisabled={currentLayer <= 0}
        isQuiet
      >
        <ChevronDown />
      </ActionButton>

      <NumberField
        value={currentLayer}
        onChange={onChange}
        minValue={0}
        maxValue={maxLayer - 1}
        width="size-800"
        hideStepper
      />

      <ActionButton
        onPress={onIncrement}
        isDisabled={currentLayer >= maxLayer - 1}
        isQuiet
      >
        <ChevronUp />
      </ActionButton>

      <Slider
        value={currentLayer}
        onChange={onChange}
        minValue={0}
        maxValue={maxLayer - 1}
        width="size-2000"
      />
    </Flex>
  );
}
