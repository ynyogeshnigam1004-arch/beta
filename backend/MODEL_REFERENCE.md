# 🚀 Quick Reference - All Available Models

## 📊 Complete Model List (12 Models)

### 🧠 REASONING MODELS (3)

```javascript
// GPT OSS 120B - Most Capable
ws.send({type: 'set_llm_model', model: 'gpt-oss-120b'});
// 131K context | Advanced reasoning & function calling

// GPT OSS 20B - Fast Reasoning
ws.send({type: 'set_llm_model', model: 'gpt-oss-20b'});
// 131K context | Quick reasoning & function calling

// Qwen 3 32B - Balanced
ws.send({type: 'set_llm_model', model: 'qwen3-32b'});
// 32K context | Excellent reasoning & multilingual
```

### 🛠️ FUNCTION CALLING MODELS (5)

```javascript
// Llama 4 Scout - Specialized
ws.send({type: 'set_llm_model', model: 'llama-4-scout'});
// 128K context | Advanced function calling

// Kimi K2 - Tool Use
ws.send({type: 'set_llm_model', model: 'kimi-k2'});
// 128K context | Specialized tool use

// GPT OSS 120B - Most Capable
ws.send({type: 'set_llm_model', model: 'gpt-oss-120b'});
// Also supports function calling

// GPT OSS 20B - Fast
ws.send({type: 'set_llm_model', model: 'gpt-oss-20b'});
// Also supports function calling

// Qwen 3 32B - Balanced
ws.send({type: 'set_llm_model', model: 'qwen3-32b'});
// Also supports function calling
```

### 🎯 GENERAL PURPOSE MODELS (6)

```javascript
// Llama 3.3 70B - Best Overall ⭐ (DEFAULT)
ws.send({type: 'set_llm_model', model: 'llama-3.3-70b-versatile'});
// 128K context | Latest and best for conversation

// Llama 3.1 70B - Versatile
ws.send({type: 'set_llm_model', model: 'llama-3.1-70b-versatile'});
// 128K context | Reliable and powerful

// Llama 3.1 8B - Ultra Fast ⚡
ws.send({type: 'set_llm_model', model: 'llama-3.1-8b-instant'});
// 128K context | Fastest responses

// Mixtral 8x7B - Complex Reasoning
ws.send({type: 'set_llm_model', model: 'mixtral-8x7b-32768'});
// 32K context | Excellent for reasoning

// Gemma 2 9B - Instruction Tuned
ws.send({type: 'set_llm_model', model: 'gemma2-9b-it'});
// 8K context | Google's model

// Gemma 7B - Compact
ws.send({type: 'set_llm_model', model: 'gemma-7b-it'});
// 8K context | Efficient
```

## 🎮 WebSocket Commands

### Get Models

```javascript
// Get ALL models
ws.send({type: 'get_available_models'});

// Get ONLY reasoning models
ws.send({type: 'get_reasoning_models'});

// Get ONLY function calling models
ws.send({type: 'get_function_calling_models'});

// Get models by category
ws.send({type: 'get_models_by_category', category: 'reasoning'});
ws.send({type: 'get_models_by_category', category: 'function_calling'});
ws.send({type: 'get_models_by_category', category: 'general'});

// Get filtered models
ws.send({type: 'get_available_models', category: 'reasoning'});
```

### Switch Models

```javascript
// Switch to any model
ws.send({type: 'set_llm_model', model: 'gpt-oss-120b'});

// Response
{
  "type": "llm_model_set",
  "model": "gpt-oss-120b",
  "success": true
}
```

## 🎯 Use Case Quick Selection

```javascript
// For Complex Reasoning
ws.send({type: 'set_llm_model', model: 'gpt-oss-120b'});

// For Fast Reasoning
ws.send({type: 'set_llm_model', model: 'gpt-oss-20b'});

// For Function Calling
ws.send({type: 'set_llm_model', model: 'llama-4-scout'});

// For Speed
ws.send({type: 'set_llm_model', model: 'llama-3.1-8b-instant'});

// For Balanced Performance
ws.send({type: 'set_llm_model', model: 'llama-3.3-70b-versatile'});

// For Multilingual
ws.send({type: 'set_llm_model', model: 'qwen3-32b'});
```

## 📊 Quick Comparison

| Model | Speed | Reasoning | Function Calling | Context |
|-------|-------|-----------|------------------|---------|
| GPT OSS 120B | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 131K |
| GPT OSS 20B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 131K |
| Qwen 3 32B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 32K |
| Llama 4 Scout | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 128K |
| Kimi K2 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 128K |
| Llama 3.3 70B | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 128K |
| Llama 3.1 8B | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 128K |

## 💡 One-Line Switcher

```javascript
// Copy-paste ready commands

// Reasoning
ws.send(JSON.stringify({type:'set_llm_model',model:'gpt-oss-120b'}));
ws.send(JSON.stringify({type:'set_llm_model',model:'gpt-oss-20b'}));
ws.send(JSON.stringify({type:'set_llm_model',model:'qwen3-32b'}));

// Function Calling
ws.send(JSON.stringify({type:'set_llm_model',model:'llama-4-scout'}));
ws.send(JSON.stringify({type:'set_llm_model',model:'kimi-k2'}));

// General
ws.send(JSON.stringify({type:'set_llm_model',model:'llama-3.3-70b-versatile'}));
ws.send(JSON.stringify({type:'set_llm_model',model:'llama-3.1-8b-instant'}));
ws.send(JSON.stringify({type:'set_llm_model',model:'mixtral-8x7b-32768'}));
```

## 🎨 Model Selection Helper

```javascript
function selectModel(useCase) {
  const models = {
    'complex_reasoning': 'gpt-oss-120b',
    'fast_reasoning': 'gpt-oss-20b',
    'function_calling': 'llama-4-scout',
    'tool_use': 'kimi-k2',
    'speed': 'llama-3.1-8b-instant',
    'balanced': 'llama-3.3-70b-versatile',
    'multilingual': 'qwen3-32b',
    'default': 'llama-3.3-70b-versatile'
  };
  
  return models[useCase] || models['default'];
}

// Usage
const model = selectModel('complex_reasoning');
ws.send(JSON.stringify({type: 'set_llm_model', model: model}));
```

## 📝 Environment Variables

```env
# Set default model in .env

# For reasoning
DEFAULT_LLM_MODEL=gpt-oss-120b

# For function calling
DEFAULT_LLM_MODEL=llama-4-scout

# For speed
DEFAULT_LLM_MODEL=llama-3.1-8b-instant

# For balance (default)
DEFAULT_LLM_MODEL=llama-3.3-70b-versatile
```

## 🔥 Top Picks

### 🏆 Best Overall
```javascript
ws.send({type:'set_llm_model',model:'llama-3.3-70b-versatile'});
```

### 🧠 Best Reasoning
```javascript
ws.send({type:'set_llm_model',model:'gpt-oss-120b'});
```

### 🛠️ Best Function Calling
```javascript
ws.send({type:'set_llm_model',model:'llama-4-scout'});
```

### ⚡ Fastest
```javascript
ws.send({type:'set_llm_model',model:'llama-3.1-8b-instant'});
```

### 🌍 Best Multilingual
```javascript
ws.send({type:'set_llm_model',model:'qwen3-32b'});
```

---

**Print this as your quick reference!** 📋

For detailed docs, see: `REASONING_MODELS_GUIDE.md`


