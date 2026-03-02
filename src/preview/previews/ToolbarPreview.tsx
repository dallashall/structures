import { useState } from 'react';
import { View, Heading, Content, Well, Text } from '@adobe/react-spectrum';
import { Toolbar } from '../../components/Toolbar';
import { mockCallbacks } from '../mockData';

/**
 * Preview showcase for the Toolbar component
 * Demonstrates toolbar with and without active project
 */
export function ToolbarPreview() {
  const [is3DMode, setIs3DMode] = useState(false);

  const handleToggle3D = () => {
    setIs3DMode(!is3DMode);
    mockCallbacks.onToggle3D();
  };

  return (
    <View>
      <Heading level={1}>Toolbar</Heading>
      <Content marginBottom="size-400">
        Application header with primary actions: New, Save, Open projects, and
        toggle between 2D editor and 3D preview mode.
      </Content>

      {/* No Project Active */}
      <View marginTop="size-600">
        <Heading level={2}>No Active Project</Heading>
        <Content marginBottom="size-200">
          Toolbar state when no project is loaded. Note that Save button is
          disabled.
        </Content>
        <View
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          overflow="hidden"
        >
          <Toolbar
            projectName={null}
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={false}
          />
        </View>
      </View>

      {/* With Project (2D Mode) */}
      <View marginTop="size-600">
        <Heading level={2}>Active Project - 2D Editor Mode</Heading>
        <Content marginBottom="size-200">
          Toolbar with an active project named "Sample House". All buttons
          enabled.
        </Content>
        <View
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          overflow="hidden"
        >
          <Toolbar
            projectName="Sample House"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={false}
          />
        </View>
      </View>

      {/* With Project (3D Mode) */}
      <View marginTop="size-600">
        <Heading level={2}>Active Project - 3D Preview Mode</Heading>
        <Content marginBottom="size-200">
          Toolbar with 3D mode active (note the accent variant on Toggle button).
        </Content>
        <View
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          overflow="hidden"
        >
          <Toolbar
            projectName="Medieval Castle"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={true}
          />
        </View>
      </View>

      {/* Long Project Name */}
      <View marginTop="size-600">
        <Heading level={2}>Long Project Name</Heading>
        <Content marginBottom="size-200">
          Toolbar with a longer project name to test text overflow behavior.
        </Content>
        <View
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          overflow="hidden"
        >
          <Toolbar
            projectName="My Very Long Project Name For A Complex Minecraft Structure"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={false}
          />
        </View>
      </View>

      {/* Interactive Demo */}
      <View marginTop="size-600">
        <Heading level={2}>Interactive Demo</Heading>
        <Content marginBottom="size-200">
          Click buttons to test interactions. Toggle 3D mode button changes
          variant. Check console for callback logs.
        </Content>
        <View
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          overflow="hidden"
        >
          <Toolbar
            projectName="Interactive Demo Project"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onToggle3D={handleToggle3D}
            is3DMode={is3DMode}
          />
        </View>
        <Well marginTop="size-200">
          <Heading level={4}>Current Mode</Heading>
          <Content>
            <Text><strong>{is3DMode ? '3D Preview Mode' : '2D Editor Mode'}</strong></Text>
          </Content>
        </Well>
      </View>

      {/* Multiple Instances */}
      <View marginTop="size-600">
        <Heading level={2}>Multiple Project Examples</Heading>
        <Content marginBottom="size-200">
          Different project names and states
        </Content>
        <View UNSAFE_style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <View
            borderWidth="thin"
            borderColor="gray-300"
            borderRadius="medium"
            overflow="hidden"
          >
            <Toolbar
              projectName="Village House"
              onNewProject={mockCallbacks.onNewProject}
              onSaveProject={mockCallbacks.onSaveProject}
              onOpenProject={mockCallbacks.onOpenProject}
              onToggle3D={mockCallbacks.onToggle3D}
              is3DMode={false}
            />
          </View>
          <View
            borderWidth="thin"
            borderColor="gray-300"
            borderRadius="medium"
            overflow="hidden"
          >
            <Toolbar
              projectName="Nether Portal"
              onNewProject={mockCallbacks.onNewProject}
              onSaveProject={mockCallbacks.onSaveProject}
              onOpenProject={mockCallbacks.onOpenProject}
              onToggle3D={mockCallbacks.onToggle3D}
              is3DMode={true}
            />
          </View>
          <View
            borderWidth="thin"
            borderColor="gray-300"
            borderRadius="medium"
            overflow="hidden"
          >
            <Toolbar
              projectName="Redstone Machine"
              onNewProject={mockCallbacks.onNewProject}
              onSaveProject={mockCallbacks.onSaveProject}
              onOpenProject={mockCallbacks.onOpenProject}
              onToggle3D={mockCallbacks.onToggle3D}
              is3DMode={false}
            />
          </View>
        </View>
      </View>

      {/* Props Documentation */}
      <View marginTop="size-600">
        <Heading level={3}>Props Interface</Heading>
        <Well>
          <pre
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto',
              margin: 0,
            }}
          >
            {`interface ToolbarProps {
  projectName: string | null;       // Current project name (null if no project)
  onNewProject: () => void;         // New project callback
  onSaveProject: () => void;        // Save project callback
  onOpenProject: () => void;        // Open project callback
  onToggle3D: () => void;           // Toggle 3D mode callback
  is3DMode: boolean;                // Current view mode
}

// Save button is disabled when projectName is null
// Toggle button uses accent variant when is3DMode is true`}
          </pre>
        </Well>
      </View>
    </View>
  );
}
