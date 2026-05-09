"use strict";

const fs = require("fs");

class VaultAuth {
  constructor(config) {
    this.vaultAddr = config.vaultAddr;
    this.authMethod = config.authMethod || "approle";
    this.config = config;
    this.token = null;
    this._renewTimer = null;
    this._maxRetries = 5;
    this._retryDelayMs = 5000;
  }

  async authenticate() {
    switch (this.authMethod) {
      case "approle":
        return this._authenticateAppRole();
      case "token":
        this.token = this.config.token;
        return this.token;
      default:
        throw new Error(`Unsupported auth method: ${this.authMethod}`);
    }
  }

  async _authenticateAppRole() {
    const roleId = fs.readFileSync(this.config.roleIdPath, "utf8").trim();
    const secretId = fs.readFileSync(this.config.secretIdPath, "utf8").trim();

    const res = await fetch(`${this.vaultAddr}/v1/auth/approle/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AppRole login failed: ${err}`);
    }

    const data = await res.json();
    this.token = data.auth.client_token;
    const ttlMs = data.auth.lease_duration * 1000;
    const renewable = data.auth.renewable;

    // debug to show vault token in logs
    console.log(">>>>>>>>>>>>>><<<<< "  + JSON.stringify(this.token, null, 4))

    const outputFilePath = '/etc/magicmirror/vault/v_token';
    fs.writeFileSync(outputFilePath, this.token, 'utf-8');

    console.log(`[VaultAuth] Authenticated. TTL: ${data.auth.lease_duration}s, renewable: ${renewable}`);

    if (renewable) {
      this._scheduleRenewal(ttlMs);
    } else {
      // Token can't be renewed — re-authenticate before it expires
      this._scheduleReauth(ttlMs);
    }

    return this.token;
  }

  async _renewToken() {
    console.log("[VaultAuth] Attempting token renewal...");
    try {
      const res = await fetch(`${this.vaultAddr}/v1/auth/token/renew-self`, {
        method: "POST",
        headers: { "X-Vault-Token": this.token },
      });

      if (!res.ok) {
        // Renewal rejected — most likely max_ttl reached.
        // Discard the old token and do a full fresh AppRole login.
        console.warn("[VaultAuth] Renewal rejected. Max TTL likely reached. Re-authenticating...");
        this.token = null;
        await this._reauthWithRetry();
        return;
      }

      const data = await res.json();
      const ttlMs = data.auth.lease_duration * 1000;
      console.log(`[VaultAuth] Token renewed. New TTL: ${data.auth.lease_duration}s`);
      this._scheduleRenewal(ttlMs);

    } catch (err) {
      console.error("[VaultAuth] Renewal request failed:", err.message);
      this.token = null;
      await this._reauthWithRetry();
    }
  }


async _reauthWithRetry() {
  for (let attempt = 1; attempt <= this._maxRetries; attempt++) {
    try {
      console.log(`[VaultAuth] Fresh AppRole login, attempt ${attempt}/${this._maxRetries}...`);
      // authenticate() does a full AppRole login — new token, new TTL lifecycle
      await this._authenticateAppRole();
      console.log("[VaultAuth] New token obtained successfully.");
      return;
    } catch (err) {
      console.error(`[VaultAuth] Login attempt ${attempt} failed:`, err.message);
      if (attempt < this._maxRetries) {
        const delay = this._retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`[VaultAuth] Retrying in ${delay / 1000}s...`);
        await this._sleep(delay);
      }
    }
  }
  console.error("[VaultAuth] All re-auth attempts failed. No valid token.");
}

  // Validate the current token against Vault — used before each secret fetch
  async isTokenValid() {
    if (!this.token) return false;
    try {
      const res = await fetch(`${this.vaultAddr}/v1/auth/token/lookup-self`, {
        headers: { "X-Vault-Token": this.token },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Schedule renewal at 2/3 of TTL
  _scheduleRenewal(ttlMs) {
    if (this._renewTimer) clearTimeout(this._renewTimer);
    const renewIn = Math.floor(ttlMs * (2 / 3));
    console.log(`[VaultAuth] Scheduling renewal in ${renewIn / 1000}s`);
    this._renewTimer = setTimeout(() => this._renewToken(), renewIn);
  }

  // For non-renewable tokens: re-authenticate at 2/3 of TTL
  _scheduleReauth(ttlMs) {
    if (this._renewTimer) clearTimeout(this._renewTimer);
    const reauthIn = Math.floor(ttlMs * (2 / 3));
    console.log(`[VaultAuth] Token not renewable. Scheduling re-auth in ${reauthIn / 1000}s`);
    this._renewTimer = setTimeout(() => this._reauthWithRetry(), reauthIn);
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getToken() {
    if (!this.token) throw new Error("Not authenticated. Call authenticate() first.");
    return this.token;
  }

  destroy() {
    if (this._renewTimer) clearTimeout(this._renewTimer);
    this.token = null;
  }
}

module.exports = VaultAuth;