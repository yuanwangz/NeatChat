import { SyncClient } from ".";

export interface LocalDbConfig {
  accessCode: string;
}

export function createLocalDbClient(config: LocalDbConfig): SyncClient {
  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: config.accessCode,
  });

  return {
    async get(key: string) {
      try {
        const res = await fetch("/api/localdb/state", {
          method: "GET",
          headers: getHeaders(),
        });
        if (!res.ok) return "";
        return await res.text();
      } catch (e) {
        console.error("[LocalDb] get error", e);
        return "";
      }
    },

    async set(key: string, value: string) {
      try {
        const res = await fetch("/api/localdb/state", {
          method: "POST",
          headers: getHeaders(),
          body: value,
        });
        if (!res.ok) {
          throw new Error("Failed to save state");
        }
      } catch (e) {
        console.error("[LocalDb] set error", e);
        throw e;
      }
    },

    async check() {
      if (!config.accessCode) return false;
      try {
        const res = await fetch("/api/localdb/check", {
          method: "GET",
          headers: getHeaders(),
        });
        return res.ok;
      } catch (e) {
        return false;
      }
    },
  };
}
