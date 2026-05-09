// js/vault/secretsCache.js
class SecretsCache {
  constructor(defaultTtlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}

module.exports = SecretsCache;
