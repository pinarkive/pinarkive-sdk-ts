import axios, { AxiosInstance, AxiosRequestConfig, AxiosHeaders, AxiosResponse } from 'axios';

// Type definitions
export type AuthType = { token?: string; apiKey?: string };

export interface FileUpload {
  path: string;
  content: File | Blob | string;
}

export interface DirectoryDAGOptions {
  dirName?: string;
}

export interface TokenGenerateOptions {
  permissions?: string[];
  expiresInDays?: number;
  ipAllowlist?: string[];
}

export interface UploadResponse {
  cid: string;
  status: string;
  uploadId?: string;
}

export interface DirectoryDAGResponse {
  dagCid: string;
  files: Array<{
    path: string;
    cid: string;
  }>;
}

export interface TokenResponse {
  token: string;
  name: string;
  expiresAt?: string;
}

export interface PinResponse {
  pinned: boolean;
  customName?: string;
}

export interface RenameResponse {
  updated: boolean;
  newName: string;
}

export interface UploadsResponse {
  uploads: Array<{
    cid: string;
    name: string;
    size: number;
    uploadedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export class PinarkiveClient {
  private axios: AxiosInstance;
  private auth: AuthType;

  constructor(auth: AuthType, baseURL = 'https://api.pinarkive.com/api/v2') {
    this.auth = auth;
    this.axios = axios.create({ baseURL });
    this.axios.interceptors.request.use((config) => {
      const headers = new AxiosHeaders(config.headers);
      if (this.auth.token) {
        headers.set('Authorization', `Bearer ${this.auth.token}`);
      } else if (this.auth.apiKey) {
        headers.set('Authorization', `Bearer ${this.auth.apiKey}`);
      }
      config.headers = headers;
      return config;
    });
  }


  // --- File Management ---
  async uploadFile(file: File | Blob): Promise<AxiosResponse<UploadResponse>> {
    const form = new FormData();
    form.append('file', file);
    return this.axios.post('/files', form);
  }
  
  async uploadDirectory(dirPath: string): Promise<AxiosResponse<UploadResponse>> {
    return this.axios.post('/files/directory', { dirPath });
  }
  
  // New: Directory DAG upload with type safety
  async uploadDirectoryDAG(
    files: FileUpload[] | Record<string, File | Blob | string>, 
    options: DirectoryDAGOptions = {}
  ): Promise<AxiosResponse<DirectoryDAGResponse>> {
    const form = new FormData();
    
    if (options.dirName) {
      form.append('dirName', options.dirName);
    }
    
    if (Array.isArray(files)) {
      files.forEach((file, index) => {
        form.append(`files[${index}][path]`, file.path);
        form.append(`files[${index}][content]`, file.content);
      });
    } else {
      // Handle object with file paths as keys
      Object.keys(files).forEach((path, index) => {
        form.append(`files[${index}][path]`, path);
        form.append(`files[${index}][content]`, files[path]);
      });
    }
    
    return this.axios.post('/files/directory-dag', form);
  }
  
  // New: Rename file
  async renameFile(uploadId: string, newName: string): Promise<AxiosResponse<RenameResponse>> {
    return this.axios.put(`/files/rename/${uploadId}`, { newName });
  }
  
  async pinCid(cid: string, filename?: string): Promise<AxiosResponse<PinResponse>> {
    const payload: { filename?: string } = {};
    if (filename) {
      payload.filename = filename;
    }
    return this.axios.post(`/files/pin/${cid}`, payload);
  }
  
  
  async removeFile(cid: string): Promise<AxiosResponse<any>> {
    return this.axios.delete(`/files/remove/${cid}`);
  }

  async listUploads(page = 1, limit = 10): Promise<AxiosResponse<UploadsResponse>> {
    return this.axios.get('/users/me/uploads', { params: { page, limit } });
  }

  // --- Token Management ---
  async generateToken(name: string, options: TokenGenerateOptions = {}): Promise<AxiosResponse<TokenResponse>> {
    const payload: any = { name };
    
    if (options.permissions) {
      payload.permissions = options.permissions;
    }
    if (options.expiresInDays) {
      payload.expiresInDays = options.expiresInDays;
    }
    if (options.ipAllowlist) {
      payload.ipAllowlist = options.ipAllowlist;
    }
    
    return this.axios.post('/tokens/generate', payload);
  }
  
  async listTokens(): Promise<AxiosResponse<any>> {
    return this.axios.get('/tokens/list');
  }
  
  async revokeToken(name: string): Promise<AxiosResponse<any>> {
    return this.axios.delete(`/tokens/revoke/${name}`);
  }

  // --- Status and Monitoring ---
  async getStatus(cid: string): Promise<AxiosResponse<any>> {
    return this.axios.get(`/status/${cid}`);
  }
  
  async getAllocations(cid: string): Promise<AxiosResponse<any>> {
    return this.axios.get(`/status/allocations/${cid}`);
  }
}