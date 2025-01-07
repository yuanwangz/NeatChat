export interface WebDavConfig {
  endpoint: string;
  username: string;
  password: string;
}

export interface UpstashConfig {
  endpoint: string;
  username: string;
  apiKey: string;
}

export interface LocalDbConfig {
  accessCode: string;
}

export enum ProviderType {
  WebDAV = "webdav",
  UpStash = "upstash",
  LocalDb = "localdb",
}

export type SyncClient = {
  get: (key: string) => Promise<string>;
  set: (key: string, value: string) => Promise<void>;
  check: () => Promise<boolean>;
};
