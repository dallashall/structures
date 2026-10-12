import { Button, Stack, TextField } from '@mui/material';

interface ProjectNameFormProps {
  name: string;
  error: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const NAME_FIELD = 'name';

const selectAll = (event: React.FocusEvent<HTMLInputElement>): void => {
  event.target.select();
};

/**
 * Inline project name editor. Enter saves, Escape cancels.
 * The field is uncontrolled, so the form reads its value only on submit.
 */
export function ProjectNameForm({ name, error, onSubmit, onCancel }: ProjectNameFormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(String(new FormData(event.currentTarget).get(NAME_FIELD) ?? ''));
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onCancel();
  };

  return (
    <Stack component="form" spacing={1} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <TextField
        name={NAME_FIELD}
        label="Project name"
        defaultValue={name}
        size="small"
        autoFocus
        onFocus={selectAll}
        error={Boolean(error)}
        helperText={error}
      />
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" size="small">
          Save
        </Button>
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
