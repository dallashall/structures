import React, { useState } from 'react';
import { PreviewLayout } from './PreviewLayout';
import { WelcomePreview } from './WelcomePreview';
import { ToolbarPreview } from './previews/ToolbarPreview';
import { NewProjectDialogPreview } from './previews/NewProjectDialogPreview';
import { QuickSelectPalettePreview } from './previews/QuickSelectPalettePreview';
import { MetaBlockPlacementModalPreview } from './previews/MetaBlockPlacementModalPreview';
import { LayerControlsPreview } from './previews/LayerControlsPreview';
import { LayerDimensionControlPreview } from './previews/LayerDimensionControlPreview';
import { Canvas2DViewPreview } from './previews/Canvas2DViewPreview';
import { TabbedLayoutPreview } from './previews/TabbedLayoutPreview';
import { QuadLayoutPreview } from './previews/QuadLayoutPreview';
import { WelcomeViewPreview } from './previews/WelcomeViewPreview';
import { Preview3DViewPreview } from './previews/Preview3DViewPreview';

interface PreviewRoute {
  name: string;
  path: string;
  component: React.ComponentType;
}

export function ComponentPreview() {
  const [activeRoute, setActiveRoute] = useState<string>('welcome');

  const routes: PreviewRoute[] = [
    { name: 'Welcome', path: 'welcome', component: WelcomePreview },
    { name: 'Toolbar', path: 'toolbar', component: ToolbarPreview },
    { name: 'NewProjectDialog', path: 'new-project-dialog', component: NewProjectDialogPreview },
    { name: 'QuickSelectPalette', path: 'quick-select-palette', component: QuickSelectPalettePreview },
    { name: 'MetaBlockPlacementModal', path: 'meta-block-placement-modal', component: MetaBlockPlacementModalPreview },
    { name: 'LayerControls', path: 'layer-controls', component: LayerControlsPreview },
    { name: 'LayerDimensionControl', path: 'layer-dimension-control', component: LayerDimensionControlPreview },
    { name: 'Canvas2DView', path: 'canvas-2d-view', component: Canvas2DViewPreview },
    { name: 'Preview3DView', path: 'preview-3d-view', component: Preview3DViewPreview },
    { name: 'TabbedLayout', path: 'tabbed-layout', component: TabbedLayoutPreview },
    { name: 'QuadLayout', path: 'quad-layout', component: QuadLayoutPreview },
    { name: 'WelcomeView', path: 'welcome-view', component: WelcomeViewPreview },
  ];

  const handleRouteChange = (path: string) => {
    setActiveRoute(path);
  };

  const isActiveRoute = (route: { path: string }): boolean => route.path === activeRoute;
  const activePreviewRoute = routes.find(isActiveRoute);
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
