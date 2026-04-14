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

For a specific version: `@pinarkive/pinarkive-sdk-ts@3.1.1` (npm) or `github:pinarkive/pinarkive-sdk-ts#v3.1.1` (GitHub).

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
- **requestSource: 'web':** optional. When the SDK is used from the **browser/frontend**, pass `requestSource: 'web'` so the backend adds the header `X-Request-Source: web` on every Bearer-authenticated request. The backend will then classify those requests as **WEB** in logs instead of **JWT** (CLI/scripts). This option is only applied when using Bearer (token); it is never sent when using API Key.

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
const dag = await client.uploadDirectoryDAG(
  [
    { path: '1.png', content: pngBlob },
    { path: '2.png', content: otherPng },
  ],
  { dirName: 'launchpad', clusterId: 'cl0-global' }
);
console.log(dag.cid); // root CID → gateway …/ipfs/<cid>/1.png
await client.pinCid(cid, { customName: 'doc', clusterId: 'cl0-global' });
```

### Directory DAG (`uploadDirectoryDAG`)

The backend uses **multer** `upload.array('files')`. Each file must be appended as the field **`files`**, with the **multipart filename** equal to the path inside the DAG (e.g. `1.png`, `icons/logo.svg`). This matches the web app helper `uploadFilesAsDag` (`formData.append('files', file, filePath)`).

- **Browser:** use `File` or `Blob` as `content`; `path` is the relative path in the DAG.
- **Node.js 18+:** native `fetch`, `FormData`, and `Blob` are enough; pass a `Blob` (or `File` if available) for binary data, or a `string` for UTF-8 text (sent as `application/octet-stream`).
- **`FileUpload[]`:** `{ path: string; content: File | Blob | string }`.
- **Object form:** `Record<string, File | Blob | string>` — keys are paths, values are contents.

Optional `dirName` is sent as a form field (backend may ignore it for the stored name).

> **Other SDKs:** The JavaScript / Go / PHP / Python clients in this repo may still use the old `files[i][path]` shape until they are updated in a separate release.

Release notes: see [CHANGELOG.md](./CHANGELOG.md).

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

Responses are the **JSON object** returned by the API (no Axios-style wrapper). On error the SDK throws **`PinarkiveAPIError`** (extends `Error`) with `statusCode`, `message`, and optionally `code`, `required` (for 403 `missing_scope`), `retryAfterSeconds` (for 429). If `onUnauthorized` is defined, it is called on 401/403.

- **Scopes:** `generateToken(name, { scopes: ['files:read', 'files:write'], ... })`; response and list include `scopes`.
- **429:** Catch `PinarkiveAPIError`, check `e.retryAfterSeconds` and retry after that delay (or show “retry” to the user).
- **2FA login:** If `login()` returns `{ requires2FA: true, temporaryToken }`, call `verify2FALogin(temporaryToken, code)` with the 6-digit code.
- **2FA tokens:** When the account has 2FA, pass `totpCode` (or `twoFactorCode`) in `generateToken` options and in `revokeToken(name, { totpCode: '...' })`.

## Build

```bash
npm run build
```

Output in `dist/`.
