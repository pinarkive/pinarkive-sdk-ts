# Pinarkive SDK – TypeScript (API v3) – Superficie pública

Documentación de los **endpoints para SDK público**: los que deben usarse para desplegar apps con Pinarkive (files, clusters, tokens, status, uploads, auth).  
Entrada: `ts/index.ts` → clase `PinarkiveClient`. Exporta tipos (`UploadOptions`, `DirectoryDAGOptions`, `UploadResponse`, `DirectoryDAGResponse`, etc.).

> **Listado completo** (incluidos endpoints solo para admin/frontend): ver **[SDK.md](../SDK.md)** en la raíz del repo.

---

## Públicos (sin auth)

| Método | Ruta API | Firma |
|--------|----------|--------|
| GET /plans | `getPlans(): Promise<unknown>` | Planes públicos |

---

## Auth (login para obtener token)

| Método | Ruta API | Firma |
|--------|----------|--------|
| POST /auth/login | `login(email, password)` | Retorna `{ token, user? }` o `{ requires2FA, temporaryToken }` |
| POST /auth/2fa/verify-login | `verify2FALogin(temporaryToken, code)` | Completar login 2FA |

---

## Files

| Método | Ruta API | Firma |
|--------|----------|--------|
| POST /files | `uploadFile(file, options): Promise<UploadResponse>` | options: `UploadOptions` |
| POST /files/directory | `uploadDirectory(dirPath, options): Promise<UploadResponse>` | options: `UploadOptions` |
| POST /files/directory-dag | `uploadDirectoryDAG(files, options): Promise<DirectoryDAGResponse>` | Multipart: campo repetido **`files`**, filename = ruta en el DAG (como el frontend `uploadFilesAsDag`). files: `FileUpload[]` o `Record<string, File \| Blob \| string>`. Respuesta: `cid` raíz, `files[]`, `total_files`, `total_size`. |
| PUT /files/rename/:uploadId | `renameFile(uploadId, newName): Promise<RenameResponse>` | |
| POST /files/pin/:cid | `pinCid(cid, options): Promise<PinResponse>` | options: `PinOptions` |
| DELETE /files/remove/:cid | `removeFile(cid): Promise<void>` | |

---

## Users / uploads

| Método | Ruta API | Firma |
|--------|----------|--------|
| GET /users/me | `getMe(): Promise<unknown>` | |
| GET /users/me/uploads | `listUploads(page?, limit?, hasExpiration?, params?): Promise<UploadsResponse>` | params: { parentCid?, cid? } |
| GET /users/me/clusters | `getClusters(): Promise<…>` | Clusters permitidos según plan |

---

## Tokens (API tokens)

| Método | Ruta API | Firma |
|--------|----------|--------|
| POST /tokens/generate | `generateToken(name, options): Promise<TokenResponse>` | options: `TokenGenerateOptions` |
| GET /tokens/list | `listTokens(): Promise<unknown>` | |
| DELETE /tokens/revoke/:name | `revokeToken(name, options?): Promise<void>` | options: { totpCode?, twoFactorCode? } |

---

## Status y allocations

| Método | Ruta API | Firma |
|--------|----------|--------|
| GET /status/:cid | `getStatus(cid): Promise<unknown>` | |
| GET /status/allocations/:cid | `getAllocations(cid): Promise<unknown>` | |
| GET /allocations/:cid | `getFileAllocations(cid): Promise<unknown>` | |

---

Especificación del backend: **API.md**.
