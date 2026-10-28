// cacheService.js - In-memory cache for user data
export class CacheService {
  static cache = new Map();
  static CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  
  /**
   * Get cached user data (session, profile, crisis/blocked status)
   */
  static getUserData(userId, sessionId) {
    const key = `${userId}:${sessionId}`;
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      console.log(`🗑️ Cache expired for user ${userId}, session ${sessionId}`);
      return null;
    }
    
    console.log(`📦 Cache hit for user ${userId}, session ${sessionId}`);
    return cached.data;
  }
  
  /**
   * Set cached user data
   */
  static setUserData(userId, sessionId, data) {
    const key = `${userId}:${sessionId}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Cached data for user ${userId}, session ${sessionId}`);
  }
  
  /**
   * Update only session context in cache (most frequent update)
   */
static updateSessionContext(userId, sessionId, newContext) {
  const key = `${userId}:${sessionId}`;
  const cached = this.cache.get(key);
  
  if (cached && cached.data) {
    // If sessionMemory is null, create the structure
    if (!cached.data.sessionMemory) {
      cached.data.sessionMemory = {
        session_id: sessionId,
        user_id: userId,
        chat_context: []
      };
    }
    
    // Now update the context
    cached.data.sessionMemory.chat_context = newContext;
    cached.timestamp = Date.now();
    console.log(`🔄 Updated session context cache for user ${userId}`);
    return true;
  }
  return false;
}
  
  /**
   * Invalidate cache when user profile is updated
   */
  static invalidateUserProfile(userId) {
    const keysToDelete = [];
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for user ${userId} profile update`);
  }
  static invalidateSessionContext(userId) {
  const keysToDelete = [];
  for (const [key] of this.cache.entries()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => this.cache.delete(key));
  // Deletes ALL sessions for the user
  return keysToDelete.length;
}

  
  /**
   * Invalidate cache when crisis/blocked status changes
   */
  static invalidateCrisisStatus(userId) {
    const keysToDelete = [];
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🚨 Invalidated ${keysToDelete.length} cache entries for user ${userId} crisis status change`);
  }
  
  /**
   * Clean up expired cache entries (call periodically)
   */
  static cleanupExpired() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
    
    return keysToDelete.length;
  }
  
  /**
   * Get cache statistics
   */
  static getStats() {
    return {
      totalEntries: this.cache.size,
      memoryUsage: process.memoryUsage().heapUsed,
      cacheAge: Date.now()
    };
  }
}
