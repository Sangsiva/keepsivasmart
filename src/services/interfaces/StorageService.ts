export interface StorageService {
  uploadFile(path: string, buffer: Buffer | string, contentType: string): Promise<string>;
  getFileUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}
