import React from 'react';
import { View, Flex, Heading, Link, Button } from '@adobe/react-spectrum';

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

/**
 * Layout component for the component preview system
 * Provides sidebar navigation and content area
 *
 * Uses React Spectrum components (View, Heading, Link, Button) for consistent
 * theming and design system integration.
 */
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
      <View key={route.path} marginBottom="size-50">
        <Button
          variant={isActive ? 'accent' : 'secondary'}
          onPress={handleClick}
          width="100%"
          isQuiet={!isActive}
          UNSAFE_style={{ justifyContent: 'flex-start' }}
        >
          {route.name}
        </Button>
      </View>
    );
  };

  return (
    <Flex direction="row" height="100vh">
      {/* Sidebar Navigation */}
      <View
        width="size-3000"
        backgroundColor="gray-75"
        borderEndWidth="thin"
        borderEndColor="gray-300"
        padding="size-200"
        overflow="auto"
      >
        <View marginBottom="size-200">
          <Heading level={1} marginBottom="size-100">
            Component Preview
          </Heading>
          <Link href="#/" isQuiet>
            ← Back to App
          </Link>
        </View>

        <nav>
          <Heading level={2} marginBottom="size-100">
            <View
              UNSAFE_style={{
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Components
            </View>
          </Heading>
          <View UNSAFE_style={{ listStyle: 'none' }} paddingStart="size-0">
            {routes.map(renderNavItem)}
          </View>
        </nav>
      </View>

      {/* Main Content Area */}
      <View flex={1} padding="size-500" overflow="auto" backgroundColor="gray-50">
        {children}
      </View>
    </Flex>
  );
}
