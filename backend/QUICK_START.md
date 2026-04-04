# Quick Start Guide - Voice AI Calling Platform

Get your voice AI platform running in 5 minutes! 🚀

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Groq API key from [console.groq.com](https://console.groq.com/)
- [ ] ElevenLabs API key from [elevenlabs.io](https://elevenlabs.io/)

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
cd backend
npm install
```

### 2. Configure Environment (1 minute)

Create a `.env` file in the `backend` directory:

```bash
# Copy the example file
cp env.example .env
```

Edit `.env` and add your API keys:

```env
# Required: Add your API keys here
GROQ_API_KEY=gsk_your_actual_groq_key_here
ELEVENLABS_API_KEY=your_actual_elevenlabs_key_here

# Optional: Choose a voice (default is Rachel)
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Optional: Choose a model (default is llama-3.1-70b-versatile)
LLM_MODEL=llama-3.1-70b-versatile
```

### 3. Start the Server (30 seconds)

```bash
npm start
```

You should see:

```
🚀 Voice AI Calling Platform Server
📡 HTTP Server: http://localhost:3000
🔌 WebSocket Server: ws://localhost:3000
Groq API: ✅ Configured
ElevenLabs API: ✅ Configured
Server is ready to accept connections! 🎉
```

### 4. Test the Server (30 seconds)

Open a new terminal and run:

```bash
# Test health endpoint
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

## Quick Test with WebSocket

### Option 1: Browser Console Test

Open your browser console (F12) and paste:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('✅ Connected!');
  
  // Send a text message
  ws.send(JSON.stringify({
    type: 'text_input',
    text: 'Hello! Tell me a short joke.',
    enableTTS: true
  }));
};

ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    console.log('🎵 Received audio chunk');
    // Audio chunk - you can play this
  } else {
    const msg = JSON.parse(event.data);
    console.log('📨', msg.type, msg);
  }
};

ws.onerror = (error) => console.error('❌ Error:', error);
ws.onclose = () => console.log('🔌 Disconnected');
```

### Option 2: Using wscat (Command Line)

```bash
# Install wscat globally
npm install -g wscat

# Connect to server
wscat -c ws://localhost:3000

# Send a message (paste this after connecting)
{"type": "text_input", "text": "Hello! How are you?", "enableTTS": true}
```

## What's Happening?

When you send a message, the pipeline:

1. **Receives your text** via WebSocket
2. **Processes with Groq LLM** (Llama 3.1) - streams response word-by-word
3. **Converts to speech** with ElevenLabs - streams audio chunks
4. **Sends audio back** via WebSocket for immediate playback

## Common First-Time Issues

### ❌ "GROQ_API_KEY not set"
**Solution**: Make sure your `.env` file exists and has `GROQ_API_KEY=your_key`

### ❌ "Cannot find module"
**Solution**: Run `npm install` in the `backend` directory

### ❌ "Port 3000 already in use"
**Solution**: Change `PORT=3001` in your `.env` file

### ❌ "Health check failed"
**Solution**: 
- Check your API keys are correct
- Verify internet connection
- Check API service status at console.groq.com

## Next Steps

### 1. Try Different Models

Edit `.env` and change the model:

```env
# Fastest model (great for testing)
LLM_MODEL=llama-3.1-8b-instant

# Best for conversation (default)
LLM_MODEL=llama-3.1-70b-versatile

# Best for complex reasoning
LLM_MODEL=mixtral-8x7b-32768
```

### 2. Try Different Voices

Popular ElevenLabs voices:

```env
# Rachel - calm female (default)
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Bella - soft female
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# Antoni - well-rounded male
ELEVENLABS_VOICE_ID=ErXwobaYiN019PkySvjV
```

Get more voices at: https://elevenlabs.io/voice-library

### 3. Customize the AI Personality

Send a custom system prompt:

```javascript
ws.send(JSON.stringify({
  type: 'set_system_prompt',
  prompt: 'You are a friendly pirate captain. Respond in pirate speak!'
}));
```

### 4. Build a Client Application

Check out the examples in `README.md`:
- Browser-based audio recorder
- Real-time audio playback
- Conversation history management

## WebSocket Message Types

### Send to Server:
- `text_input` - Process text through LLM + TTS
- `tts_only` - Convert text to speech only
- `set_system_prompt` - Customize AI behavior
- `clear_history` - Reset conversation
- `get_status` - Get pipeline status
- Binary audio data - Process voice input

### Receive from Server:
- `connection_established` - Connected successfully
- `llm_chunk` - Streaming AI response (text)
- Binary audio chunks - Play immediately
- `processing_completed` - Full turn finished
- `error` - Something went wrong

## Performance Tips

For lowest latency:

```env
# Use fastest model
LLM_MODEL=llama-3.1-8b-instant

# Reduce max tokens
LLM_MAX_TOKENS=100

# Keep temperature moderate
LLM_TEMPERATURE=0.7
```

## Development Mode

For auto-restart on code changes:

```bash
npm run dev
```

## Getting Help

1. Check `README.md` for detailed documentation
2. Check `GROQ_MIGRATION.md` for Groq-specific info
3. Review server logs for error details
4. Test `/health` endpoint for service status

## API Documentation

- **Groq API**: https://console.groq.com/docs
- **ElevenLabs API**: https://elevenlabs.io/docs
- **WebSocket Protocol**: See `README.md`

---

**You're all set!** 🎉

Start building amazing voice AI applications!

For more advanced features and examples, see the full `README.md`.


