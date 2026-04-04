// Cache utility functions for persistent storage
export const CACHE_DURATION = {
  MODELS: 24 * 60 * 60 * 1000, // 24 hours
  VOICES: 24 * 60 * 60 * 1000, // 24 hours
  PRICING: 60 * 60 * 1000, // 1 hour
  ASSISTANTS: 5 * 60 * 1000, // 5 minutes
}

export const isCacheValid = (cacheKey, duration = CACHE_DURATION.MODELS) => {
  try {
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`)
    if (!timestamp) return false
    
    const cacheTime = parseInt(timestamp)
    const now = Date.now()
    const isValid = (now - cacheTime) < duration
    
    console.log(`📅 Cache ${cacheKey} validity:`, isValid ? '✅ Valid' : '❌ Expired')
    return isValid
  } catch (error) {
    console.error('❌ Error checking cache validity:', error)
    return false
  }
}

export const getCachedData = (cacheKey) => {
  try {
    const cached = localStorage.getItem(cacheKey)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('❌ Error getting cached data:', error)
    return null
  }
}

export const setCachedData = (cacheKey, data) => {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString())
    console.log(`💾 Cached ${cacheKey}:`, Array.isArray(data) ? data.length : 'object')
  } catch (error) {
    console.error('❌ Error setting cached data:', error)
  }
}

export const clearExpiredCache = () => {
  try {
    const cacheKeys = [
      'cached_models',
      'cached_transcribers', 
      'cached_voice_models',
      'cached_voices',
      'cached_pricing',
      'cached_assistants'
    ]
    
    cacheKeys.forEach(key => {
      if (!isCacheValid(key, CACHE_DURATION.MODELS)) {
        localStorage.removeItem(key)
        localStorage.removeItem(`${key}_timestamp`)
        console.log(`🗑️ Cleared expired cache: ${key}`)
      }
    })
  } catch (error) {
    console.error('❌ Error clearing expired cache:', error)
  }
}

export const getCacheStats = () => {
  try {
    const stats = {}
    const cacheKeys = [
      'cached_models',
      'cached_transcribers', 
      'cached_voice_models',
      'cached_voices',
      'cached_pricing',
      'cached_assistants'
    ]
    
    cacheKeys.forEach(key => {
      const data = getCachedData(key)
      const timestamp = localStorage.getItem(`${key}_timestamp`)
      const isValid = isCacheValid(key)
      
      stats[key] = {
        exists: !!data,
        valid: isValid,
        timestamp: timestamp ? new Date(parseInt(timestamp)).toLocaleString() : null,
        size: data ? (Array.isArray(data) ? data.length : 'object') : 0
      }
    })
    
    return stats
  } catch (error) {
    console.error('❌ Error getting cache stats:', error)
    return {}
  }
}
