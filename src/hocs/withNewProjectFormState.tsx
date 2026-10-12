import React from 'react';

import type { NewProjectForm } from '../utils/projectPresets';

import { EMPTY_NEW_PROJECT_FORM } from '../utils/projectPresets';

export interface WithNewProjectFormStateProps {
  newProjectForm: NewProjectForm;
  onNewProjectFormChange: (changes: Partial<NewProjectForm>) => void;
  onNewProjectFormReset: () => void;
}

/**
 * HOC that holds the new project form while the user types.
 * The draft is local to the dialog until Create runs CreateProjectCommand.
 */
export function withNewProjectFormState<P extends object>(
  Component: React.ComponentType<P & WithNewProjectFormStateProps>,
) {
  return function WithNewProjectFormState(props: P) {
    const [form, setForm] = React.useState<NewProjectForm>(EMPTY_NEW_PROJECT_FORM);

    const handleChange = (changes: Partial<NewProjectForm>): void => {
      const applyChanges = (current: NewProjectForm): NewProjectForm => ({ ...current, ...changes });
      setForm(applyChanges);
    };

    const handleReset = (): void => {
      setForm(EMPTY_NEW_PROJECT_FORM);
    };

    return (
      <Component
        {...props}
        newProjectForm={form}
        onNewProjectFormChange={handleChange}
        onNewProjectFormReset={handleReset}
      />
    );
  };
}
