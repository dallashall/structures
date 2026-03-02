import React from 'react';
import {
  Dialog,
  DialogContainer,
  Heading,
  Divider,
  Content,
  Form,
  TextField,
  Picker,
  Item,
  NumberField,
  ButtonGroup,
  Button,
  Text,
} from '@adobe/react-spectrum';
import type { Dimensions } from '../types';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, dimensions: Dimensions) => void;
}

type PresetOption = 'small' | 'medium' | 'large' | 'custom';

/**
 * NewProjectDialog - Dialog for creating new projects
 *
 * Features:
 * - Project name input (required)
 * - Dimension presets: Small (16×16×16), Medium (32×32×32), Large (64×64×64), Custom
 * - Custom dimension inputs (visible when "Custom" selected)
 * - Help text explaining dimensions can be changed later
 *
 * Uses React Spectrum Dialog and Form components for consistent theming
 * and accessibility.
 */
export function NewProjectDialog({
  isOpen,
  onClose,
  onCreate,
}: NewProjectDialogProps) {
  const [name, setName] = React.useState('');
  const [preset, setPreset] = React.useState<PresetOption>('small');
  const [customWidth, setCustomWidth] = React.useState(16);
  const [customHeight, setCustomHeight] = React.useState(16);
  const [customDepth, setCustomDepth] = React.useState(16);

  const handleNameChange = (value: string) => {
    setName(value);
  };

  const handlePresetChange = (key: React.Key | null) => {
    if (key !== null) {
      setPreset(key as PresetOption);
    }
  };

  const handleCustomWidthChange = (value: number) => {
    setCustomWidth(value);
  };

  const handleCustomHeightChange = (value: number) => {
    setCustomHeight(value);
  };

  const handleCustomDepthChange = (value: number) => {
    setCustomDepth(value);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      return;
    }

    const dimensions = getDimensions();
    onCreate(name, dimensions);

    // Reset form
    setName('');
    setPreset('small');
    setCustomWidth(16);
    setCustomHeight(16);
    setCustomDepth(16);
  };

  const handleCancel = () => {
    // Reset form
    setName('');
    setPreset('small');
    setCustomWidth(16);
    setCustomHeight(16);
    setCustomDepth(16);

    onClose();
  };

  const getDimensions = (): Dimensions => {
    switch (preset) {
      case 'small':
        return { width: 16, height: 16, depth: 16 };
      case 'medium':
        return { width: 32, height: 32, depth: 32 };
      case 'large':
        return { width: 64, height: 64, depth: 64 };
      case 'custom':
        return {
          width: customWidth,
          height: customHeight,
          depth: customDepth,
        };
      default:
        return { width: 16, height: 16, depth: 16 };
    }
  };

  const isFormValid = name.trim().length > 0;

  return (
    <DialogContainer onDismiss={handleCancel}>
      {isOpen && (
        <Dialog>
          <Heading>New Project</Heading>
          <Divider />
          <Content>
            <Form>
              <TextField
                label="Project Name"
                value={name}
                onChange={handleNameChange}
                isRequired
                autoFocus
              />

              <Picker
                label="Dimensions"
                selectedKey={preset}
                onSelectionChange={handlePresetChange}
              >
                <Item key="small">Small (16 × 16 × 16)</Item>
                <Item key="medium">Medium (32 × 32 × 32)</Item>
                <Item key="large">Large (64 × 64 × 64)</Item>
                <Item key="custom">Custom</Item>
              </Picker>
            </Form>
            {preset === 'custom' && (
              <Form>
                <NumberField
                  label="Width"
                  value={customWidth}
                  onChange={handleCustomWidthChange}
                  minValue={1}
                  maxValue={256}
                />
                <NumberField
                  label="Height"
                  value={customHeight}
                  onChange={handleCustomHeightChange}
                  minValue={1}
                  maxValue={256}
                />
                <NumberField
                  label="Depth"
                  value={customDepth}
                  onChange={handleCustomDepthChange}
                  minValue={1}
                  maxValue={256}
                />
              </Form>
            )}
            <Text>
              <em>Note: Dimensions can be changed later as you build.</em>
            </Text>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onPress={handleCreate}
              isDisabled={!isFormValid}
            >
              Create
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogContainer>
  );
}
