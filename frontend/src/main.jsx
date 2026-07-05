/**
 * App entry point.
 *
 * Provider stack (outermost → innermost):
 *   ThemeProvider    — light/dark tokens on <html>
 *   TooltipProvider  — single Radix tooltip context for the whole app
 *   BrowserRouter    — client-side routing
 *   App              — route table
 *   Toaster          — global Sonner notifications (theme-aware)
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/Toaster';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
