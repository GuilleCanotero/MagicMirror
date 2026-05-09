"use strict";

const NodeHelper = require("node_helper");
const VaultAuth = require("./lib/vaultAuth");
const SecretsCache = require("./lib/secretsCache");

module.exports = NodeHelper.create({

  start: function () {
    this.vaultAddr = null;
    this.auth = null;
    this.cache = null;
    this.ready = false;
    console.log("[MMM-hcvault] node_helper started.");
  },

socketNotificationReceived: function (notification, payload) {
  console.log("[MMM-hcvault] node_helper received: " + notification + " payload=" + JSON.stringify(payload));
  if (notification === "VAULT_INIT") {
    this._init(payload).catch((err) => {
      console.error("[MMM-hcvault] Init error:", err.message);
      this.sendSocketNotification("VAULT_ERROR", { error: err.message });
    });
  }

  if (notification === "VAULT_GET_SECRET") {
    this._getSecret(payload)
      .then(() => {
        // Socket is now confirmed open — start polling if not already running
        if (!this._pollTimer) {
          this._pollTimer = setInterval(() => {
            this._fetchAndBroadcast().catch((err) => {
              console.error("[MMM-hcvault] Poll error:", err.message);
              this.sendSocketNotification("VAULT_ERROR", { error: err.message });
            });
          }, this.refreshIntervalMs);
          console.log(`[MMM-hcvault] Polling started every ${this.refreshIntervalMs / 1000}s`);
        }
      })
      .catch((err) => {
        console.error("[MMM-hcvault] GetSecret error:", err.message);
        this.sendSocketNotification("VAULT_ERROR", {
          requestId: payload.requestId,
          error: err.message,
        });
      });
  }
},

  _init: async function (config) {
    this.vaultAddr = config.vaultAddr.replace(/\/$/, "");
    this.refreshIntervalMs = config.refreshIntervalMs || 60000;
    this.secretPath = config.secretPath;
    this.cache = new SecretsCache(config.cacheTtlMs || 300000);
    this.auth = new VaultAuth({
      vaultAddr: this.vaultAddr,
      authMethod: config.authMethod,
      roleIdPath: config.roleIdPath,
      secretIdPath: config.secretIdPath,
    });

    await this.auth.authenticate();
    this.ready = true;
    console.log("[MMM-hcvault] Authenticated to Vault successfully.");
    this.sendSocketNotification("VAULT_READY", {});
    // Do NOT start polling here — wait for frontend to make first contact
  },

  _getSecret: async function (payload) {
  const { path, requestId } = payload;
  console.log("[MMM-hcvault] _getSecret called. path=" + path + " requestId=" + requestId);

  if (!this.ready) {
    this.sendSocketNotification("VAULT_ERROR", {
      requestId,
      error: "Vault not ready yet.",
    });
    return;
  }

  const cached = this.cache.get(path);
  if (cached) {
    console.log("[MMM-hcvault] Returning cached secret for:", path);
    this.sendSocketNotification("VAULT_SECRET_RESULT", { requestId, data: cached });
    return;
  }

  // Fetch directly — do NOT call _fetchAndBroadcast() which hardcodes requestId="poll"
  const valid = await this.auth.isTokenValid();
  if (!valid) {
    await this.auth.authenticate();
  }

  const res = await fetch(`${this.vaultAddr}/v1/${path}`, {
    headers: { "X-Vault-Token": this.auth.getToken() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  const secretData = json.data?.data ?? json.data;
  const ttlMs = (json.lease_duration || 300) * 1000;

  this.cache.set(path, secretData, ttlMs);
  console.log("[MMM-hcvault] Sending VAULT_SECRET_RESULT for requestId=" + requestId + " data keys=" + Object.keys(secretData).join(", "));
  this.sendSocketNotification("VAULT_SECRET_RESULT", { requestId, data: secretData });
},

_fetchAndBroadcast: async function () {
  const valid = await this.auth.isTokenValid();
  if (!valid) {
    console.warn("[MMM-hcvault] Token invalid. Re-authenticating...");
    await this.auth.authenticate();
  }

  this.cache.invalidate(this.secretPath);

  const res = await fetch(`${this.vaultAddr}/v1/${this.secretPath}`, {
    headers: { "X-Vault-Token": this.auth.getToken() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  const secretData = json.data?.data ?? json.data;
  const ttlMs = (json.lease_duration || 300) * 1000;

  this.cache.set(this.secretPath, secretData, ttlMs);
  console.log("[MMM-hcvault] Secret fetched and cached.");

  // Always push to frontend with requestId "poll" so frontend recognizes it
  this.sendSocketNotification("VAULT_SECRET_RESULT", {
    requestId: "poll",
    data: secretData,
  });
},

stop: function () {
  if (this._pollTimer) clearInterval(this._pollTimer);
  if (this.auth) this.auth.destroy();
  console.log("[MMM-hcvault] Stopped.");
},
});