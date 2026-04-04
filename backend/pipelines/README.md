# 📂 Pipelines Directory

## Main Pipeline - Voice AI Workflow Handler

This directory contains the **Main Pipeline** - the centralized workflow orchestrator for voice AI calls.

---

## 📄 Files

### `mainPipeline.js`
The primary workflow handler that processes voice calls through a sequential pipeline:

**Transcriber → LLM Model → TTS**

---

## 🎯 Purpose

When a user clicks **"Make a Call"** in the frontend, the Main Pipeline:

1. **Receives** audio from the microphone
2. **Transcribes** audio to text (Whisper)
3. **Processes** text through LLM (Groq)
4. **Generates** speech from AI response (Cartesia)
5. **Sends** audio back to the user

---

## 🚀 Quick Start

### Activate Pipeline (Backend)

```javascript
const MainPipeline = require('./pipelines/mainPipeline');

// Create pipeline instance
const pipeline = new MainPipeline(connectionId, websocket);

// Activate with config
await pipeline.activate({
  model: 'llama-3.3-70b-versatile',
  transcriber: 'whisper-large-v3-turbo',
  voiceModel: 'sonic-2024-10',
  voiceId: 'your-voice-id',
  systemPrompt: 'You are a helpful assistant.'
});

// Process audio
await pipeline.processAudio(audioBuffer);

// Deactivate
await pipeline.deactivate();
```

### Activate Pipeline (Frontend)

```javascript
// Connect WebSocket
const ws = new WebSocket('ws://localhost:5000');

// Activate pipeline
ws.send(JSON.stringify({
  type: 'start_main_pipeline',
  config: {
    model: 'llama-3.3-70b-versatile-128k',
    transcriber: 'whisper-large-v3-turbo',
    voiceModel: 'sonic-2024-10',
    voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    systemPrompt: 'You are a helpful voice assistant.'
  }
}));

// Send audio
ws.send(audioBuffer); // Binary audio data

// Stop pipeline
ws.send(JSON.stringify({
  type: 'stop_main_pipeline'
}));
```

---

## 📊 Workflow Steps

### Step 1: Transcriber (STT)
```javascript
runTranscriber(audioBuffer)
  ↓
groqService.transcribeAudio(buffer, 'whisper-large-v3-turbo')
  ↓
Returns: transcript text
  ↓
Sends: { type: 'transcriber_completed', text: '...', latency: 850 }
```

### Step 2: LLM Model
```javascript
runLLM(transcript)
  ↓
groqService.generateResponse(messages, { model, stream: true })
  ↓
Returns: AI response (streaming)
  ↓
Sends: { type: 'llm_chunk', text: '...' }
       { type: 'llm_completed', text: '...', latency: 1200 }
```

### Step 3: TTS
```javascript
runTTS(aiResponse)
  ↓
cartesiaService.textToSpeech(text, { model_id, voice_id })
  ↓
Returns: audio buffer
  ↓
Sends: Binary audio data
       { type: 'tts_completed', latency: 650 }
```

---

## 📡 Events

### Emitted Events

| Event Type | When | Data |
|------------|------|------|
| `pipeline_activated` | Pipeline starts | Config |
| `transcriber_started` | STT begins | - |
| `transcriber_completed` | STT done | Transcript, latency |
| `llm_started` | LLM begins | - |
| `llm_chunk` | LLM streaming | Text chunk |
| `llm_completed` | LLM done | Full text, latency |
| `tts_started` | TTS begins | - |
| `tts_completed` | TTS done | Latency |
| `workflow_completed` | All done | Metrics |
| `pipeline_error` | Error occurs | Error message |

---

## 🎛️ Configuration Options

```javascript
{
  // LLM Configuration
  model: 'llama-3.3-70b-versatile',     // Groq model
  temperature: 0.7,                     // LLM temperature
  maxTokens: 500,                       // Max response tokens
  systemPrompt: 'You are...',           // System prompt
  
  // Transcriber Configuration
  transcriber: 'whisper-large-v3-turbo', // Whisper model
  
  // TTS Configuration
  voiceModel: 'sonic-2024-10',          // Cartesia model
  voiceId: 'a0e99841-...',              // Voice ID
  
  // First Message
  firstMessage: 'Hello!',               // First message text
  firstMessageMode: 'assistant-speaks-first' // Mode
}
```

---

## 📊 Metrics

The pipeline tracks performance metrics:

```javascript
{
  sttLatency: 850,           // Transcriber time (ms)
  llmLatency: 1200,          // LLM processing time (ms)
  ttsLatency: 650,           // TTS generation time (ms)
  totalLatency: 2700,        // Total workflow time (ms)
  audioChunksReceived: 10,   // Chunks received
  audioChunksProcessed: 10   // Chunks processed
}
```

Access metrics:
```javascript
const status = pipeline.getStatus();
console.log(status.metrics);
```

---

## 🔍 Logging

The pipeline provides detailed console output:

```
============================================================
🚀 ACTIVATING MAIN PIPELINE for conn_1234567890_abc123
============================================================

──────────────────────────────────────────────────────────
🎙️  WORKFLOW START #1
──────────────────────────────────────────────────────────

🎤 [STEP 1/3] TRANSCRIBER - Starting...
✅ [STEP 1/3] TRANSCRIBER - Complete (850ms)
📝 Transcript: "Hello, how are you?"

🧠 [STEP 2/3] LLM MODEL - Starting...
✅ [STEP 2/3] LLM MODEL - Complete (1200ms)
💬 Response: "I'm doing great!"

🗣️  [STEP 3/3] TTS - Starting...
✅ [STEP 3/3] TTS - Complete (650ms)

──────────────────────────────────────────────────────────
✅ WORKFLOW COMPLETE #1
⏱️  Total Latency: 2700ms
──────────────────────────────────────────────────────────
```

---

## 🛠️ API Methods

### Constructor
```javascript
new MainPipeline(connectionId, websocket)
```

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `activate(config)` | Start pipeline with config | `Promise<void>` |
| `processAudio(buffer)` | Process audio through pipeline | `Promise<void>` |
| `deactivate()` | Stop pipeline | `Promise<void>` |
| `getStatus()` | Get current status | `Object` |
| `getConversationHistory()` | Get conversation | `Array` |
| `clearHistory()` | Clear conversation | `void` |
| `cleanup()` | Clean up resources | `void` |

### sendToClient(data)
```javascript
// Sends JSON to WebSocket client
pipeline.sendToClient({
  type: 'custom_event',
  data: {...}
});
```

---

## 🔄 Integration with Server

The Main Pipeline is integrated in `backend/server.js`:

```javascript
const MainPipeline = require('./pipelines/mainPipeline');

// On WebSocket message: 'start_main_pipeline'
connection.mode = 'main';
connection.mainPipeline = new MainPipeline(connectionId, ws);
await connection.mainPipeline.activate(config);

// On audio message (binary)
if (connection.mode === 'main' && connection.mainPipeline) {
  await connection.mainPipeline.processAudio(audioBuffer);
}

// On WebSocket message: 'stop_main_pipeline'
if (connection.mainPipeline) {
  await connection.mainPipeline.deactivate();
  connection.mainPipeline.cleanup();
}
```

---

## 🎯 Use Cases

### 1. Voice Calls
- User speaks into microphone
- Pipeline transcribes, processes, and responds
- AI voice plays through speaker

### 2. Voice Assistants
- Activate on "Make a Call" button
- Maintain conversation context
- Real-time status updates

### 3. Voice Chatbots
- Sequential workflow processing
- Streaming LLM responses
- Audio playback

---

## ⚡ Performance

### Typical Latency
- **Transcriber**: 500-1000ms
- **LLM**: 800-1500ms
- **TTS**: 400-800ms
- **Total**: 2-3 seconds per turn

### Optimization Tips
1. Use faster models for lower latency
2. Reduce max_tokens for quicker responses
3. Enable streaming for perceived speed
4. Cache common responses

---

## 🐛 Error Handling

Errors are caught at each step:

```javascript
try {
  await pipeline.processAudio(buffer);
} catch (error) {
  // Error sent to client as:
  {
    type: 'transcriber_error' | 'llm_error' | 'tts_error',
    error: error.message
  }
}
```

---

## 📚 Documentation

For complete documentation, see:
- `../../MAIN_PIPELINE_GUIDE.md` - Full usage guide
- `../../PIPELINE_FLOW.md` - Flow diagrams
- `../../MAIN_PIPELINE_COMPLETE.md` - Implementation summary

---

## ✅ Features

- ✅ Sequential processing (Transcriber → LLM → TTS)
- ✅ Real-time status updates
- ✅ Streaming LLM responses
- ✅ Conversation history (last 10 messages)
- ✅ Performance metrics tracking
- ✅ Detailed error handling
- ✅ Comprehensive logging
- ✅ WebSocket integration
- ✅ First message support
- ✅ System prompt support

---

## 🚀 Getting Started

1. **Import the pipeline:**
   ```javascript
   const MainPipeline = require('./pipelines/mainPipeline');
   ```

2. **Create instance:**
   ```javascript
   const pipeline = new MainPipeline(connectionId, ws);
   ```

3. **Activate:**
   ```javascript
   await pipeline.activate(config);
   ```

4. **Process audio:**
   ```javascript
   await pipeline.processAudio(audioBuffer);
   ```

5. **Deactivate:**
   ```javascript
   await pipeline.deactivate();
   ```

**That's it! The pipeline handles the rest!** 🎉

---

**Main Pipeline - Your centralized voice AI workflow handler** 🚀

