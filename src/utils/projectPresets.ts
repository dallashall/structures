import type { Dimensions } from '../types';

export type ProjectPreset = 'small' | 'medium' | 'large' | 'custom';

export interface NewProjectForm {
  name: string;
  preset: ProjectPreset;
  customDimensions: Dimensions;
}

const PRESET_DIMENSIONS: Record<Exclude<ProjectPreset, 'custom'>, Dimensions> = {
  small: { width: 16, height: 16, depth: 16 },
  medium: { width: 32, height: 32, depth: 32 },
  large: { width: 64, height: 64, depth: 64 },
};

export const EMPTY_NEW_PROJECT_FORM: NewProjectForm = {
  name: '',
  preset: 'small',
  customDimensions: PRESET_DIMENSIONS.small,
};

export function resolveDimensions(form: NewProjectForm): Dimensions {
  return form.preset === 'custom' ? form.customDimensions : PRESET_DIMENSIONS[form.preset];
}

export function isNewProjectFormValid(form: NewProjectForm): boolean {
  return form.name.trim().length > 0;
}
