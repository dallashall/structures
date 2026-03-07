import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { ShapeFillMode } from "../types";

interface ShapeFillModeControlProps {
  shapeFillMode: ShapeFillMode;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  orientation?: "horizontal" | "vertical";
}

/**
 * ShapeFillModeControl - Toggle between outline and filled shape modes
 *
 * Used for shape tools (rectangle, circle, arch, curve) to control
 * whether shapes are drawn as outlines or filled solids.
 */
export function ShapeFillModeControl({
  shapeFillMode,
  onShapeFillModeChange,
  orientation = "vertical",
}: ShapeFillModeControlProps) {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: ShapeFillMode | null,
  ) => {
    if (newMode !== null) {
      onShapeFillModeChange(newMode);
    }
  };

  const isHorizontal = orientation === "horizontal";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {isHorizontal && (
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
          Fill:
        </Typography>
      )}
      {!isHorizontal && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 0.5,
            px: 0.5,
            color: "text.secondary",
            fontWeight: "bold",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Fill Mode
        </Typography>
      )}
      <ToggleButtonGroup
        value={shapeFillMode}
        exclusive
        onChange={handleChange}
        orientation={orientation}
        fullWidth={!isHorizontal}
        size="small"
        sx={{
          "& .MuiToggleButton-root": {
            py: isHorizontal ? 0.5 : 1,
            px: isHorizontal ? 1 : 1.5,
            fontSize: isHorizontal ? "0.7rem" : "0.75rem",
            border: 1,
            borderColor: "divider",
            "&.Mui-selected": {
              bgcolor: "secondary.main",
              color: "secondary.contrastText",
              "&:hover": {
                bgcolor: "secondary.dark",
              },
            },
          },
        }}
      >
        <ToggleButton value="outline" aria-label="Outline fill mode">
          Outline
        </ToggleButton>
        <ToggleButton value="filled" aria-label="Filled fill mode">
          Filled
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
