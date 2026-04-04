/**
 * Credits Service
 * Handles credit deduction and usage tracking for multi-tenant system
 */

const User = require('../models/UserEnhanced');

class CreditsService {
  
  // Credit costs (adjust these based on your pricing model)
  static COSTS = {
    stt: {
      perMinute: 10,  // 10 credits per minute of speech-to-text
      perSecond: 0.17 // ~10/60
    },
    llm: {
      perToken: 0.01, // 0.01 credits per token
      per1kTokens: 10 // 10 credits per 1000 tokens
    },
    tts: {
      perCharacter: 0.05, // 0.05 credits per character
      per1kChars: 50      // 50 credits per 1000 characters
    }
  };
  
  /**
   * Check if user has sufficient credits
   */
  static async checkCredits(userId, requiredCredits) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Admin has infinite credits
    if (user.role === 'admin' || user.email === 'ynyogeshnigam1008@gmail.com') {
      return {
        hasCredits: true,
        currentCredits: 999999999, // Show as infinite
        requiredCredits: requiredCredits,
        isAdmin: true
      };
    }
    
    return {
      hasCredits: user.credits >= requiredCredits,
      currentCredits: user.credits,
      requiredCredits: requiredCredits,
      isAdmin: false
    };
  }
  
  /**
   * Deduct credits from user account
   */
  static async deductCredits(userId, type, amount, metadata = {}) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Admin has infinite credits - no deduction needed
      if (user.role === 'admin' || user.email === 'ynyogeshnigam1008@gmail.com') {
        console.log(`👑 Admin infinite credits - no deduction for ${amount} credits (${type})`);
        return {
          success: true,
          deducted: 0, // No actual deduction
          remaining: 999999999, // Show as infinite
          type: type,
          isAdmin: true
        };
      }
      
      if (user.credits < amount) {
        throw new Error(`Insufficient credits. Required: ${amount}, Available: ${user.credits}`);
      }
      
      // Deduct credits for regular users
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { credits: -amount } },
        { new: true }
      );
      
      // Log usage
      console.log(`💳 Credits deducted: ${amount} (${type}) for user ${userId}`);
      console.log(`   Remaining credits: ${updatedUser.credits}`);
      console.log(`   Metadata:`, metadata);
      
      return {
        success: true,
        deducted: amount,
        remaining: updatedUser.credits,
        type: type,
        isAdmin: false
      };
      
    } catch (error) {
      console.error('❌ Error deducting credits:', error);
      throw error;
    }
  }
  
  /**
   * Calculate STT credits based on duration
   */
  static calculateSTTCredits(durationSeconds) {
    return Math.ceil(durationSeconds * this.COSTS.stt.perSecond);
  }
  
  /**
   * Calculate LLM credits based on tokens
   */
  static calculateLLMCredits(tokenCount) {
    return Math.ceil(tokenCount * this.COSTS.llm.perToken);
  }
  
  /**
   * Calculate TTS credits based on character count
   */
  static calculateTTSCredits(characterCount) {
    return Math.ceil(characterCount * this.COSTS.tts.perCharacter);
  }
  
  /**
   * Deduct STT credits
   */
  static async deductSTTCredits(userId, durationSeconds, metadata = {}) {
    const credits = this.calculateSTTCredits(durationSeconds);
    return await this.deductCredits(userId, 'stt', credits, {
      ...metadata,
      durationSeconds,
      creditsPerSecond: this.COSTS.stt.perSecond
    });
  }
  
  /**
   * Deduct LLM credits
   */
  static async deductLLMCredits(userId, tokenCount, metadata = {}) {
    const credits = this.calculateLLMCredits(tokenCount);
    return await this.deductCredits(userId, 'llm', credits, {
      ...metadata,
      tokenCount,
      creditsPerToken: this.COSTS.llm.perToken
    });
  }
  
  /**
   * Deduct TTS credits
   */
  static async deductTTSCredits(userId, characterCount, metadata = {}) {
    const credits = this.calculateTTSCredits(characterCount);
    return await this.deductCredits(userId, 'tts', credits, {
      ...metadata,
      characterCount,
      creditsPerCharacter: this.COSTS.tts.perCharacter
    });
  }
  
  /**
   * Add credits to user account (for purchases, bonuses, etc.)
   */
  static async addCredits(userId, amount, reason = 'manual') {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { credits: amount } },
        { new: true }
      );
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      console.log(`💰 Credits added: ${amount} (${reason}) for user ${userId}`);
      console.log(`   New balance: ${updatedUser.credits}`);
      
      return {
        success: true,
        added: amount,
        newBalance: updatedUser.credits,
        reason: reason
      };
      
    } catch (error) {
      console.error('❌ Error adding credits:', error);
      throw error;
    }
  }
  
  /**
   * Get user's current credit balance
   */
  static async getBalance(userId) {
    const user = await User.findById(userId, 'credits');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.credits;
  }
  
  /**
   * Pre-check credits before starting expensive operations
   */
  static async preCheckCredits(userId, estimatedCost) {
    const balance = await this.getBalance(userId);
    
    if (balance < estimatedCost) {
      throw new Error(`Insufficient credits for this operation. Required: ${estimatedCost}, Available: ${balance}`);
    }
    
    return true;
  }
}

module.exports = CreditsService;