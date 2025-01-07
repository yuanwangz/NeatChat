import { createWebDavClient } from "./webdav";
import { createUpstashClient } from "./upstash";
import { createLocalDbClient } from "./localdb";
import {
  ProviderType,
  SyncClient,
  WebDavConfig,
  UpstashConfig,
  LocalDbConfig,
} from "./types";

export {
  ProviderType,
  type SyncClient,
  type WebDavConfig,
  type UpstashConfig,
  type LocalDbConfig,
};

export const SyncClients = {
  [ProviderType.UpStash]: createUpstashClient,
  [ProviderType.WebDAV]: createWebDavClient,
  [ProviderType.LocalDb]: createLocalDbClient,
} as const;

export type SyncClientConfig = {
  [ProviderType.WebDAV]: WebDavConfig;
  [ProviderType.UpStash]: UpstashConfig;
  [ProviderType.LocalDb]: LocalDbConfig;
};

export function createSyncClient(
  provider: ProviderType,
  config: WebDavConfig | UpstashConfig | LocalDbConfig,
): SyncClient {
  const client = SyncClients[provider](config as any);
  return {
    get: async (key: string) => (await client.get(key)) || "",
    set: client.set,
    check: client.check,
  };
}
