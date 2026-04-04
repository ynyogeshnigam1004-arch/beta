/**
 * Global Configuration for the Frontend
 * Handles different environments (Development vs Production)
 */

// Use environment variables from Vite (.env files)
// VITE_API_URL: The full URL to your Render backend (e.g., https://your-backend.onrender.com)
// VITE_WS_URL: The full WebSocket URL to your Render backend (e.g., wss://your-backend.onrender.com)

const config = {
  // In development, we use relative paths which Vite proxies to localhost:5001
  // In production, we use the full URL provided in environment variables
  apiUrl: import.meta.env.VITE_API_URL || '',
  wsUrl: import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 'localhost:5001',
  
  // Helper to ensure URLs always start with the base
  getApiUrl: (path) => `${config.apiUrl}${path.startsWith('/') ? path : '/' + path}`,
};

export default config;
