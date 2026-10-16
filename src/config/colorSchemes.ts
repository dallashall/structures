/**
 * Colors for the light and dark color schemes. The MUI theme (config/theme.ts) and the 2D canvas both read this file.
 *
 * Contrast targets (WCAG 2.2 AA), measured against paper, default, overlay, and canvas:
 * - text, secondary, and every accent used as text: 4.5:1 or more
 * - controlBorder and grid lines: 3:1 or more, because they are the only edge of a control or cell
 * - divider: none. It separates regions that already differ in content.
 * overlay is translucent, so the targets hold over the canvas color only. Over the 3D sky they hold for the day preset.
 */

export type ColorScheme = 'light' | 'dark';

export interface AxisColors {
  x: string;
  y: string;
  z: string;
}

export interface UiColors {
  primary: string;
  primaryDark: string;
  primaryContrastText: string;
  secondary: string;
  secondaryDark: string;
  error: string;
  warning: string;
  info: string;
  success: string;
  background: string;
  paper: string;
  // Translucent panel over a canvas: view labels, the 3D camera bar
  overlay: string;
  // Fill behind the 2D and 3D canvases
  canvas: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  controlBorder: string;
  divider: string;
  chipFill: string;
  axis: AxisColors;
}

export interface CanvasColors {
  grid: string;
  axis: AxisColors;
  textSecondary: string;
  metaBlockBorder: string;
  metaBlockFill: string;
  metaBlockArrow: string;
  guidePlaced: string;
  guideCursor: string;
  guideControl: string;
  // Outline around guide handles and labels. It contrasts with the guide colors, not with the canvas.
  guideOutline: string;
  guideLabel: string;
}

const DARK_AXIS: AxisColors = { x: '#ff7a6e', y: '#62b0ff', z: '#5fd07a' };
const LIGHT_AXIS: AxisColors = { x: '#c62828', y: '#1565c0', z: '#2e7d32' };

export const UI_COLORS: Record<ColorScheme, UiColors> = {
  dark: {
    primary: '#62b0ff',
    primaryDark: '#3d94f0',
    primaryContrastText: '#0b1726',
    secondary: '#ffb547',
    secondaryDark: '#f09a1f',
    error: '#ff7a6e',
    warning: '#ffb547',
    info: '#62b0ff',
    success: '#5fd07a',
    background: '#15171b',
    paper: '#1f2228',
    overlay: 'rgba(21, 23, 27, 0.88)',
    canvas: '#15171b',
    textPrimary: '#eceef1',
    textSecondary: '#b9bec6',
    textDisabled: '#7c838e',
    controlBorder: '#7c838e',
    divider: '#464c55',
    chipFill: '#3a3f47',
    axis: DARK_AXIS,
  },
  light: {
    primary: '#1565c0',
    primaryDark: '#0d4f9e',
    primaryContrastText: '#ffffff',
    secondary: '#b35c00',
    secondaryDark: '#8f4900',
    error: '#c62828',
    warning: '#9a5b00',
    info: '#1565c0',
    success: '#2e7d32',
    background: '#eef0f3',
    paper: '#ffffff',
    overlay: 'rgba(255, 255, 255, 0.92)',
    canvas: '#fbfbfc',
    textPrimary: '#16191d',
    textSecondary: '#4a515b',
    textDisabled: '#7a818c',
    controlBorder: '#7a818c',
    divider: '#c9cdd3',
    chipFill: '#dde1e6',
    axis: LIGHT_AXIS,
  },
};

export const CANVAS_COLORS: Record<ColorScheme, CanvasColors> = {
  dark: {
    grid: '#5f6670',
    axis: DARK_AXIS,
    textSecondary: '#b9bec6',
    metaBlockBorder: '#5fd07a',
    metaBlockFill: '#eceef1',
    metaBlockArrow: '#15171b',
    guidePlaced: '#ffd54a',
    guideCursor: '#8fd3ff',
    guideControl: '#ff7ac0',
    guideOutline: '#000000',
    guideLabel: '#ffffff',
  },
  light: {
    grid: '#8a9099',
    axis: LIGHT_AXIS,
    textSecondary: '#4a515b',
    metaBlockBorder: '#2e7d32',
    metaBlockFill: '#16191d',
    metaBlockArrow: '#fbfbfc',
    guidePlaced: '#9a6b00',
    guideCursor: '#0277bd',
    guideControl: '#c2185b',
    guideOutline: '#ffffff',
    guideLabel: '#16191d',
  },
};
