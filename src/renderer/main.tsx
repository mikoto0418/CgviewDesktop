import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/app.css';
import './i18n/config';

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bridge = (window as any).appBridge;
  console.info(
    '[renderer] appBridge availability',
    bridge ? Object.keys(bridge) : 'not present'
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
