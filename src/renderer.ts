/**
 * This file will be executed in the renderer process for that window.
 * No Node.js APIs are available in this process because `nodeIntegration` is turned off and `contextIsolation` is turned on.
 * Use the contextBridge API in `preload.js` to safely expose functionality to the renderer.
 */

console.log('Renderer process loaded');
console.log('Electron API available:', typeof window.electronAPI !== 'undefined');
// Removed deprecated database namespace log after migration to filesystem API

// Add any renderer-specific logic here
// This is where you would typically initialize your UI framework (React, Vue, etc.)
// or handle DOM manipulation

// DOM manipulation is handled by React app in app.tsx
// This file is kept for renderer process initialization if needed
