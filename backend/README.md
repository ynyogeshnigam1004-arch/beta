# Voice AI Calling Platform

A real-time voice AI calling platform built with Node.js, WebSocket, Groq API, and ElevenLabs. Similar to VAPI.ai architecture with low-latency streaming capabilities.

## 🌟 Features

- **Real-time WebSocket Communication**: Bidirectional streaming for voice conversations
- **Speech-to-Text**: Powered by Groq's Whisper API for accurate transcription
- **LLM Processing**: Streaming responses from Groq (Llama 3.1, Mixtral) for natural conversations
- **Text-to-Speech**: High-quality voice synthesis with ElevenLabs
- **Low Latency Pipeline**: Optimized streaming architecture for minimal delay
- **Modular Architecture**: Clean separation of concerns with service-based design
- **Event-Driven**: Real-time updates throughout the processing pipeline
- **Conversation Memory**: Maintains context across multiple turns
- **Graceful Error Handling**: Robust error management at every stage

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Groq API Key**: Get yours from [https://console.groq.com/](https://console.groq.com/)
- **ElevenLabs API Key**: Get yours from [https://elevenlabs.io/](https://elevenlabs.io/)

## 🚀 Quick Start

### 1. Installation

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```

### 2. Configuration

Create a `.env` file in the `backend` directory:

```bash
# Copy the example environment file
cp env.example .env
```

Edit `.env` and add your API keys:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Groq API Configuration
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_API_URL=https://api.groq.com/openai/v1

# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Audio Configuration
AUDIO_SAMPLE_RATE=24000
AUDIO_CHUNK_SIZE=4096

# LLM Configuration
LLM_MODEL=llama-3.1-70b-versatile
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=150
STREAM_ENABLED=true

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_PAYLOAD=10485760

# Logging
LOG_LEVEL=info
```

### 3. Run the Server

```bash
# Start the server
npm start

# Or use nodemon for development (auto-restart on changes)
npm run dev
```

The server will start on `http://localhost:3000`

## 🔧 API Endpoints

### HTTP Endpoints

#### Health Check
```
GET /health
```

Returns the health status of all services:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T12:00:00.000Z",
  "services": {
    "groq": true,
    "elevenlabs": true,
    "overall": true
  },
  "connections": 2
}
```

#### Server Status
```
GET /status
```

Returns server statistics:
```json
{
  "uptime": 3600,
  "connections": 2,
  "memory": {...},
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

## 🔌 WebSocket Protocol

### Connection

Connect to: `ws://localhost:3000`

Upon connection, you'll receive:
```json
{
  "type": "connection_established",
  "connectionId": "conn_1234567890_abcdef",
  "timestamp": "2025-10-09T12:00:00.000Z",
  "message": "Connected to Voice AI Platform"
}
```

### Sending Messages

#### 1. Send Audio Data (Binary)

Send raw audio data as binary WebSocket frames. The server expects WebM format by default.

```javascript
// Example: Send audio blob
websocket.send(audioBlob);
```

#### 2. Send Text Input (JSON)

Process text directly without audio:
```json
{
  "type": "text_input",
  "text": "Hello, how are you?",
  "enableTTS": true
}
```

#### 3. Text-to-Speech Only

Convert text to speech without LLM:
```json
{
  "type": "tts_only",
  "text": "This is a test message"
}
```

#### 4. Set System Prompt

Customize the AI's behavior:
```json
{
  "type": "set_system_prompt",
  "prompt": "You are a friendly customer service agent."
}
```

#### 5. Clear Conversation History

```json
{
  "type": "clear_history"
}
```

#### 6. Get Conversation History

```json
{
  "type": "get_history"
}
```

#### 7. Get Pipeline Status

```json
{
  "type": "get_status"
}
```

#### 8. Reset Pipeline

```json
{
  "type": "reset"
}
```

#### 9. Ping/Pong

```json
{
  "type": "ping"
}
```

### Receiving Messages

#### Event: Processing Started
```json
{
  "type": "processing_started",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

#### Event: STT Started
```json
{
  "type": "stt_started",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

#### Event: STT Completed
```json
{
  "type": "stt_completed",
  "text": "Hello, how are you?",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

#### Event: LLM Started
```json
{
  "type": "llm_started",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

#### Event: LLM Chunk (Streaming)
```json
{
  "type": "llm_chunk",
  "text": "I'm ",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

#### Event: LLM Completed
```json
{
  "type": "llm_completed",
  "text": "I'm doing great, thank you for asking!",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

#### Event: Audio Chunk (Binary)

Audio chunks are sent as binary WebSocket frames containing MP3 audio data. Play these immediately for low-latency audio output.

#### Event: Processing Completed
```json
{
  "type": "processing_completed",
  "userText": "Hello, how are you?",
  "assistantText": "I'm doing great, thank you for asking!",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

#### Event: Error
```json
{
  "type": "error",
  "stage": "stt",
  "error": "Transcription failed: timeout",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

## 🏗️ Architecture

### Project Structure

```
backend/
├── server.js                      # Main WebSocket server
├── services/
│   ├── groqService.js            # Groq API integration (STT & LLM)
│   ├── elevenLabsService.js      # ElevenLabs TTS integration
│   └── streamingPipeline.js      # Main voice processing pipeline
├── package.json                   # Dependencies
├── env.example                    # Environment variables template
└── README.md                      # This file
```

### Processing Pipeline

```
Audio Input (WebSocket)
    ↓
Speech-to-Text (Groq Whisper API)
    ↓
LLM Processing (Groq Streaming - Llama 3.1)
    ↓
Text-to-Speech (ElevenLabs Streaming)
    ↓
Audio Output (WebSocket)
```

### Key Components

#### 1. **GroqService** (`services/groqService.js`)
- Speech-to-text transcription using Whisper
- Streaming LLM chat completions (Llama 3.1, Mixtral, Gemma)
- Conversation context management
- Health checks

#### 2. **ElevenLabsService** (`services/elevenLabsService.js`)
- Text-to-speech conversion
- Streaming audio generation
- Smart text buffering for natural speech
- Voice management

#### 3. **StreamingPipeline** (`services/streamingPipeline.js`)
- Orchestrates the complete voice AI flow
- Event-driven architecture
- Conversation history management
- Real-time status updates

#### 4. **WebSocket Server** (`server.js`)
- Handles real-time bidirectional communication
- Connection management with heartbeat
- Message routing and event forwarding
- Graceful shutdown handling

## 🎯 Usage Examples

### Example 1: Simple WebSocket Client (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected to Voice AI Platform');
  
  // Send text input
  ws.send(JSON.stringify({
    type: 'text_input',
    text: 'Tell me a joke',
    enableTTS: true
  }));
};

ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Audio chunk received - play it
    playAudioChunk(event.data);
  } else {
    // JSON message received
    const message = JSON.parse(event.data);
    console.log('Received:', message);
    
    if (message.type === 'llm_chunk') {
      console.log('AI says:', message.text);
    }
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

### Example 2: Sending Audio from Microphone

```javascript
const ws = new WebSocket('ws://localhost:3000');

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        // Send audio data to server
        ws.send(event.data);
      }
    };
    
    // Start recording in chunks
    mediaRecorder.start(1000); // Send audio every 1 second
  })
  .catch(error => {
    console.error('Error accessing microphone:', error);
  });
```

### Example 3: Custom System Prompt

```javascript
ws.send(JSON.stringify({
  type: 'set_system_prompt',
  prompt: 'You are a helpful medical assistant. Provide clear, compassionate advice while reminding users to consult healthcare professionals for serious concerns.'
}));
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "GROQ_API_KEY not set" Warning
- Ensure you've created a `.env` file with your Groq API key
- Verify the key is correct and has proper permissions
- Get your API key from [https://console.groq.com/](https://console.groq.com/)

#### 2. "ElevenLabs API health check failed"
- Check your ElevenLabs API key
- Verify you have sufficient character quota
- Ensure your subscription is active

#### 3. WebSocket Connection Failed
- Verify the server is running on the correct port
- Check firewall settings
- Ensure no other service is using port 3000

#### 4. Audio Not Playing
- Check that audio chunks are being received
- Verify audio codec support in your browser
- Ensure speakers/headphones are connected

#### 5. High Latency
- Reduce `LLM_MAX_TOKENS` for faster responses
- Use `eleven_turbo_v2` model for ElevenLabs
- Increase `optimize_streaming_latency` parameter (max: 4)

## 🔐 Security Considerations

**Important**: This is a development setup. For production:

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Use secure key management systems
3. **CORS**: Restrict origins in production
4. **Rate Limiting**: Implement rate limiting for API calls
5. **Authentication**: Add user authentication for WebSocket connections
6. **HTTPS/WSS**: Use secure protocols in production
7. **Input Validation**: Validate and sanitize all inputs
8. **Error Messages**: Don't expose sensitive information in errors

## 📊 Performance Optimization

### Tips for Low Latency

1. **Streaming**: Enable streaming for both LLM and TTS
2. **Buffering**: Use smart text buffering (sentence-by-sentence)
3. **Chunk Size**: Optimize audio chunk sizes for your network
4. **Model Selection**: Use faster models (e.g., `eleven_turbo_v2`)
5. **Concurrent Processing**: Pipeline overlaps STT → LLM → TTS
6. **Network**: Use WebSocket for bidirectional streaming
7. **Server Location**: Host close to API providers for lower latency

### Resource Management

- Monitor memory usage with `/status` endpoint
- Implement connection limits for production
- Set appropriate timeouts for API calls
- Clean up resources on disconnect

## 🧪 Testing

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test status endpoint
curl http://localhost:3000/status
```

### WebSocket Testing

Use tools like:
- [wscat](https://github.com/websockets/wscat): Command-line WebSocket client
- [Postman](https://www.postman.com/): WebSocket testing in GUI
- Browser DevTools: Built-in WebSocket inspector

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket server
wscat -c ws://localhost:3000

# Send a test message
> {"type": "text_input", "text": "Hello!", "enableTTS": true}
```

## 📝 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `GROQ_API_KEY` | - | Groq API key (required) |
| `GROQ_API_URL` | `https://api.groq.com/openai/v1` | Groq API base URL |
| `ELEVENLABS_API_KEY` | - | ElevenLabs API key (required) |
| `ELEVENLABS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` | Voice ID for TTS |
| `AUDIO_SAMPLE_RATE` | `24000` | Audio sample rate |
| `AUDIO_CHUNK_SIZE` | `4096` | Audio chunk size |
| `LLM_MODEL` | `llama-3.1-70b-versatile` | Groq model name |
| `LLM_TEMPERATURE` | `0.7` | LLM temperature (0-1) |
| `LLM_MAX_TOKENS` | `150` | Max tokens per response |
| `STREAM_ENABLED` | `true` | Enable streaming |
| `WS_HEARTBEAT_INTERVAL` | `30000` | WebSocket heartbeat (ms) |
| `WS_MAX_PAYLOAD` | `10485760` | Max WebSocket payload (bytes) |
| `LOG_LEVEL` | `info` | Logging level |

## 🎤 Popular ElevenLabs Voice IDs

| Voice ID | Name | Description |
|----------|------|-------------|
| `21m00Tcm4TlvDq8ikWAM` | Rachel | Calm, clear female voice |
| `EXAVITQu4vr4xnSDxMaL` | Bella | Soft, warm female voice |
| `ErXwobaYiN019PkySvjV` | Antoni | Well-rounded male voice |
| `VR6AewLTigWG4xSOukaG` | Arnold | Deep male voice |

Get more voices at: [https://elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)

## 🛠️ Development

### Adding New Features

The modular architecture makes it easy to extend:

1. **Add new LLM providers**: Create a new service in `services/`
2. **Add new TTS providers**: Implement TTS interface in `services/`
3. **Modify pipeline**: Edit `streamingPipeline.js`
4. **Add endpoints**: Extend `server.js`

### Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Follow event-driven patterns
- Handle errors gracefully
- Use async/await for asynchronous operations

## 📄 License

ISC License - feel free to use this in your projects!

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:

1. Check this README
2. Review API documentation:
   - [Groq API Docs](https://console.groq.com/docs)
   - [ElevenLabs API Docs](https://elevenlabs.io/docs)
3. Check server logs for error details
4. Test with `/health` endpoint

## 🤖 Available Groq Models

Groq offers ultra-fast inference with various models:

| Model | Speed | Context | Best For |
|-------|-------|---------|----------|
| `llama-3.1-70b-versatile` | Fast | 128K | General conversation (recommended) |
| `llama-3.1-8b-instant` | Fastest | 128K | Quick responses, simple tasks |
| `mixtral-8x7b-32768` | Fast | 32K | Complex reasoning |
| `gemma2-9b-it` | Fast | 8K | Instruction following |

**Speech-to-Text**: Groq uses `whisper-large-v3` for transcription with excellent accuracy.

## 🎉 Acknowledgments

- **Groq**: For ultra-fast LLM inference and Whisper STT
- **ElevenLabs**: For high-quality text-to-speech
- **WebSocket**: For real-time communication protocol

---

**Happy Building! 🚀**

Made with ❤️ for the voice AI community


