import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  SelectChangeEvent,
} from "@mui/material";
import { useState } from "react";
import { Form } from "./Form";
import { NumberField } from "./NumberField";
import type { Dimensions } from "../types";

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, dimensions: Dimensions) => void;
}

type PresetOption = "small" | "medium" | "large" | "custom";

/**
 * NewProjectDialog - Dialog for creating new projects
 *
 * Features:
 * - Project name input (required)
 * - Dimension presets: Small (16×16×16), Medium (32×32×32), Large (64×64×64), Custom
 * - Custom dimension inputs (visible when "Custom" selected)
 * - Help text explaining dimensions can be changed later
 *
 * Uses MUI Dialog and Form components for consistent theming
 * and accessibility.
 */
export function NewProjectDialog({
  isOpen,
  onClose,
  onCreate,
}: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<PresetOption>("small");
  const [customWidth, setCustomWidth] = useState(16);
  const [customHeight, setCustomHeight] = useState(16);
  const [customDepth, setCustomDepth] = useState(16);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handlePresetChange = (event: SelectChangeEvent<PresetOption>) => {
    setPreset(event.target.value as PresetOption);
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
    setName("");
    setPreset("small");
    setCustomWidth(16);
    setCustomHeight(16);
    setCustomDepth(16);
  };

  const handleCancel = () => {
    // Reset form
    setName("");
    setPreset("small");
    setCustomWidth(16);
    setCustomHeight(16);
    setCustomDepth(16);

    onClose();
  };

  const getDimensions = (): Dimensions => {
    switch (preset) {
      case "small":
        return { width: 16, height: 16, depth: 16 };
      case "medium":
        return { width: 32, height: 32, depth: 32 };
      case "large":
        return { width: 64, height: 64, depth: 64 };
      case "custom":
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
    <Dialog open={isOpen} onClose={handleCancel}>
      <DialogTitle>New Project</DialogTitle>
      <Divider />
      <DialogContent>
        <Form>
          <TextField
            label="Project Name"
            value={name}
            onChange={handleNameChange}
            required
            autoFocus
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="dimensions-label">Dimensions</InputLabel>
            <Select
              labelId="dimensions-label"
              value={preset}
              onChange={handlePresetChange}
              label="Dimensions"
            >
              <MenuItem value="small">Small (16 × 16 × 16)</MenuItem>
              <MenuItem value="medium">Medium (32 × 32 × 32)</MenuItem>
              <MenuItem value="large">Large (64 × 64 × 64)</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          {preset === "custom" && (
            <>
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
            </>
          )}

          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
            Note: Dimensions can be changed later as you build.
          </Typography>
        </Form>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!isFormValid}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
