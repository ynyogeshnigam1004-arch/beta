# API Data Manager Configuration

## ⚠️ IMPORTANT - DO NOT MODIFY

This directory contains the **API Data Manager** which is configured to fetch **ALL available models** from Groq and Cartesia APIs.

## Files

### `apiDataManager.js` - MAIN FILE (DO NOT OVERWRITE)
This file is configured to fetch:
- ✅ **20+ LLM models** from Groq (Llama 3.x, 4.x, Gemma, Qwen, DeepSeek, GPT-OSS, etc.)
- ✅ **3+ Whisper transcribers** from Groq (STT)
- ✅ **100+ voices** from Cartesia
- ✅ **5 TTS models** from Cartesia

### `apiDataManager.BACKUP.js` - BACKUP FILE
A backup copy of the working configuration. If the main file gets corrupted, restore from this backup.

## Configuration Details

### Groq LLM Models Supported (20+)
```
- llama-3.3-70b-versatile
- llama-3.3-70b-specdec
- llama-3.1-70b-versatile
- llama-3.1-8b-instant
- llama-3.2-1b-preview
- llama-3.2-3b-preview
- llama-3.2-11b-vision-preview
- llama-3.2-90b-vision-preview
- llama-guard-3-8b
- llama-4-scout-17bx16e-128k
- llama-4-maverick-17bx128e-128k
- llama-guard-4-12b-128k
- mixtral-8x7b-32768
- gemma-7b-it
- gemma2-9b-it
- gpt-oss-120b-128k
- gpt-oss-20b-128k
- kimi-k2-0905-1t-256k
- qwen3-32b-131k
- qwen2-72b-instruct
- deepseek-r1-distill-llama-70b
- deepseek-r1-distill-qwen-32b
```

### Whisper Transcribers (STT)
```
- whisper-large-v3 (most accurate)
- whisper-large-v3-turbo (fastest)
- distil-whisper-large-v3-en (English-only, ultra-fast)
```

### Cartesia TTS Models
```
- sonic-2024-10 (Latest, recommended)
- sonic-english (English-optimized)
- sonic-multilingual (15+ languages)
- sonic-turbo (Ultra-fast)
- sonic (Legacy)
```

### Cartesia Voices
- Fetches ALL available voices from Cartesia API (100+ voices)
- Includes metadata: name, language, gender, accent

## How It Works

1. **Groq Models**: Calls `https://api.groq.com/openai/v1/models` and categorizes all returned models
2. **Cartesia Voices**: Calls `https://api.cartesia.ai/voices` and fetches all available voices
3. **Pricing & Metadata**: Adds pricing, latency, speed, and feature information for each model
4. **Database Storage**: Saves all models to MongoDB for persistence

## API Endpoints

- `GET /api/models` - Get all Groq models (LLM + STT)
- `GET /api/transcribers` - Get all Whisper transcribers
- `GET /api/voices` - Get all Cartesia voices + TTS models
- `GET /api/all` - Get everything from all providers
- `POST /api/models/refresh` - Force refresh all models from APIs

## Troubleshooting

### If models are not showing up:

1. Check backend logs for errors
2. Verify API keys in `backend/.env`:
   - `GROQ_API_KEY=gsk_...`
   - `CARTESIA_API_KEY=sk_car_...`
3. Click "Refresh Models" button in the UI
4. Check API endpoint: http://localhost:5000/api/models

### If file gets overwritten:

1. Stop the backend server
2. Restore from backup:
   ```bash
   copy backend\services\apiDataManager.BACKUP.js backend\services\apiDataManager.js
   ```
3. Restart the backend server

## Last Updated
2025-01-29

## DO NOT MODIFY
This configuration is working correctly. Any modifications may break the model fetching functionality.
