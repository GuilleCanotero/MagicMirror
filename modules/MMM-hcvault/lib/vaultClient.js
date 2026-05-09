// js/vault/vaultClient.js
const VaultAuth = require("./vaultAuth");
const SecretsCache = require("./secretsCache");

class VaultClient {
  constructor(config) {
    this.vaultAddr = config.vaultAddr.replace(/\/$/, "");
    this.auth = new VaultAuth(config);
    this.cache = new SecretsCache(config.cacheTtlMs || 5 * 60 * 1000);
    this._ready = false;
  }

  async init() {
    await this.auth.authenticate();
    this._ready = true;
    console.log("[Vault] Client initialized and authenticated.");
  }

  async getSecret(path) {
    if (!this._ready) throw new Error("VaultClient not initialized. Call init() first.");

    const cached = this.cache.get(path);
    if (cached) return cached;

    // Support both KV v1 and v2
    const url = path.includes("/data/")
      ? `${this.vaultAddr}/v1/${path}`
      : `${this.vaultAddr}/v1/${path}`;

    const res = await fetch(url, {
      headers: { "X-Vault-Token": this.auth.getToken() },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vault secret fetch failed for '${path}': ${err}`);
    }

    const json = await res.json();
    // KV v2 wraps data under json.data.data, KV v1 is json.data
    const secretData = json.data?.data ?? json.data;

    const leaseTtlMs = (json.lease_duration || 300) * 1000;
    this.cache.set(path, secretData, leaseTtlMs);

    return secretData;
  }

  destroy() {
    this.auth.destroy();
  }
}

// Singleton — one client shared across all node_helpers
let instance = null;

function getVaultClient(config) {
  if (!instance) instance = new VaultClient(config);
  return instance;
}

module.exports = { getVaultClient };
