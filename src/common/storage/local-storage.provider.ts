import { StorageProvider } from './storage-provider.interface';
import { promises as fs } from 'fs';
import * as path from 'path';

export class LocalStorageProvider implements StorageProvider {
  private readonly dataDir: string;

  constructor() {
    this.dataDir = process.env.ALM_DATA_DIR || './data';
  }

  async store(key: string, data: Buffer): Promise<string> {
    const fullPath = path.join(this.dataDir, 'recordings', key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return `file://${fullPath}`;
  }

  async retrieve(uri: string): Promise<Buffer> {
    if (!uri.startsWith('file://')) {
      throw new Error(`Invalid URI: ${uri}`);
    }
    const fullPath = uri.substring(7);
    return fs.readFile(fullPath);
  }

  async delete(uri: string): Promise<void> {
    if (!uri.startsWith('file://')) {
      throw new Error(`Invalid URI: ${uri}`);
    }
    const fullPath = uri.substring(7);
    await fs.unlink(fullPath);
  }
}
