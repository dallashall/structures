import { createTheme } from '@mui/material';
import type { Components, Theme } from '@mui/material';

import type { AxisColors, ColorScheme, UiColors } from './colorSchemes';

import { UI_COLORS } from './colorSchemes';

declare module '@mui/material/styles' {
  interface Palette {
    chrome: { overlay: string; canvas: string; controlBorder: string; chipFill: string };
    axis: AxisColors;
  }
  interface PaletteOptions {
    chrome?: { overlay: string; canvas: string; controlBorder: string; chipFill: string };
    axis?: AxisColors;
  }
}

const SYSTEM_FONTS = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const HEADING_FONT = `"Lexend", ${SYSTEM_FONTS}`;
const BODY_FONT = `"Chakra Petch", ${SYSTEM_FONTS}`;
const MONO_FONT = '"Red Hat Mono", "Courier New", monospace';

const HEADING = { fontFamily: HEADING_FONT, fontWeight: 600 };

// MUI draws these edges with translucent colors near 1.3:1. Each one is the only outline of its control, so it gets controlBorder.
const toComponents = (colors: UiColors): Components<Theme> => ({
  MuiButton: {
    styleOverrides: {
      outlinedPrimary: { borderColor: colors.primary },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        borderColor: colors.controlBorder,
        '&.Mui-selected': {
          backgroundColor: colors.primary,
          color: colors.primaryContrastText,
          '&:hover': { backgroundColor: colors.primaryDark },
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      notchedOutline: { borderColor: colors.controlBorder },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { border: `1px solid ${colors.controlBorder}` },
      filled: { backgroundColor: colors.chipFill },
      label: { fontFamily: MONO_FONT, fontWeight: 500 },
    },
  },
  MuiSlider: {
    styleOverrides: {
      rail: { backgroundColor: colors.controlBorder, opacity: 1 },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      track: { backgroundColor: colors.controlBorder, opacity: 1 },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& input': { fontFamily: MONO_FONT, fontWeight: 500 },
      },
    },
  },
});

export function createAppTheme(scheme: ColorScheme): Theme {
  const colors = UI_COLORS[scheme];

  return createTheme({
    palette: {
      mode: scheme,
      primary: { main: colors.primary, dark: colors.primaryDark, contrastText: colors.primaryContrastText },
      secondary: { main: colors.secondary, dark: colors.secondaryDark },
      error: { main: colors.error },
      warning: { main: colors.warning },
      info: { main: colors.info },
      success: { main: colors.success },
      background: { default: colors.background, paper: colors.paper },
      divider: colors.divider,
      text: { primary: colors.textPrimary, secondary: colors.textSecondary, disabled: colors.textDisabled },
      chrome: {
        overlay: colors.overlay,
        canvas: colors.canvas,
        controlBorder: colors.controlBorder,
        chipFill: colors.chipFill,
      },
      axis: colors.axis,
    },
    spacing: 8,
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: BODY_FONT,
      h1: HEADING,
      h2: HEADING,
      h3: HEADING,
      h4: HEADING,
      h5: HEADING,
      h6: HEADING,
      subtitle1: { fontFamily: HEADING_FONT },
      subtitle2: { fontFamily: HEADING_FONT },
      button: { fontFamily: BODY_FONT, fontWeight: 600, textTransform: 'none' },
      overline: { fontFamily: HEADING_FONT, letterSpacing: '0.08em' },
    },
    components: toComponents(colors),
  });
}
