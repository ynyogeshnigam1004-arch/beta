# Migration from Grok to Groq API

This document summarizes the changes made to use Groq API instead of Grok API.

## Changes Made

### 1. Service File Renamed
- **Old**: `backend/services/grokService.js`
- **New**: `backend/services/groqService.js`

### 2. Class Name Changed
- **Old**: `GrokService`
- **New**: `GroqService`

### 3. Environment Variables Updated

| Old Variable | New Variable | New Default Value |
|-------------|--------------|-------------------|
| `GROK_API_KEY` | `GROQ_API_KEY` | - |
| `GROK_API_URL` | `GROQ_API_URL` | `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | `LLM_MODEL` | `llama-3.1-70b-versatile` |

### 4. API Configuration Changes

#### Speech-to-Text (Whisper)
- **Model**: `whisper-large-v3` (Groq's Whisper implementation)
- **Endpoint**: `${GROQ_API_URL}/audio/transcriptions`
- **Format**: Added `response_format: 'json'` parameter

#### LLM Models
Groq supports multiple high-performance models:
- `llama-3.1-70b-versatile` (recommended for conversations)
- `llama-3.1-8b-instant` (fastest)
- `mixtral-8x7b-32768` (large context)
- `gemma2-9b-it` (instruction following)

### 5. Files Modified

1. **backend/services/groqService.js** (renamed from grokService.js)
   - Updated class name to `GroqService`
   - Changed API URL to Groq endpoint
   - Updated Whisper model to `whisper-large-v3`
   - Updated default LLM model to `llama-3.1-70b-versatile`
   - Updated all console logs and error messages

2. **backend/services/streamingPipeline.js**
   - Updated import: `require('./groqService')`
   - Changed property: `this.groqService` (was `this.grokService`)
   - Updated all method calls to use `this.groqService`
   - Updated health check status key to `groq`

3. **backend/server.js**
   - Updated console log to show "Groq API" status

4. **backend/env.example**
   - Updated all environment variable names
   - Changed API URL to Groq endpoint
   - Added Groq model options in comments
   - Updated documentation links

5. **backend/README.md**
   - Updated all references from Grok to Groq
   - Changed API documentation links
   - Updated model names and descriptions
   - Added Groq models comparison table
   - Updated troubleshooting section

## Getting Started with Groq

### 1. Get Your API Key
Visit [https://console.groq.com/](https://console.groq.com/) to create an account and get your API key.

### 2. Update Your .env File
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-70b-versatile
```

### 3. Install Dependencies (if needed)
```bash
cd backend
npm install
```

### 4. Start the Server
```bash
npm start
```

## Key Differences: Groq vs Grok

| Feature | Groq | Grok |
|---------|------|------|
| **Provider** | Groq (groq.com) | X.AI (x.ai) |
| **API URL** | `api.groq.com/openai/v1` | `api.x.ai/v1` |
| **Models** | Llama 3.1, Mixtral, Gemma | Grok-beta |
| **Speed** | Ultra-fast (LPU inference) | Fast |
| **Whisper** | `whisper-large-v3` | `whisper-1` |
| **Context** | Up to 128K tokens | Varies |
| **Pricing** | Free tier available | Varies |

## Benefits of Groq

1. **Ultra-Fast Inference**: Groq's LPU (Language Processing Unit) provides extremely fast response times
2. **Multiple Models**: Choose from various open-source models
3. **Large Context**: Support for up to 128K token context windows
4. **OpenAI Compatible**: Uses OpenAI-compatible API format
5. **Free Tier**: Generous free tier for development and testing
6. **Whisper Integration**: Built-in Whisper support for speech-to-text

## Testing the Changes

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "groq": true,
    "elevenlabs": true,
    "overall": true
  }
}
```

### WebSocket Test
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'text_input',
    text: 'Hello, test Groq integration!',
    enableTTS: true
  }));
};
```

## Troubleshooting

### "GROQ_API_KEY not set" Warning
- Ensure your `.env` file exists in the `backend` directory
- Verify the variable name is `GROQ_API_KEY` (not `GROK_API_KEY`)
- Check that the API key is valid

### API Connection Issues
- Verify the API URL: `https://api.groq.com/openai/v1`
- Check your internet connection
- Ensure your API key has proper permissions

### Model Not Found
- Use one of the supported models:
  - `llama-3.1-70b-versatile`
  - `llama-3.1-8b-instant`
  - `mixtral-8x7b-32768`
  - `gemma2-9b-it`

## Additional Resources

- [Groq Documentation](https://console.groq.com/docs)
- [Groq API Reference](https://console.groq.com/docs/api-reference)
- [Groq Models](https://console.groq.com/docs/models)
- [Groq Console](https://console.groq.com/)

---

**Migration completed successfully!** 🎉

All references to Grok have been updated to Groq throughout the codebase.


