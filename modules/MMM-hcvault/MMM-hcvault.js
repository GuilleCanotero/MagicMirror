"use strict";

Module.register("MMM-hcvault", {
  defaults: {
    vaultAddr: "https://vault.localhost:8200",
    authMethod: "approle",
    roleIdPath: "/etc/magicmirror/vault/role_id",
    secretIdPath: "/etc/magicmirror/vault/secret_id",
    secretPath: "secret/data/magicmirror/test",
    spotifySecretPath: "secret/data/magicmirror/spotify",
    calendarSecretPath: "secret/data/magicmirror/calendar",
    cacheTtlMs: 300000,
    refreshIntervalMs: 60000,
  },

  start: function () {
    Log.info("[MMM-hcvault] Starting...");
    this.vaultData = null;
    this.vaultStatus = "Connecting to Vault...";
    this.loaded = false;
    this.vaultReady = false;
    this.allModulesStarted = false;

    setTimeout(() => {
      this.sendSocketNotification("VAULT_INIT", this.config);
    }, 500);
  },

_tryFetchSecrets: function () {
  if (this.vaultReady && this.allModulesStarted) {
    Log.info("[MMM-hcvault] Both conditions met — fetching secrets from Vault...");
    this.sendSocketNotification("VAULT_GET_SECRET", {
      path: this.config.spotifySecretPath,
      requestId: "spotify-credentials",
    });
    this.sendSocketNotification("VAULT_GET_SECRET", {
      path: this.config.calendarSecretPath,
      requestId: "calendar-credentials",
    });
  }
},

  notificationReceived: function (notification, payload) {
    if (notification === "ALL_MODULES_STARTED") {
      Log.info("[MMM-hcvault] ALL_MODULES_STARTED received. vaultReady=" + this.vaultReady);
      this.allModulesStarted = true;
      this._tryFetchSecrets();
    }
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "VAULT_READY") {
      Log.info("[MMM-hcvault] VAULT_READY. allModulesStarted=" + this.allModulesStarted);
      this.vaultReady = true;
      this.vaultStatus = "Authenticated. Fetching secret...";
      this.updateDom();

      this.sendSocketNotification("VAULT_GET_SECRET", {
        path: this.config.secretPath,
        requestId: "poll",
      });

      this._tryFetchSecrets();
    }

if (notification === "VAULT_SECRET_RESULT") {
  if (payload.requestId === "poll") {
    this.vaultData = payload.data;
    this.vaultStatus = "OK";
    this.loaded = true;
    this.updateDom();
  }
if (payload.requestId === "spotify-credentials") {
    Log.info("[MMM-hcvault] Spotify credentials received from node_helper. Scheduling broadcast...");
    // Store and broadcast on next tick — ensures we're in the browser event loop
    this.spotifyCredentials = payload;
    setTimeout(() => {
      Log.info("[MMM-hcvault] Broadcasting Spotify credentials now. Keys: " + Object.keys(this.spotifyCredentials.data).join(", "));
      this.sendNotification("VAULT_SECRET_RESULT", this.spotifyCredentials);
    }, 0);
  }
  if (payload.requestId === "calendar-credentials") {
    setTimeout(() => {
      Log.info("[MMM-hcvault] Broadcasting calendar credentials...");
      this.sendNotification("VAULT_SECRET_RESULT", payload);
    }, 0);
  }
}

    if (notification === "VAULT_ERROR") {
      this.vaultStatus = "Error: " + payload.error;
      this.updateDom();
    }
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-hcvault";
    if (!this.loaded) {
      const status = document.createElement("div");
      status.className = "dimmed light small";
      status.innerHTML = "🔐 " + this.vaultStatus;
      wrapper.appendChild(status);
      return wrapper;
    }
    const title = document.createElement("div");
    title.className = "bright medium bold";
    title.innerHTML = "🔐 Vault Secrets";
    wrapper.appendChild(title);
    const table = document.createElement("table");
    table.className = "small";
    Object.entries(this.vaultData).forEach(([key, value]) => {
      const row = document.createElement("tr");
      const keyCell = document.createElement("td");
      keyCell.className = "dimmed";
      keyCell.style.paddingRight = "12px";
      keyCell.innerHTML = key;
      const valCell = document.createElement("td");
      valCell.className = "bright";
      valCell.innerHTML = value;
      row.appendChild(keyCell);
      row.appendChild(valCell);
      table.appendChild(row);
    });
    wrapper.appendChild(table);
    return wrapper;
  },

  getStyles: function () {
    return ["MMM-hcvault.css"];
  },
});