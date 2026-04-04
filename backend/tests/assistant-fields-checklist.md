# Assistant Configuration Fields Checklist

This document outlines all fields that should be saved in your assistant configuration.

## ✅ Required Fields (Must be saved)

### Basic Information
- ✅ `name` (string) - Assistant name
- ✅ `status` (string) - 'active' or 'inactive'
- ✅ `userId` (ObjectId) - Owner of the assistant (auto-assigned)
- ✅ `id` (string) - Unique assistant ID (auto-generated)
- ✅ `createdAt` (ISO string) - Creation timestamp (auto-generated)
- ✅ `updatedAt` (ISO string) - Last update timestamp (auto-updated)

### Model Configuration
- ✅ `provider` (string) - AI provider (e.g., 'Groq', 'OpenAI', 'Anthropic')
- ✅ `model` (string) - Model name (e.g., 'llama-3.1-8b-instant')
- ✅ `maxTokens` (number) - Maximum tokens per response (default: 250)
- ✅ `temperature` (number) - Response randomness 0-1 (default: 0.5)

### Conversation Configuration
- ✅ `firstMessageMode` (string) - How conversation starts
  - Options: 'assistant-speaks-first', 'assistant-waits', 'custom'
- ✅ `firstMessage` (string) - Initial greeting message
- ✅ `systemPrompt` (string) - Instructions for the AI assistant

## 📦 Optional Fields (Can be saved)

### Voice Configuration
```javascript
voice: {
  provider: 'ElevenLabs',      // Voice provider
  voiceId: 'default',          // Voice ID
  stability: 0.5,              // Voice stability (0-1)
  similarityBoost: 0.75,       // Similarity boost (0-1)
  style: 0,                    // Style exaggeration (0-1)
  useSpeakerBoost: true        // Enable speaker boost
}
```

### Transcriber Configuration
```javascript
transcriber: {
  provider: 'Deepgram',        // STT provider
  model: 'nova-2',             // Transcription model
  language: 'en'               // Language code
}
```

### Tools Configuration
```javascript
tools: []  // Array of tool IDs (strings)
// Example: ['tool_abc123', 'tool_def456']
```

### Advanced Settings
```javascript
advanced: {
  endCallMessage: 'Thank you for calling. Goodbye!',
  endCallPhrases: ['goodbye', 'bye', 'end call'],
  recordingEnabled: true,
  maxDuration: 1800,           // Max call duration in seconds
  silenceTimeout: 30,          // Silence timeout in seconds
  backgroundSound: 'office',   // Background sound
  hipaaEnabled: false          // HIPAA compliance mode
}
```

### Analysis Configuration
```javascript
analysis: {
  summaryPrompt: 'Summarize the key points...',
  structuredDataSchema: {},    // JSON schema for structured data
  successEvaluationPrompt: 'Was the call successful?'
}
```

### Compliance Settings
```javascript
compliance: {
  recordingDisclosure: true,
  recordingDisclosureMessage: 'This call may be recorded...',
  privacyPolicyUrl: '',
  termsOfServiceUrl: ''
}
```

### Widget Configuration
```javascript
widget: {
  enabled: false,
  buttonColor: '#007bff',
  buttonPosition: 'bottom-right',
  welcomeMessage: 'Hi! How can I help you?'
}
```

### Phone Configuration
```javascript
phone: {
  number: '',                  // Assigned phone number
  forwardingNumber: ''         // Forwarding/transfer number
}
```

## 🔒 Protected Fields (Cannot be changed by frontend)

- ❌ `userId` - Always preserved from existing assistant
- ❌ `_id` - MongoDB internal ID (removed before update)
- ❌ `id` - Assistant ID (cannot be changed after creation)

## 📝 Example Complete Configuration

```javascript
{
  // Auto-generated fields
  "id": "asst_1234567890_abc123",
  "userId": "507f1f77bcf86cd799439011",
  "createdAt": "2024-03-09T10:30:00.000Z",
  "updatedAt": "2024-03-09T10:30:00.000Z",
  
  // Required fields
  "name": "Customer Support Assistant",
  "status": "active",
  "provider": "Groq",
  "model": "llama-3.1-8b-instant",
  "maxTokens": 250,
  "temperature": 0.5,
  "firstMessageMode": "assistant-speaks-first",
  "firstMessage": "Hello! How can I help you today?",
  "systemPrompt": "You are a helpful customer support assistant...",
  
  // Optional fields
  "tools": ["tool_transfer_call", "tool_book_appointment"],
  "voice": {
    "provider": "ElevenLabs",
    "voiceId": "default",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "transcriber": {
    "provider": "Deepgram",
    "model": "nova-2",
    "language": "en"
  },
  "advanced": {
    "recordingEnabled": true,
    "maxDuration": 1800,
    "endCallMessage": "Thank you for calling!"
  }
}
```

## 🧪 How to Test

Run the test suite:
```bash
cd backend
node tests/assistant-config.test.js
```

This will:
1. ✅ Validate all required fields are present
2. ✅ Create a test assistant with full configuration
3. ✅ Update the assistant configuration
4. ✅ Retrieve and validate all fields
5. ✅ Check field types are correct
6. ✅ Clean up test data

## 🔍 Field Validation Rules

### String Fields
- Must not be empty for required fields
- Can contain any valid UTF-8 characters
- Recommended max length: 5000 chars for prompts

### Number Fields
- `maxTokens`: 1 - 4096
- `temperature`: 0.0 - 1.0
- `maxDuration`: 60 - 7200 (1 min to 2 hours)

### Array Fields
- `tools`: Array of valid tool IDs
- `endCallPhrases`: Array of strings

### Status Field
- Valid values: 'active', 'inactive'
- Default: 'inactive'

## 💡 Best Practices

1. Always include all required fields when creating an assistant
2. Use meaningful names and descriptions
3. Test your configuration before deploying
4. Keep system prompts concise but clear
5. Enable recording for quality assurance
6. Set appropriate maxDuration to prevent long calls
7. Use tools array to extend functionality
8. Validate tool IDs exist before saving
