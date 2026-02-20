// Entry point: mount the Preact application.

import { render } from 'preact';
import { App } from './ui-app.tsx';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}

// Service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
