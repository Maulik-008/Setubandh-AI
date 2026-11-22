import { ApiStatus } from './components/ApiStatus';
import { ColorModeToggle } from './components/ColorModeToggle';

/** Placeholder shell. The real layout arrives with the design system (M1-05). */
export function App() {
  return (
    <main>
      <h1>Setubandh AI</h1>
      <p>One inbox for WhatsApp, Instagram and Messenger.</p>
      <ApiStatus />
      <ColorModeToggle />
    </main>
  );
}
