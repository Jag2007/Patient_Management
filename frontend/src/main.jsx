// Entry point: mounts the React app with the Ant Design theme, global styles, and message/modal context.
// Once the first screen has painted it fires "app:ready", which lets the opening gate in index.html open.
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

// Two animation frames = React has committed and the browser has painted the first screen.
requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready'))));
