Backend API Host Configuration
================================

Frontend determines the backend base URL in this order:
1. window.__API_BASE__ (can be injected before the bundle) 
2. VITE_API_BASE env variable at build time
3. window.location.origin + '/api' (same-origin fallback)
4. '/api' (SSR / non-browser fallback)

Recommended local setup:
Create frontend/.env with:
VITE_API_BASE=http://localhost:8080/api
VITE_USE_MOCKS=

Production deployment options:
- If backend and frontend served from the same domain under /api, no env change needed.
- If backend lives elsewhere (e.g., https://api.example.com), set VITE_API_BASE=https://api.example.com in the build environment.
- For late-binding (one build, multiple environments) inject a script tag in index.html before assets:
  <script>window.__API_BASE__ = localStorage.getItem('apiBase') || 'https://api.example.com/api';</script>

Temporary override in browser console:
  window.__API_BASE__ = 'http://localhost:8080/api';
  // Subsequent requests will use the new base without reload if code re-initializes client.

Authentication note:
Token persisted in localStorage key edulms.auth. Clear with:
  localStorage.removeItem('edulms.auth');

Troubleshooting:
- 401: Ensure token present and not expired; re-login.
- CORS error: Confirm backend cors() allows frontend origin and the URL matches VITE_API_BASE.
- Mixed content warnings: Use https for both or enable proper dev certificates.
