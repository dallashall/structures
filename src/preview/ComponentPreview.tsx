import React, { useState } from 'react';
import { Heading, Content, View } from '@adobe/react-spectrum';
import { PreviewLayout } from './PreviewLayout';
import { BlockButtonPreview } from './previews/BlockButtonPreview';
import { ViewSelectorPreview } from './previews/ViewSelectorPreview';
import { LayerDepthSelectorPreview } from './previews/LayerDepthSelectorPreview';
import { MaterialPalettePreview } from './previews/MaterialPalettePreview';
import { ToolbarPreview } from './previews/ToolbarPreview';
import { NewProjectDialogPreview } from './previews/NewProjectDialogPreview';
import { FullPaletteMenuPreview } from './previews/FullPaletteMenuPreview';
import { QuickSelectPalettePreview } from './previews/QuickSelectPalettePreview';
import { MetaBlockPlacementModalPreview } from './previews/MetaBlockPlacementModalPreview';
import { LayerControlsPreview } from './previews/LayerControlsPreview';
import { LayerDimensionControlPreview } from './previews/LayerDimensionControlPreview';
import { Canvas2DViewPreview } from './previews/Canvas2DViewPreview';
import { TabbedLayoutPreview } from './previews/TabbedLayoutPreview';
import { QuadLayoutPreview } from './previews/QuadLayoutPreview';
import { WelcomeViewPreview } from './previews/WelcomeViewPreview';
import { CanvasPlaceholderPreview } from './previews/CanvasPlaceholderPreview';

interface PreviewRoute {
  name: string;
  path: string;
  component: React.ComponentType;
}

/**
 * Placeholder component shown when no preview is selected
 */
function WelcomePreview() {
  return (
    <View>
      <Heading level={1}>Welcome to Component Preview</Heading>
      <Content marginBottom="size-200">
        This is a lightweight component preview system for the Minecraft Magic
        Blueprint System.
      </Content>
      <Content marginBottom="size-400">
        Select a component from the sidebar to view its preview and
        interactive states.
      </Content>
      <View
        padding="size-200"
        borderWidth="thin"
        borderRadius="medium"
        marginTop="size-400"
      >
        <Heading level={3}>Features</Heading>
        <Content>
          <ul>
            <li>Zero additional dependencies</li>
            <li>Hash-based routing (#/preview)</li>
            <li>Hot module replacement (HMR) support</li>
            <li>Interactive component testing with mock data</li>
          </ul>
        </Content>
      </View>
    </View>
  );
}

/**
 * Main component preview router
 * Manages navigation between component previews
 */
export function ComponentPreview() {
  const [activeRoute, setActiveRoute] = useState<string>('welcome');

  // Preview routes registry
  // New component previews will be registered here as they're implemented
  const routes: PreviewRoute[] = [
    { name: 'Welcome', path: 'welcome', component: WelcomePreview },
    { name: 'BlockButton', path: 'block-button', component: BlockButtonPreview },
    { name: 'ViewSelector', path: 'view-selector', component: ViewSelectorPreview },
    { name: 'LayerDepthSelector', path: 'layer-depth-selector', component: LayerDepthSelectorPreview },
    { name: 'MaterialPalette', path: 'material-palette', component: MaterialPalettePreview },
    { name: 'Toolbar', path: 'toolbar', component: ToolbarPreview },
    { name: 'NewProjectDialog', path: 'new-project-dialog', component: NewProjectDialogPreview },
    { name: 'FullPaletteMenu', path: 'full-palette-menu', component: FullPaletteMenuPreview },
    { name: 'QuickSelectPalette', path: 'quick-select-palette', component: QuickSelectPalettePreview },
    { name: 'MetaBlockPlacementModal', path: 'meta-block-placement-modal', component: MetaBlockPlacementModalPreview },
    { name: 'LayerControls', path: 'layer-controls', component: LayerControlsPreview },
    { name: 'LayerDimensionControl', path: 'layer-dimension-control', component: LayerDimensionControlPreview },
    { name: 'Canvas2DView', path: 'canvas-2d-view', component: Canvas2DViewPreview },
    { name: 'TabbedLayout', path: 'tabbed-layout', component: TabbedLayoutPreview },
    { name: 'QuadLayout', path: 'quad-layout', component: QuadLayoutPreview },
    { name: 'WelcomeView', path: 'welcome-view', component: WelcomeViewPreview },
    { name: 'CanvasPlaceholder', path: 'canvas-placeholder', component: CanvasPlaceholderPreview },
  ];

  const handleRouteChange = (path: string) => {
    setActiveRoute(path);
  };

  // Find the active preview component
  const activePreviewRoute = routes.find((route) => route.path === activeRoute);
  const ActivePreviewComponent = activePreviewRoute
    ? activePreviewRoute.component
    : WelcomePreview;

  return (
    <PreviewLayout
      routes={routes}
      activeRoute={activeRoute}
      onRouteChange={handleRouteChange}
    >
      <ActivePreviewComponent />
    </PreviewLayout>
  );
}
