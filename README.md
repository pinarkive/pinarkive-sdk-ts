# Pinarkive TypeScript SDK (API v3)

TypeScript client for the **Pinarkive API v3**. Uses native `fetch`; Bearer auth; **clusterId** (`cl`) and **timelock** (premium) support; **onUnauthorized** callback for 401/403.

> **Version policy (as of Mar 2026):** Only **v3.x.x** is supported and maintained. **v2.3.1** and earlier are **obsolete**; please upgrade to v3.

## Installation

You can install from **npm** (recommended) or from **GitHub**.

**From npm:**

```bash
npm install @pinarkive/pinarkive-sdk-ts
```

**From GitHub:**

```bash
npm install github:pinarkive/pinarkive-sdk-ts
```

For a specific version: `@pinarkive/pinarkive-sdk-ts@3.0.2` (npm) or `github:pinarkive/pinarkive-sdk-ts#v3.0.2` (GitHub).

## Base URL (required via .env or constructor)

The base URL is **not hardcoded**. It must be set in **.env** or passed in the constructor:

- **Browser:** the frontend injects `window.__ENV__` with `VITE_BACKEND_API_URL` and `VITE_API_BASE` (e.g. `/api/v3`). If present, the SDK uses them when `baseUrl` is not passed.
- **Node:** `PINARKIVE_API_BASE_URL` (full URL) or `VITE_BACKEND_API_URL` + `VITE_API_BASE`.

If no variable is set and `baseUrl` is not passed, the constructor throws an error.

```env
VITE_API_BASE=/api/v3
VITE_BACKEND_API_URL=https://api.pinarkive.com
```

## Quick Start

```typescript
import { PinarkiveClient, getDefaultBaseUrl } from '@pinarkive/pinarkive-sdk-ts';

// With options (baseUrl from .env if not passed)
const client = new PinarkiveClient({
  token: 'your-jwt-token',
  onUnauthorized: () => { /* logout */ },
});

// Or with explicit auth + baseURL
const client = new PinarkiveClient(
  { token: 'your-jwt-token' },
  getDefaultBaseUrl() || 'https://api.pinarkive.com/api/v3'
);

// Responses are the raw JSON body (not AxiosResponse)
const me = await client.getMe();
const result = await client.uploadFile(file, { clusterId: 'cl0-global' });
console.log(result.cid);

await client.pinCid(cid, { customName: 'my-file', clusterId: 'cl0-global' });
```

## Authentication

- **JWT Token:** `new PinarkiveClient({ token: '...' })` or in options.
- **API Key:** `new PinarkiveClient({ apiKey: '...' })`.
- **onUnauthorized:** optional callback; called on 401/403 (e.g. logout and redirect).

## Public routes (no Bearer)

- `getPlans()`, `getLanguages()`, `getCountries()`
- `login(email, password)`, `signup({ name, email, password })`

## Upload and pin (v3)

For upload and pin you can send:

- **clusterId** (or `cl`): e.g. `cl0-global`. Default on the backend is `cl0-global`.
- **timelock**: ISO 8601 UTC date (premium plans only); content expires at that time.

```typescript
await client.uploadFile(file, { clusterId: 'cl0-global', timelock: '2026-12-31T23:59:59Z' });
await client.uploadDirectory(dirPath, { clusterId: 'cl1-eu' });
await client.uploadDirectoryDAG(files, { dirName: 'proj', clusterId: 'cl0-global' });
await client.pinCid(cid, { customName: 'doc', clusterId: 'cl0-global' });
```

## List allowed clusters

```typescript
const clusters = await client.getClusters();
// Array<{ id, label, region?, country? }>
```

## API reference (summary)

- **Files:** `uploadFile`, `uploadDirectory`, `uploadDirectoryDAG`, `renameFile`, `removeFile`, `listUploads`
- **Pin:** `pinCid(cid, options?)` with `customName`, `clusterId`, `timelock`
- **Tokens:** `generateToken`, `listTokens`, `revokeToken`
- **User:** `getMe`, `getClusters`, `getPreferences`, `updatePreferences`, `getMyPlan`, `getPlansForUser`
- **Status:** `getStatus(cid)`, `getAllocations(cid)`

Responses are the **JSON object** returned by the API (no Axios-style wrapper). On error an `Error` is thrown with the server message; if `onUnauthorized` is defined, it is called on 401/403.

## Build

```bash
npm run build
```

Output in `dist/`.
