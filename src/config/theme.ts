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

// Overrides for MUI defaults that measure under 3:1 against this palette. Each comment names the default it replaces.
const toComponents = (colors: UiColors): Components<Theme> => ({
  // MUI draws the outline at 50% primary, about 2.5:1
  MuiButton: {
    styleOverrides: {
      outlinedPrimary: { borderColor: colors.primary },
    },
  },
  // MUI draws toggle and input edges, chip fills, and slider rails in translucent grays near 1.3:1
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
      // A colored chip keeps MUI's fill and text pair. Overriding its fill here would break that pair.
      colorDefault: {
        border: `1px solid ${colors.controlBorder}`,
        '&.MuiChip-filled': { backgroundColor: colors.chipFill },
      },
      label: { fontFamily: MONO_FONT, fontWeight: 500 },
    },
  },
  MuiSlider: {
    styleOverrides: {
      rail: { backgroundColor: colors.controlBorder, opacity: 1 },
    },
  },
  // MUI's checked track is primary at 50% opacity, about 2.2:1. A solid track with a paper thumb keeps each part at 3:1.
  MuiSwitch: {
    styleOverrides: {
      switchBase: {
        color: '#ffffff',
        '&.Mui-checked': { color: colors.paper },
        '&.Mui-checked + .MuiSwitch-track': { backgroundColor: colors.primary, opacity: 1 },
      },
      track: { backgroundColor: colors.controlBorder, opacity: 1 },
    },
  },
  // A placeholder can carry a default value, as in the export dialog, so it gets readable text instead of MUI's 42% opacity
  MuiInputBase: {
    styleOverrides: {
      input: {
        '&::placeholder': { color: colors.textSecondary, opacity: 1 },
      },
    },
  },
  // MUI marks the selected item with a tint near 1.3:1. A primary bar on the leading edge marks it at 3:1 or more.
  MuiMenuItem: {
    styleOverrides: {
      root: {
        '&.Mui-selected': { boxShadow: `inset 3px 0 0 ${colors.primary}`, fontWeight: 600 },
      },
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
      action: { disabled: colors.textDisabled, disabledBackground: colors.disabledFill },
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
