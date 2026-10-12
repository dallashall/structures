import { Box, Stack, Typography, Button, Link as MuiLink } from "@mui/material";

interface PreviewRoute {
  name: string;
  path: string;
}

interface PreviewLayoutProps {
  routes: PreviewRoute[];
  activeRoute: string;
  onRouteChange: (path: string) => void;
  children: React.ReactNode;
}

export function PreviewLayout({
  routes,
  activeRoute,
  onRouteChange,
  children,
}: PreviewLayoutProps) {
  const handleRouteClick = (path: string) => {
    onRouteChange(path);
  };

  const renderNavItem = (route: PreviewRoute) => {
    const isActive = activeRoute === route.path;

    const handleClick = () => {
      handleRouteClick(route.path);
    };

    return (
      <Box key={route.path} sx={{ mb: 0.5 }}>
        <Button
          variant={isActive ? "contained" : "text"}
          onClick={handleClick}
          fullWidth
          sx={{ justifyContent: "flex-start" }}
        >
          {route.name}
        </Button>
      </Box>
    );
  };

  return (
    <Stack direction="row" sx={{ height: "100vh" }}>
      <Box
        sx={{
          width: 300,
          bgcolor: "grey.50",
          borderRight: 1,
          borderColor: "divider",
          p: 2,
          overflow: "auto",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Component Preview
          </Typography>
          <MuiLink href="#/" underline="hover">
            ← Back to App
          </MuiLink>
        </Box>

        <nav>
          <Typography
            variant="overline"
            component="h2"
            sx={{
              fontWeight: 700,
              letterSpacing: 0.5,
              mb: 1,
            }}
          >
            Components
          </Typography>
          <Box sx={{ listStyle: "none", pl: 0 }}>
            {routes.map(renderNavItem)}
          </Box>
        </nav>
      </Box>

      <Box
        sx={{
          flex: 1,
          p: 5,
          overflow: "auto",
          bgcolor: "grey.50",
        }}
      >
        {children}
      </Box>
    </Stack>
  );
}
