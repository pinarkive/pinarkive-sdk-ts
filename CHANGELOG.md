# Changelog

All notable changes to `@pinarkive/pinarkive-sdk-ts` are documented here.

## [3.1.5] - 2026-04-14

### Fixed

- **`onUnauthorized`:** Se invoca solo ante **HTTP 401**, no ante **403**. Un 403 puede ser `missing_scope` u otro permiso; no debe forzar logout (p. ej. en el navegador).

## [3.1.4] - 2026-04-14

### Changed

- **Documentation:** Added [docs.pinarkive.com](https://docs.pinarkive.com) link in README; clarified that other v3 SDKs use the same `files` multipart format for directory DAG uploads.

## [3.1.1] - 2026-04-14

### Fixed

- **`uploadDirectoryDAG` multipart format:** The API expects multer field **`files`** (repeated), with each part’s **filename** set to the relative path inside the DAG (same as app.pinarkive.com `uploadFilesAsDag`). The SDK previously sent `files[i][path]` / `files[i][content]`, which the backend does not parse into `req.files`, causing failures against `POST /api/v3/files/directory-dag`.
- **`DirectoryDAGResponse` typings:** Aligned with the real 201 response body: root CID is **`cid`** (not `dagCid`), plus `message`, `filename`, `size`, `type`, `files[]` (`cid`, `filename`, `size`, `path`), `total_files`, `total_size`.

### Migration

- Replace `result.dagCid` with **`result.cid`**.
- Other v3 SDKs (JavaScript, Go, PHP, Python) now use the same **`files`** multipart shape.

### Publishing this package (do not run from CI without secrets)

1. Commit changes on `main`.
2. Bump version and tag: `npm version patch` (or `minor` / `major`) — updates `package.json` and creates `vX.Y.Z`.
3. Push: `git push origin main --follow-tags`.
4. GitHub Actions workflow **Publish to npm** (on tag `v*`) runs `npm run build` and `npm publish`; requires repo secret **`NPM_TOKEN`**.

See also `RELEASE-STEPS.md` in this folder (may be gitignored in some clones).
