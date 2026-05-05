/**
 * In-memory cache for license validation
 * Reduces database queries and improves performance
 */
class LicenseCache {
  constructor() {
    this.cache = new Map();
    this.TTL = 60 * 1000; // 60 seconds

    // Clean expired entries every 30 seconds
    setInterval(() => {
      this.cleanup();
    }, 30 * 1000);
  }

  /**
   * Get a license from cache
   * @param {string} key - The API key (plain text)
   * @returns {object|null} - The cached license or null
   */
  get(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      console.log('[CACHE EXPIRED]', key.substring(0, 20) + '...');
      return null;
    }

    console.log('[CACHE HIT]', key.substring(0, 20) + '...');
    return cached.license;
  }

  /**
   * Set a license in cache
   * @param {string} key - The API key (plain text)
   * @param {object} license - The license data
   */
  set(key, license) {
    this.cache.set(key, {
      license,
      expiresAt: Date.now() + this.TTL
    });
    console.log('[CACHE SET]', key.substring(0, 20) + '...');
  }

  /**
   * Remove a license from cache
   * @param {string} key - The API key
   */
  delete(key) {
    this.cache.delete(key);
    console.log('[CACHE DELETE]', key.substring(0, 20) + '...');
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    console.log('[CACHE CLEARED]');
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log('[CACHE CLEANUP]', `Removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this.cache.size,
      ttl: this.TTL
    };
  }
}

// Singleton instance
const licenseCache = new LicenseCache();

module.exports = licenseCache;
