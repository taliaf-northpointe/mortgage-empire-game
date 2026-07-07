import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/fraunces/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './ui/tokens.css';
import { App } from './App';
import { initTheme } from './ui/theme';

initTheme(); // set light/dark before first paint

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
