const mongoose = require('mongoose');

const LLMModelSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  contextWindow: {
    type: Number,
    default: 128000
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'llm'
  },
  latency: {
    type: Number,
    default: 150
  },
  speed: {
    type: Number,
    required: true // Tokens per second
  },
  pricing: {
    input: {
      type: Number,
      required: true // Price per million input tokens
    },
    output: {
      type: Number,
      required: true // Price per million output tokens
    }
  },
  ownedBy: {
    type: String,
    default: 'Groq'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static methods
LLMModelSchema.statics.saveModels = async function(models) {
  try {
    console.log('🔄 Saving LLM models to MongoDB...');
    
    // Use individual upsert operations instead of bulkWrite
    const savePromises = Object.entries(models).map(async ([modelId, modelData]) => {
      return await this.updateOne(
        { modelId: modelId },
        {
          $set: {
            ...modelData,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );
    });

    const results = await Promise.all(savePromises);
    const totalSaved = results.reduce((sum, result) => sum + (result.upsertedCount || 0) + (result.modifiedCount || 0), 0);
    
    console.log(`✅ Saved ${totalSaved} LLM models to MongoDB`);
    return { upsertedCount: totalSaved };
  } catch (error) {
    console.error('❌ Error saving LLM models to MongoDB:', error);
    throw error;
  }
};

LLMModelSchema.statics.getActiveModels = async function() {
  try {
    const models = await this.find({ isActive: true }).sort({ name: 1 });
    console.log(`✅ Retrieved ${models.length} active LLM models from MongoDB`);
    return models;
  } catch (error) {
    console.error('❌ Error retrieving LLM models from MongoDB:', error);
    throw error;
  }
};

LLMModelSchema.statics.updateModelPricing = async function(modelId, pricing) {
  try {
    const result = await this.updateOne(
      { modelId: modelId },
      { 
        $set: { 
          pricing: pricing,
          lastUpdated: new Date()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Updated pricing for model ${modelId}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error updating model pricing:', error);
    throw error;
  }
};

module.exports = mongoose.model('LLMModel', LLMModelSchema);
