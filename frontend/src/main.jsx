/**
 * WHY this file exists:
 *   This is the entry point for the entire React app.
 *   Vite reads index.html → loads this file → starts React.
 *
 * WHAT it does:
 *   Mounts the App component into the <div id="root"> in index.html.
 *   Wraps everything in BrowserRouter so React Router can manage URLs.
 *
 * HOW React mounting works:
 *   ReactDOM.createRoot() finds the #root div and "takes over" it.
 *   From this point, React controls all the HTML inside that div.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter enables client-side routing (URL changes without page reload) */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
