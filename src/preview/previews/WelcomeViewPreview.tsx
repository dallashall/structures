import { View, Heading, Content } from '@adobe/react-spectrum';
import { WelcomeView } from '../../views/WelcomeView';

export function WelcomeViewPreview() {
  const handleNewProject = () => console.log('[Preview] New project');
  const handleOpenProject = (id: string) => console.log('[Preview] Open:', id);
  const handleLoadFromFile = () => console.log('[Preview] Load from file');

  return (
    <View>
      <Heading level={1}>WelcomeView</Heading>
      <Content marginBottom="size-400">
        Landing page shown when no project is loaded. Displays recent projects
        and options to create new or load from file.
      </Content>

      <View marginTop="size-600" height="600px" borderWidth="thin">
        <WelcomeView
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onLoadFromFile={handleLoadFromFile}
        />
      </View>
    </View>
  );
}
