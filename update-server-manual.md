# Manual Server Update Instructions

Since GitHub is blocking pushes due to API keys in commit history, here's how to manually update the server.js file on Render:

## Option 1: Allow Secrets on GitHub (Recommended)

1. Go to this URL to allow the Groq API Key:
   https://github.com/ynyogeshnigam1004-arch/beta/security/secret-scanning/unblock-secret/3C2iUwJ7Ozz6azVEBTHAMa57hYc

2. Go to this URL to allow the Google OAuth Client ID:
   https://github.com/ynyogeshnigam1004-arch/beta/security/secret-scanning/unblock-secret/3C2iUuqALj18bzxtA9rRIdzDx4J

3. Go to this URL to allow the Google OAuth Client Secret:
   https://github.com/ynyogeshnigam1004-arch/beta/security/secret-scanning/unblock-secret/3C2iUwZIVjDj6aOkBZBPhTlmQZZ

4. Go to this URL to allow the Stripe Test API Secret:
   https://github.com/ynyogeshnigam1004-arch/beta/security/secret-scanning/unblock-secret/3C2iUslVPSXeDUO10asgDKIVaiY

5. After allowing all secrets, run:
   ```bash
   git push origin main
   ```

## Option 2: Direct File Edit on GitHub

1. Go to: https://github.com/ynyogeshnigam1004-arch/beta/blob/main/backend/server.js
2. Click the "Edit" button (pencil icon)
3. Replace the entire content with the fixed server.js code
4. Commit the changes directly on GitHub

## What the Fixed Server Does

✅ Proper Express setup with CORS
✅ Authentication routes mounted at `/api/auth`
✅ Health check endpoints at `/` and `/health`
✅ Test endpoint at `/api/test`
✅ Error handling middleware
✅ WebSocket support
✅ MongoDB connection with proper error handling

## Test After Update

Once deployed, test these endpoints:
- https://beta-rgl7.onrender.com/ (should return success message)
- https://beta-rgl7.onrender.com/health (should return health status)
- https://beta-rgl7.onrender.com/api/test (should return test message)
- https://beta-rgl7.onrender.com/api/auth/google (should return Google OAuth URL)