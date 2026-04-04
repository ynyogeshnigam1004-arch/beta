# 🧠 Reasoning & Function Calling Models Guide

## Overview

Your backend now includes **advanced Groq models** specialized for:
- 🧠 **Reasoning** - Complex problem solving and logical thinking
- 🛠️ **Function Calling** - Tool use and API integration
- 🤖 **Tool Use** - Interacting with external systems

## 📊 Available Models

### 🧠 Reasoning Models

| Model | Size | Context | Description |
|-------|------|---------|-------------|
| **GPT OSS 120B** | 120B | 131K | Most capable - advanced reasoning & function calling |
| **GPT OSS 20B** | 20B | 131K | Fast reasoning & function calling |
| **Qwen 3 32B** | 32B | 32K | Excellent reasoning & function calling |

### 🛠️ Function Calling Models

| Model | Size | Context | Description |
|-------|------|---------|-------------|
| **GPT OSS 120B** | 120B | 131K | Advanced function calling & tool use |
| **GPT OSS 20B** | 20B | 131K | Fast function calling & tool use |
| **Llama 4 Scout** | - | 128K | Specialized function calling & tool use |
| **Qwen 3 32B** | 32B | 32K | Function calling & tool use |
| **Kimi K2** | - | 128K | Specialized function calling & tool use |

### 🎯 General Purpose Models

| Model | Size | Context | Description |
|-------|------|---------|-------------|
| **Llama 3.3 70B** ⭐ | 70B | 128K | Best overall (default) |
| **Llama 3.1 70B** | 70B | 128K | Versatile |
| **Llama 3.1 8B** ⚡ | 8B | 128K | Ultra-fast |
| **Mixtral 8x7B** | 47B | 32K | Complex reasoning |
| **Gemma 2 9B** | 9B | 8K | Instruction tuned |
| **Gemma 7B** | 7B | 8K | Compact |

## 🚀 Quick Start

### 1. Get All Reasoning Models

```javascript
ws.send(JSON.stringify({
  type: 'get_reasoning_models'
}));
```

Response:
```json
{
  "type": "reasoning_models",
  "models": {
    "gpt-oss-120b": {
      "name": "GPT OSS 120B",
      "contextWindow": 131072,
      "description": "Advanced reasoning and function calling - most capable",
      "category": "reasoning",
      "features": ["reasoning", "function_calling", "tool_use"]
    },
    "gpt-oss-20b": {...},
    "qwen3-32b": {...}
  }
}
```

### 2. Get All Function Calling Models

```javascript
ws.send(JSON.stringify({
  type: 'get_function_calling_models'
}));
```

### 3. Get Models by Category

```javascript
// Get only general models
ws.send(JSON.stringify({
  type: 'get_models_by_category',
  category: 'general'
}));

// Get only reasoning models
ws.send(JSON.stringify({
  type: 'get_models_by_category',
  category: 'reasoning'
}));

// Get only function calling models
ws.send(JSON.stringify({
  type: 'get_models_by_category',
  category: 'function_calling'
}));
```

### 4. Get All Models (with optional category filter)

```javascript
// Get all models
ws.send(JSON.stringify({
  type: 'get_available_models'
}));

// Get only reasoning models
ws.send(JSON.stringify({
  type: 'get_available_models',
  category: 'reasoning'
}));
```

## 💡 Usage Examples

### Example 1: Use GPT OSS 120B for Complex Reasoning

```javascript
// Switch to GPT OSS 120B
ws.send(JSON.stringify({
  type: 'set_llm_model',
  model: 'gpt-oss-120b'
}));

// Ask a complex reasoning question
ws.send(JSON.stringify({
  type: 'text_input',
  text: 'Explain the relationship between quantum entanglement and information theory',
  enableTTS: true
}));
```

### Example 2: Use Llama 4 Scout for Function Calling

```javascript
// Switch to Llama 4 Scout
ws.send(JSON.stringify({
  type: 'set_llm_model',
  model: 'llama-4-scout'
}));

// Use with function calling
ws.send(JSON.stringify({
  type: 'text_input',
  text: 'What is the weather in New York?',
  enableTTS: true
}));
```

### Example 3: Use Qwen 3 32B for Balanced Performance

```javascript
// Switch to Qwen 3 32B (reasoning + function calling)
ws.send(JSON.stringify({
  type: 'set_llm_model',
  model: 'qwen3-32b'
}));

// Complex task with reasoning
ws.send(JSON.stringify({
  type: 'text_input',
  text: 'Plan a 5-day trip to Japan with budget considerations',
  enableTTS: true
}));
```

### Example 4: Fast Reasoning with GPT OSS 20B

```javascript
// Switch to GPT OSS 20B (smaller but fast)
ws.send(JSON.stringify({
  type: 'set_llm_model',
  model: 'gpt-oss-20b'
}));

// Quick reasoning task
ws.send(JSON.stringify({
  type: 'text_input',
  text: 'Solve this puzzle: If 2 + 2 = fish, what does 3 + 3 equal?',
  enableTTS: true
}));
```

## 🎯 When to Use Each Model

### 🧠 GPT OSS 120B
**Best for:**
- Complex multi-step reasoning
- Advanced problem solving
- Function calling with multiple tools
- Academic or technical analysis

**Use cases:**
- Research assistance
- Code analysis and debugging
- Mathematical problem solving
- Complex planning tasks

```javascript
ws.send({type: 'set_llm_model', model: 'gpt-oss-120b'});
```

### ⚡ GPT OSS 20B
**Best for:**
- Fast reasoning tasks
- Quick function calling
- Moderate complexity problems
- Real-time applications

**Use cases:**
- Customer support with tools
- Quick calculations
- API integrations
- Real-time decision making

```javascript
ws.send({type: 'set_llm_model', model: 'gpt-oss-20b'});
```

### 🎯 Qwen 3 32B
**Best for:**
- Balanced performance
- Multi-language support
- Reasoning + function calling
- General purpose with advanced features

**Use cases:**
- Multilingual applications
- Content generation with tools
- Educational applications
- Conversational AI with capabilities

```javascript
ws.send({type: 'set_llm_model', model: 'qwen3-32b'});
```

### 🤖 Llama 4 Scout
**Best for:**
- Function calling focus
- Tool use optimization
- API integrations
- Action-oriented tasks

**Use cases:**
- Smart home control
- API workflow automation
- Database queries
- External system integration

```javascript
ws.send({type: 'set_llm_model', model: 'llama-4-scout'});
```

### 🔧 Kimi K2
**Best for:**
- Specialized function calling
- Tool use
- Task automation
- System integration

**Use cases:**
- Workflow automation
- System commands
- Tool orchestration
- Multi-step operations

```javascript
ws.send({type: 'set_llm_model', model: 'kimi-k2'});
```

## 📊 Performance Comparison

| Model | Speed | Reasoning | Function Calling | Best Use |
|-------|-------|-----------|------------------|----------|
| **GPT OSS 120B** | Medium | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Complex tasks |
| **GPT OSS 20B** | Fast | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Quick reasoning |
| **Qwen 3 32B** | Fast | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Balanced |
| **Llama 4 Scout** | Fast | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Function calling |
| **Kimi K2** | Fast | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Tool use |
| **Llama 3.3 70B** | Fast | ⭐⭐⭐⭐ | ⭐⭐⭐ | General (default) |

## 🛠️ Advanced Features

### Filter Models Client-Side

```javascript
// Get all models
ws.send(JSON.stringify({type: 'get_available_models'}));

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'available_models') {
    const llmModels = msg.llm;
    
    // Filter reasoning models
    const reasoningModels = Object.entries(llmModels)
      .filter(([key, value]) => value.category === 'reasoning')
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    
    console.log('Reasoning models:', reasoningModels);
    
    // Filter function calling models
    const functionModels = Object.entries(llmModels)
      .filter(([key, value]) => 
        value.features && value.features.includes('function_calling')
      )
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    
    console.log('Function calling models:', functionModels);
  }
};
```

### Dynamic Model Selection Based on Task

```javascript
class ModelSelector {
  constructor(ws) {
    this.ws = ws;
  }
  
  selectModelForTask(task) {
    let model;
    
    if (task.requiresReasoning && task.isComplex) {
      model = 'gpt-oss-120b'; // Most capable
    } else if (task.requiresReasoning && task.needsSpeed) {
      model = 'gpt-oss-20b'; // Fast reasoning
    } else if (task.requiresFunctionCalling) {
      model = 'llama-4-scout'; // Specialized function calling
    } else if (task.isMultilingual) {
      model = 'qwen3-32b'; // Multi-language support
    } else {
      model = 'llama-3.3-70b-versatile'; // Default
    }
    
    this.ws.send(JSON.stringify({
      type: 'set_llm_model',
      model: model
    }));
    
    return model;
  }
}

// Usage
const selector = new ModelSelector(ws);

// Complex reasoning task
selector.selectModelForTask({
  requiresReasoning: true,
  isComplex: true,
  needsSpeed: false
});

// Fast function calling
selector.selectModelForTask({
  requiresFunctionCalling: true,
  needsSpeed: true
});
```

## 🎨 Complete Example Application

```javascript
class VoiceAIClient {
  constructor() {
    this.ws = new WebSocket('ws://localhost:3000');
    this.setupHandlers();
  }
  
  setupHandlers() {
    this.ws.onopen = () => {
      console.log('✅ Connected');
      this.loadAvailableModels();
    };
    
    this.ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        this.playAudio(event.data);
      } else {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      }
    };
  }
  
  loadAvailableModels() {
    // Get reasoning models
    this.ws.send(JSON.stringify({
      type: 'get_reasoning_models'
    }));
    
    // Get function calling models
    this.ws.send(JSON.stringify({
      type: 'get_function_calling_models'
    }));
  }
  
  handleMessage(msg) {
    switch(msg.type) {
      case 'reasoning_models':
        console.log('🧠 Reasoning models:', msg.models);
        this.reasoningModels = msg.models;
        break;
        
      case 'function_calling_models':
        console.log('🛠️ Function calling models:', msg.models);
        this.functionModels = msg.models;
        break;
        
      case 'llm_chunk':
        console.log('💬', msg.text);
        break;
        
      case 'llm_model_set':
        console.log('✅ Switched to:', msg.model);
        break;
    }
  }
  
  useReasoningModel(task) {
    // Use GPT OSS 120B for complex reasoning
    this.ws.send(JSON.stringify({
      type: 'set_llm_model',
      model: 'gpt-oss-120b'
    }));
    
    this.ws.send(JSON.stringify({
      type: 'text_input',
      text: task,
      enableTTS: true
    }));
  }
  
  useFunctionCallingModel(task) {
    // Use Llama 4 Scout for function calling
    this.ws.send(JSON.stringify({
      type: 'set_llm_model',
      model: 'llama-4-scout'
    }));
    
    this.ws.send(JSON.stringify({
      type: 'text_input',
      text: task,
      enableTTS: true
    }));
  }
  
  playAudio(audioBlob) {
    // Implement audio playback
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
  }
}

// Usage
const client = new VoiceAIClient();

// Use reasoning model
client.useReasoningModel('Explain the implications of quantum computing on cryptography');

// Use function calling model
client.useFunctionCallingModel('Check my calendar and schedule a meeting');
```

## 🔍 Model Categories Reference

### Category: `general`
- General purpose conversation
- Standard tasks
- Quick responses
- Models: Llama 3.3, Llama 3.1, Mixtral, Gemma

### Category: `reasoning`
- Complex problem solving
- Multi-step logic
- Analysis and planning
- Models: GPT OSS 120B, GPT OSS 20B, Qwen 3 32B

### Category: `function_calling`
- Tool use
- API integration
- Action execution
- Models: Llama 4 Scout, Kimi K2, GPT OSS models

## 📝 Environment Configuration

Update your `.env` to set a default reasoning or function calling model:

```env
# Use GPT OSS 120B as default (most capable)
DEFAULT_LLM_MODEL=gpt-oss-120b

# Or use GPT OSS 20B (faster)
DEFAULT_LLM_MODEL=gpt-oss-20b

# Or use Qwen 3 32B (balanced)
DEFAULT_LLM_MODEL=qwen3-32b

# Or use Llama 4 Scout (function calling focus)
DEFAULT_LLM_MODEL=llama-4-scout
```

## 🎯 Recommendations

### For Research & Analysis
```env
DEFAULT_LLM_MODEL=gpt-oss-120b
```

### For Customer Support with Tools
```env
DEFAULT_LLM_MODEL=gpt-oss-20b
```

### For Smart Home / IoT
```env
DEFAULT_LLM_MODEL=llama-4-scout
```

### For Multilingual Applications
```env
DEFAULT_LLM_MODEL=qwen3-32b
```

## 📊 Summary

You now have access to **12 different models**:
- 6 General purpose models
- 3 Specialized reasoning models
- 5 Function calling capable models

Choose the right model for your use case to optimize for:
- **Speed** (Llama 3.1 8B, GPT OSS 20B)
- **Reasoning** (GPT OSS 120B, Qwen 3 32B)
- **Function Calling** (Llama 4 Scout, Kimi K2)
- **Balance** (Llama 3.3 70B, Qwen 3 32B)

---

**🎉 You now have the most advanced LLM capabilities available!**

Start experimenting with reasoning and function calling models to build powerful AI applications.


