import { getClientConfig } from "../config/client";
import {
  ApiPath,
  STORAGE_KEY,
  StoreKey,
  ACCESS_CODE_PREFIX,
} from "../constant";
import { createPersistStore } from "../utils/store";
import {
  AppState,
  getLocalAppState,
  GetStoreState,
  mergeAppState,
  setLocalAppState,
} from "../utils/sync";
import { downloadAs, readFromFile } from "../utils";
import { showToast } from "../components/ui-lib";
import Locale from "../locales";
import {
  createSyncClient,
  ProviderType,
  type WebDavConfig,
  type UpstashConfig,
  type LocalDbConfig,
} from "../utils/cloud";
import { useAccessStore } from "./access";
import { getHeaders } from "../client/api";

export type { WebDavConfig, UpstashConfig, LocalDbConfig };

interface SyncState {
  provider: ProviderType;
  useProxy: boolean;
  proxyUrl: string;
  webdav: WebDavConfig;
  upstash: UpstashConfig;
  localdb: LocalDbConfig;
  lastSyncTime: number;
  lastProvider: string;
}

const isApp = !!getClientConfig()?.isApp;
export type SyncStore = GetStoreState<typeof useSyncStore>;

const DEFAULT_SYNC_STATE: SyncState = {
  provider: ProviderType.WebDAV,
  useProxy: true,
  proxyUrl: ApiPath.Cors as string,

  webdav: {
    endpoint: "",
    username: "",
    password: "",
  },

  upstash: {
    endpoint: "",
    username: STORAGE_KEY,
    apiKey: "",
  },

  localdb: {
    accessCode: "",
  },

  lastSyncTime: 0,
  lastProvider: "",
};

export const useSyncStore = createPersistStore(
  DEFAULT_SYNC_STATE,
  (set, get) => ({
    cloudSync() {
      const provider = get().provider;
      if (provider === ProviderType.LocalDb) return false;

      const state = get() as SyncState;
      const config =
        provider === ProviderType.WebDAV ? state.webdav : state.upstash;
      return Object.values(config).every((c) => c.toString().length > 0);
    },

    async shouldUseLocalDbSync() {
      const accessStore = useAccessStore.getState();
      if (!accessStore.accessCode?.trim()) return false;

      // 通过API验证访问码
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            ...getHeaders(),
            Authorization: `${ACCESS_CODE_PREFIX}${accessStore.accessCode}`,
          },
        });

        if (!response.ok) return false;
        const result = await response.json();
        const isValidAccessCode = !result.error && !accessStore.openaiApiKey;

        const noCloudSync = !this.cloudSync();
        return isValidAccessCode && noCloudSync;
      } catch (e) {
        console.error("[LocalDb Sync] failed to verify access code", e);
        return false;
      }
    },

    markSyncTime(isLocalDb: boolean) {
      const provider = isLocalDb ? "LocalDb" : get().provider;
      set({ lastSyncTime: Date.now(), lastProvider: provider });
    },

    export() {
      const state = getLocalAppState();
      const datePart = isApp
        ? `${new Date().toLocaleDateString().replace(/\//g, "_")} ${new Date()
            .toLocaleTimeString()
            .replace(/:/g, "_")}`
        : new Date().toLocaleString();

      const fileName = `Backup-${datePart}.json`;
      downloadAs(JSON.stringify(state), fileName);
    },

    async import() {
      const rawContent = await readFromFile();

      try {
        const remoteState = JSON.parse(rawContent) as AppState;
        const localState = getLocalAppState();
        mergeAppState(localState, remoteState);
        setLocalAppState(localState);
        location.reload();
      } catch (e) {
        console.error("[Import]", e);
        showToast(Locale.Settings.Sync.ImportFailed);
      }
    },

    async check() {
      const isLocalDb = await this.shouldUseLocalDbSync();
      if (isLocalDb) {
        const client = createSyncClient(ProviderType.LocalDb, {
          accessCode: useAccessStore.getState().accessCode,
        });
        return await client.check();
      }

      const provider = get().provider;
      const state = get() as SyncState;
      const config =
        provider === ProviderType.WebDAV ? state.webdav : state.upstash;
      const client = createSyncClient(provider, config);
      return await client.check();
    },

    async sync() {
      const localState = getLocalAppState();
      const isLocalDb = await this.shouldUseLocalDbSync();

      if (isLocalDb) {
        try {
          const client = createSyncClient(ProviderType.LocalDb, {
            accessCode: useAccessStore.getState().accessCode,
          });
          const remoteState = await client.get("state");

          if (remoteState && remoteState !== "") {
            const parsedRemoteState = JSON.parse(remoteState) as AppState;
            mergeAppState(localState, parsedRemoteState);
            setLocalAppState(localState);
          }

          await client.set("state", JSON.stringify(localState));
          this.markSyncTime(true);
          return;
        } catch (e) {
          console.error("[LocalDb Sync] failed", e);
          throw e;
        }
      }

      // 云同步
      const provider = get().provider;
      const state = get() as SyncState;
      const config =
        provider === ProviderType.WebDAV ? state.webdav : state.upstash;
      const client = createSyncClient(provider, config);

      try {
        const remoteState = await client.get(config.username);

        if (!remoteState || remoteState === "") {
          await client.set(config.username, JSON.stringify(localState));
          console.log(
            "[Sync] Remote state is empty, using local state instead.",
          );
          this.markSyncTime(false);
          return;
        }

        const parsedRemoteState = JSON.parse(remoteState) as AppState;
        mergeAppState(localState, parsedRemoteState);
        setLocalAppState(localState);
        await client.set(config.username, JSON.stringify(localState));
      } catch (e) {
        console.log("[Sync] failed to get remote state", e);
        throw e;
      }

      this.markSyncTime(false);
    },
  }),
  {
    name: StoreKey.Sync,
    version: 1.2,
    migrate(persistedState, version) {
      const newState = persistedState as typeof DEFAULT_SYNC_STATE;

      if (version < 1.1) {
        newState.upstash.username = STORAGE_KEY;
      }

      if (version < 1.2) {
        if (
          (persistedState as typeof DEFAULT_SYNC_STATE).proxyUrl ===
          "/api/cors/"
        ) {
          newState.proxyUrl = "";
        }
      }

      return newState as any;
    },
  },
);
