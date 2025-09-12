# Pinarkive TypeScript SDK

TypeScript client for the Pinarkive API v2.3.1. Full type safety for IPFS file management with directory DAG uploads, file renaming, and enhanced API key management. Perfect for TypeScript projects requiring compile-time type checking.

## Installation

```bash
npm install @pinarkive/pinarkive-sdk-ts
```

## Quick Start

```typescript
import { PinarkiveClient } from '@pinarkive/pinarkive-sdk-ts';

// Initialize with API key
const client = new PinarkiveClient({ 
  apiKey: 'your-api-key-here' 
});

// Upload a file with full type safety
const file = new File(['Hello World'], 'document.txt');
const result = await client.uploadFile(file);
console.log('File uploaded:', result.data.cid);

// Generate API key with typed options
const token = await client.generateToken('my-app', { 
  expiresInDays: 30 
});
console.log('New API key:', token.data.token);
```

## Type Safety Benefits

The TypeScript SDK provides compile-time type checking for all API operations:

```typescript
// TypeScript will catch errors at compile time
const result = await client.uploadFile('invalid-file'); // ❌ Error: string not assignable to File | Blob

// Proper typing for responses
const uploads = await client.listUploads();
uploads.data.uploads.forEach(upload => {
  console.log(upload.cid); // ✅ TypeScript knows this is a string
  console.log(upload.size); // ✅ TypeScript knows this is a number
});

// Type-safe options
const token = await client.generateToken('my-app', {
  expiresInDays: 30, // ✅ TypeScript validates this is a number
  ipAllowlist: ['192.168.1.1'] // ✅ TypeScript validates this is string[]
});
```

## Authentication

The SDK supports two authentication methods with proper typing:

### API Key Authentication (Recommended)
```typescript
const client = new PinarkiveClient({ 
  apiKey: 'your-api-key-here' 
});
```
**Note:** The SDK automatically sends the API key using the `Authorization: Bearer` header format, not `X-API-Key`.

### JWT Token Authentication
```typescript
const client = new PinarkiveClient({ 
  token: 'your-jwt-token-here' 
});
```

## Basic Usage

### File Upload
```typescript
// Upload single file with type safety
const file = new File(['Hello World'], 'document.txt');
const result: AxiosResponse<UploadResponse> = await client.uploadFile(file);
console.log('CID:', result.data.cid);
console.log('Status:', result.data.status);
```

### Directory Upload
```typescript
// Upload directory from local path
const result = await client.uploadDirectory('/path/to/directory');
console.log('Directory CID:', result.data.cid);
```

### List Uploads with Pagination
```typescript
// List all uploaded files with typed response
const uploads = await client.listUploads(1, 20);
console.log('Uploads:', uploads.data.uploads);
console.log('Total:', uploads.data.pagination.total);

// TypeScript provides autocomplete for upload properties
uploads.data.uploads.forEach(upload => {
  console.log(`File: ${upload.name}, Size: ${upload.size}, CID: ${upload.cid}`);
});
```

## Advanced Features

### Directory DAG Upload
Upload entire directory structures as DAG (Directed Acyclic Graph) with full type safety:

```typescript
// Method 1: Array of typed file objects
const files: FileUpload[] = [
  { path: 'folder1/file1.txt', content: 'Hello World' },
  { path: 'folder1/file2.txt', content: 'Another file' },
  { path: 'folder2/subfolder/file3.txt', content: 'Nested file' }
];

const result = await client.uploadDirectoryDAG(files, { dirName: 'my-project' });
console.log('DAG CID:', result.data.dagCid);
console.log('Files:', result.data.files);

// Method 2: Object with file paths as keys
const filesObj: Record<string, string> = {
  'folder1/file1.txt': 'Hello World',
  'folder1/file2.txt': 'Another file',
  'folder2/subfolder/file3.txt': 'Nested file'
};

const result2 = await client.uploadDirectoryDAG(filesObj);
```

### Directory Cluster Upload
```typescript
const files: FileUpload[] = [
  { path: 'file1.txt', content: 'Content 1' },
  { path: 'file2.txt', content: 'Content 2' }
];

const result = await client.uploadDirectoryCluster(files);
console.log('Cluster CID:', result.data.cid);
```

### Upload File to Existing Directory
```typescript
const file = new File(['New content'], 'new-file.txt');
const result = await client.uploadFileToDirectory(file, 'existing-directory-path');
console.log('File added to directory:', result.data.cid);
```

### File Renaming
```typescript
// Rename an uploaded file with type safety
const result = await client.renameFile('upload-id-here', 'new-file-name.pdf');
console.log('File renamed:', result.data.updated);
console.log('New name:', result.data.newName);
```

### File Removal
```typescript
// Remove a file from storage with type safety
const result = await client.removeFile('QmYourCIDHere');
console.log('File removed:', result.data.success);
```

### Pinning Operations

#### Basic CID Pinning
```typescript
// Pin with filename
const result = await client.pinCid('QmYourCIDHere', 'my-file.pdf');
console.log('CID pinned:', result.data.pinned);

// Pin without filename (backend will use default)
const result2 = await client.pinCid('QmYourCIDHere');
console.log('CID pinned:', result2.data.pinned);
```

#### Pin with Custom Name
```typescript
const result = await client.pinCid('QmYourCIDHere', 'my-important-file');
console.log('CID pinned with name:', result.data.pinned);
console.log('Custom name:', result.data.customName);
```

### API Key Management

#### Generate API Key with Typed Options
```typescript
// Basic token generation
const token = await client.generateToken('my-app');

// Advanced token with typed options
const token = await client.generateToken('my-app', {
  expiresInDays: 30,
  ipAllowlist: ['192.168.1.1', '10.0.0.1'],
  permissions: ['upload', 'pin']
});
console.log('New API key:', token.data.token);
console.log('Expires at:', token.data.expiresAt);
```

#### List API Keys
```typescript
const tokens = await client.listTokens();
console.log('API Keys:', tokens.data.tokens);
```

#### Revoke API Key
```typescript
const result = await client.revokeToken('my-app');
console.log('Token revoked:', result.data.revoked);
```

## Type Definitions

The SDK exports comprehensive type definitions for all operations:

```typescript
import { 
  PinarkiveClient,
  AuthType,
  FileUpload,
  DirectoryDAGOptions,
  TokenGenerateOptions,
  UploadResponse,
  DirectoryDAGResponse,
  TokenResponse,
  PinResponse,
  RenameResponse,
  UploadsResponse
} from '@pinarkive/pinarkive-sdk-typescript';

// Use types in your own code
const auth: AuthType = { apiKey: 'your-key' };
const options: TokenGenerateOptions = { expiresInDays: 30 };
```

## Error Handling with TypeScript

```typescript
try {
  const result = await client.uploadFile(file);
  console.log('Success:', result.data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    // TypeScript knows this is an Axios error
    console.error('API Error:', error.response?.data);
    console.error('Status:', error.response?.status);
  } else {
    console.error('Network Error:', error.message);
  }
}
```

## Browser Usage

```typescript
// In browser environment with full type safety
const client = new PinarkiveClient({ 
  apiKey: 'your-api-key' 
});

// Upload file from file input with proper typing
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const result = await client.uploadFile(file);
  console.log('File uploaded:', result.data.cid);
}
```

## Build Instructions

### For Node.js Projects
```bash
# Install dependencies
npm install @pinarkive/pinarkive-sdk-typescript

# Build the project
npm run build

# Use in your code
import { PinarkiveClient } from '@pinarkive/pinarkive-sdk-ts';
```

### For Browser Projects
```typescript
// The SDK works in both Node.js and browser environments
// For bundlers like webpack, rollup, or vite, import directly:
import { PinarkiveClient } from '@pinarkive/pinarkive-sdk-ts';
```

## API Reference

### Constructor
```typescript
new PinarkiveClient(auth: AuthType, baseURL?: string)
```
- `auth`: Object with either `apiKey` or `token`
- `baseURL`: Optional base URL (defaults to `https://api.pinarkive.com/api/v2`)

### File Operations
- `uploadFile(file: File | Blob): Promise<AxiosResponse<UploadResponse>>` - Upload single file
- `uploadDirectory(dirPath: string): Promise<AxiosResponse<UploadResponse>>` - Upload directory recursively (calls uploadFile for each file)
- `uploadDirectoryDAG(files, options?): Promise<AxiosResponse<DirectoryDAGResponse>>` - Upload directory as DAG structure
- `renameFile(uploadId: string, newName: string): Promise<AxiosResponse<RenameResponse>>` - Rename uploaded file
- `removeFile(cid: string): Promise<AxiosResponse<any>>` - Remove file from storage

### Pinning Operations
- `pinCid(cid: string, filename?: string): Promise<AxiosResponse<PinResponse>>` - Pin CID to account with optional filename

### User Operations
- `listUploads(page?: number, limit?: number): Promise<AxiosResponse<UploadsResponse>>` - List uploaded files

### Token Management
- `generateToken(name: string, options?: TokenGenerateOptions): Promise<AxiosResponse<TokenResponse>>` - Generate API key
- `listTokens(): Promise<AxiosResponse<any>>` - List all API keys
- `revokeToken(name: string): Promise<AxiosResponse<any>>` - Revoke API key


### Status & Monitoring
- `getStatus(cid: string): Promise<AxiosResponse<any>>` - Get file status
- `getAllocations(cid: string): Promise<AxiosResponse<any>>` - Get storage allocations

## Examples

### Complete File Management Workflow
```typescript
import { PinarkiveClient } from '@pinarkive/pinarkive-sdk-ts';

async function manageFiles() {
  const client = new PinarkiveClient({ 
    apiKey: 'your-api-key' 
  });

  try {
    // 1. Upload a file with type safety
    const file = new File(['Hello World'], 'document.txt');
    const upload = await client.uploadFile(file);
    console.log('Uploaded:', upload.data.cid);

    // 2. Pin the CID with a custom name
    await client.pinCid(upload.data.cid, 'important-document');

    // 3. Rename the file
    if (upload.data.uploadId) {
      await client.renameFile(upload.data.uploadId, 'my-document.txt');
    }

    // 4. List all uploads with typed response
    const uploads = await client.listUploads();
    console.log('All uploads:', uploads.data.uploads);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

manageFiles();
```

### Directory Upload Workflow with Type Safety
```typescript
async function uploadProject() {
  const client = new PinarkiveClient({ 
    apiKey: 'your-api-key' 
  });

  // Create project structure with proper typing
  const projectFiles: Record<string, string> = {
    'src/index.ts': 'console.log("Hello World");',
    'src/utils.ts': 'export const utils = {};',
    'package.json': JSON.stringify({ name: 'my-project' }),
    'README.md': '# My Project\n\nThis is my project.'
  };

  try {
    const result = await client.uploadDirectoryDAG(projectFiles, { dirName: 'my-project' });
    console.log('Project uploaded:', result.data.dagCid);
    console.log('Files:', result.data.files);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Upload failed:', error.response?.data);
    }
  }
}

uploadProject();
```

## Integration with Popular Frameworks

### React with TypeScript
```typescript
import React, { useState } from 'react';
import { PinarkiveClient } from '@pinarkive/pinarkive-sdk-ts';

const FileUploader: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const client = new PinarkiveClient({ apiKey: 'your-api-key' });

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await client.uploadFile(file);
      console.log('File uploaded:', result.data.cid);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <input 
      type="file" 
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
      }}
      disabled={uploading}
    />
  );
};
```

### Next.js with TypeScript
```typescript
// pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PinarkiveClient } from '@pinarkive/pinarkive-sdk-ts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = new PinarkiveClient({ apiKey: process.env.PINARKIVE_API_KEY! });

  try {
    const result = await client.uploadFile(req.body.file);
    res.status(200).json(result.data);
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

## Support

For issues or questions:
- GitHub Issues: [https://github.com/pinarkive/pinarkive-sdk-ts/issues](https://github.com/pinarkive/pinarkive-sdk-ts/issues)
- API Documentation: [https://api.pinarkive.com/docs](https://api.pinarkive.com/docs)
- Contact: [https://pinarkive.com/docs.php](https://pinarkive.com/docs.php) 