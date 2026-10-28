// Entry point: mounts App with the router and the Ant Design theme from theme.js.
// Fires 'app:ready' after the first paint so the opening gate in index.html can open.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import App from './App';
import { theme } from './theme';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);

// Two frames: the first lets React commit, the second waits for the browser to paint.
requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready'))));
