import { useState, useEffect } from 'react';
import { Provider, defaultTheme } from '@adobe/react-spectrum';
import { ComponentPreview } from './preview/ComponentPreview';

export function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <Provider theme={defaultTheme} colorScheme="light">
      {route === '#/preview' ? (
        <ComponentPreview />
      ) : (
        <div style={{ padding: '20px' }}>
          <h1>Minecraft Magic Blueprint</h1>
          <p>Bootstrap successful! The application is ready for development.</p>
          <p>
            Next steps: Implement core singleton classes and UI components.
          </p>
          <div style={{ marginTop: '20px' }}>
            <a
              href="#/preview"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                background: '#0078d4',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              View Component Preview →
            </a>
          </div>
        </div>
      )}
    </Provider>
  );
}
