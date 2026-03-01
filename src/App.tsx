import { Provider, defaultTheme } from '@adobe/react-spectrum';

export function App() {
  return (
    <Provider theme={defaultTheme} colorScheme="light">
      <div style={{ padding: '20px' }}>
        <h1>Minecraft Magic Blueprint</h1>
        <p>Bootstrap successful! The application is ready for development.</p>
        <p>Next steps: Implement core singleton classes and UI components.</p>
      </div>
    </Provider>
  );
}
