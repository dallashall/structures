import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { Edit, SwapHoriz, FilterAlt, BorderColor } from "@mui/icons-material";
import type { PaintBehavior } from "../types";

interface PaintBehaviorControlProps {
  paintBehavior: PaintBehavior;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  orientation?: "horizontal" | "vertical";
}

export function PaintBehaviorControl({
  paintBehavior,
  onPaintBehaviorChange,
  orientation = "horizontal",
}: PaintBehaviorControlProps) {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newBehavior: PaintBehavior | null,
  ) => {
    if (newBehavior !== null) {
      onPaintBehaviorChange(newBehavior);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography
        variant="caption"
        sx={{ fontSize: "0.75rem", color: "text.secondary" }}
      >
        Behavior:
      </Typography>
      <ToggleButtonGroup
        value={paintBehavior}
        exclusive
        onChange={handleChange}
        orientation={orientation}
        size="small"
        sx={{
          "& .MuiToggleButton-root": {
            px: 1,
            py: 0.5,
            fontSize: "0.7rem",
          },
        }}
      >
        <Tooltip title="Normal - Paint anywhere">
          <ToggleButton value="normal" aria-label="Normal paint behavior">
            <Edit fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Only Replace - Paint over blocks only">
          <ToggleButton value="only-replace" aria-label="Only replace behavior">
            <SwapHoriz fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Selective Replace - Replace specific block type">
          <ToggleButton
            value="selective-replace"
            aria-label="Selective replace behavior"
          >
            <FilterAlt fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Erase - Remove blocks">
          <ToggleButton value="delete" aria-label="Erase behavior">
            <BorderColor fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
}
