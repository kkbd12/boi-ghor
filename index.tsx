import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set the workerSrc for pdf.js globally to ensure it's available for all components.
// This version should be a specific version that is compatible with the one in the importmap.
GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@5.4.296/build/pdf.worker.mjs';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);