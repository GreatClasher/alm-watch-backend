export interface StorageProvider {
  store(key: string, data: Buffer): Promise<string>;
  retrieve(uri: string): Promise<Buffer>;
  delete(uri: string): Promise<void>;
}
