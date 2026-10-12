import {
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
import { Form } from "./Form";
import { NumberField } from "./NumberField";
import { ModalDialog, IN_DIALOG_MENU_PROPS } from "./ModalDialog";
import type { Dimensions } from "../types";

import { withNewProjectFormState } from "../hocs/withNewProjectFormState";
import type { WithNewProjectFormStateProps } from "../hocs/withNewProjectFormState";

import { isNewProjectFormValid, resolveDimensions } from "../utils/projectPresets";
import type { ProjectPreset } from "../utils/projectPresets";

const TITLE_ID = "new-project-title";

interface NewProjectDialogOwnProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, dimensions: Dimensions) => void;
}

function NewProjectDialogComponent({
  isOpen,
  onClose,
  onCreate,
  newProjectForm,
  onNewProjectFormChange,
  onNewProjectFormReset,
}: NewProjectDialogOwnProps & WithNewProjectFormStateProps) {
  const { name, preset, customDimensions } = newProjectForm;

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onNewProjectFormChange({ name: event.target.value });
  };

  const handlePresetChange = (event: SelectChangeEvent<ProjectPreset>) => {
    onNewProjectFormChange({ preset: event.target.value as ProjectPreset });
  };

  const handleCustomWidthChange = (width: number) => {
    onNewProjectFormChange({ customDimensions: { ...customDimensions, width } });
  };

  const handleCustomHeightChange = (height: number) => {
    onNewProjectFormChange({ customDimensions: { ...customDimensions, height } });
  };

  const handleCustomDepthChange = (depth: number) => {
    onNewProjectFormChange({ customDimensions: { ...customDimensions, depth } });
  };

  const handleCreate = () => {
    if (!isNewProjectFormValid(newProjectForm)) return;
    onCreate(name, resolveDimensions(newProjectForm));
    onNewProjectFormReset();
  };

  const handleCancel = () => {
    onNewProjectFormReset();
    onClose();
  };

  return (
    <ModalDialog open={isOpen} onClose={handleCancel} labelledBy={TITLE_ID} maxWidth="xs" fullWidth>
      <DialogTitle id={TITLE_ID}>New Project</DialogTitle>
      <Divider />
      <DialogContent>
        <Form>
          <TextField
            label="Project Name"
            value={name}
            onChange={handleNameChange}
            required
            fullWidth
            slotProps={{ htmlInput: { "data-autofocus": true } }}
          />

          <FormControl fullWidth>
            <InputLabel id="dimensions-label">Dimensions</InputLabel>
            <Select
              labelId="dimensions-label"
              value={preset}
              onChange={handlePresetChange}
              label="Dimensions"
              MenuProps={IN_DIALOG_MENU_PROPS}
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
                value={customDimensions.width}
                onChange={handleCustomWidthChange}
                minValue={1}
                maxValue={256}
              />
              <NumberField
                label="Height"
                value={customDimensions.height}
                onChange={handleCustomHeightChange}
                minValue={1}
                maxValue={256}
              />
              <NumberField
                label="Depth"
                value={customDimensions.depth}
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
          disabled={!isNewProjectFormValid(newProjectForm)}
        >
          Create
        </Button>
      </DialogActions>
    </ModalDialog>
  );
}

export const NewProjectDialog = withNewProjectFormState<NewProjectDialogOwnProps>(NewProjectDialogComponent);
