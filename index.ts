/**
 * Pinarkive SDK TypeScript – API v3
 * Uses native fetch; Bearer token for authenticated calls; optional onUnauthorized (e.g. logout).
 */

export type AuthType = { token?: string; apiKey?: string };

/** Thrown on API 4xx/5xx. For 403 missing_scope, check code and required. For 429, check retryAfterSeconds. */
export class PinarkiveAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public required?: string,
    public retryAfterSeconds?: number,
    public body?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PinarkiveAPIError';
  }
}

export interface ClientOptions {
  /** Base URL including path (e.g. https://api.pinarkive.com/api/v3) */
  baseUrl?: string;
  /** JWT or API key for authenticated requests */
  token?: string;
  apiKey?: string;
  /** Called on 401/403 so the app can logout/redirect */
  onUnauthorized?: () => void;
  /**
   * When set to 'web', sends header "X-Request-Source: web" on every Bearer-authenticated request.
   * Use this when the SDK runs in the browser so the backend logs classify the request as WEB instead of JWT.
   * Only applied when using Bearer (token); never sent when using apiKey.
   */
  requestSource?: 'web';
}

export interface FileUpload {
  path: string;
  content: File | Blob | string;
}

export interface UploadOptions {
  clusterId?: string;
  timelock?: string; // ISO 8601 UTC, premium only
}

export interface DirectoryDAGOptions extends UploadOptions {
  dirName?: string;
}

export interface PinOptions {
  clusterId?: string;
  customName?: string;
  timelock?: string; // ISO 8601 UTC, premium only
}

export interface TokenGenerateOptions {
  /** API scopes (e.g. files:read, files:write). If omitted, backend uses default minimal scopes. */
  scopes?: string[];
  /** @deprecated Use scopes. Legacy permissions array. */
  permissions?: string[];
  expiresInDays?: number;
  ipAllowlist?: string[];
  /** 2FA: required when account has 2FA enabled. Current 6-digit TOTP code. */
  totpCode?: string;
  /** 2FA: alias for totpCode. */
  twoFactorCode?: string;
}

export interface UploadResponse {
  cid: string;
  status: string;
  uploadId?: string;
}

/** One file inside the DAG (shape from POST /files/directory-dag success body). */
export interface DirectoryDAGFileInfo {
  cid: string;
  filename: string;
  size: number;
  path: string;
}

/** Success body from POST /files/directory-dag (201). Root CID is `cid`. */
export interface DirectoryDAGResponse {
  message: string;
  cid: string;
  filename: string;
  size: number;
  type: 'directory';
  files: DirectoryDAGFileInfo[];
  total_files: number;
  total_size: number;
}

export interface TokenResponse {
  token: string;
  name: string;
  expiresAt?: string;
  /** Scopes assigned to this token (from API). */
  scopes?: string[];
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
    clusterId?: string;
    expiresAt?: string;
  }>;
  pagination: { page: number; limit: number; total: number };
}

/** Read env from Node (process.env) without requiring @types/node */
function getNodeEnv(): Record<string, string | undefined> | undefined {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const p = g && (g as { process?: { env?: Record<string, string | undefined> } }).process;
    return p?.env;
  } catch {
    return undefined;
  }
}

/**
 * Resolves API base URL from environment when not passed explicitly.
 * Browser: window.__ENV__.VITE_BACKEND_API_URL + __ENV__.VITE_API_BASE
 * Node: process.env.PINARKIVE_API_BASE_URL or VITE_BACKEND_API_URL + VITE_API_BASE
 * Declare these in .env so clients can use a custom API endpoint.
 */
export function getDefaultBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as unknown as { __ENV__?: Record<string, string> }).__ENV__) {
    const env = (window as unknown as { __ENV__: Record<string, string> }).__ENV__;
    const backend = (env.VITE_BACKEND_API_URL || '').replace(/\/$/, '');
    const base = env.VITE_API_BASE || '/api/v3';
    return backend ? `${backend}${base.startsWith('/') ? base : `/${base}`}` : '';
  }
  const env = getNodeEnv();
  if (env?.PINARKIVE_API_BASE_URL) return env.PINARKIVE_API_BASE_URL.replace(/\/$/, '');
  if (env?.VITE_BACKEND_API_URL) {
    const b = env.VITE_BACKEND_API_URL.replace(/\/$/, '');
    const apiBase = env.VITE_API_BASE || '/api/v3';
    return `${b}${apiBase.startsWith('/') ? apiBase : `/${apiBase}`}`;
  }
  return '';
}

/**
 * Appends one file part for POST /files/directory-dag.
 * The Pinarkive API uses multer `upload.array('files')`: repeated field name **`files`**,
 * multipart filename = path inside the DAG (e.g. `1.png` or `assets/logo.png`).
 * Same as pinarkive-frontend `uploadFilesAsDag`: `formData.append('files', file, filePath)`.
 */
function appendDirectoryDagFile(form: FormData, relativePath: string, content: File | Blob | string): void {
  const path = relativePath.replace(/\\/g, '/').trim();
  if (!path || path.startsWith('/') || path.split('/').some((seg) => seg === '..')) {
    throw new Error(`Invalid DAG path: ${relativePath}`);
  }
  if (typeof content === 'string') {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    form.append('files', blob, path);
    return;
  }
  form.append('files', content, path);
}

export class PinarkiveClient {
  private baseUrl: string;
  private auth: AuthType;
  private onUnauthorized?: () => void;
  private requestSource?: 'web';

  constructor(authOrOptions: AuthType | ClientOptions, baseURL?: string) {
    if (typeof baseURL === 'string') {
      this.baseUrl = baseURL.replace(/\/$/, '');
      this.auth = authOrOptions as AuthType;
      this.onUnauthorized = undefined;
      this.requestSource = undefined;
    } else {
      const opts = authOrOptions as ClientOptions;
      const resolved = opts.baseUrl || getDefaultBaseUrl();
      if (!resolved) {
        throw new Error(
          'PinarkiveClient: baseUrl is required. Pass it in options or set in .env: PINARKIVE_API_BASE_URL or VITE_BACKEND_API_URL + VITE_API_BASE (browser: window.__ENV__)'
        );
      }
      this.baseUrl = resolved.replace(/\/$/, '');
      this.auth = { token: opts.token, apiKey: opts.apiKey };
      this.onUnauthorized = opts.onUnauthorized;
      this.requestSource = opts.requestSource;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit & { requireAuth?: boolean } = {}
  ): Promise<T> {
    const { requireAuth = true, ...init } = options;
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(init.headers as HeadersInit);

    if (requireAuth) {
      const token = this.auth.token || this.auth.apiKey;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      // Only send X-Request-Source: web when using Bearer (JWT), not when using API Key
      if (this.requestSource === 'web' && this.auth.token) {
        headers.set('X-Request-Source', 'web');
      }
    }

    if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...init, headers });
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      let message = 'Request failed';
      let body: Record<string, unknown> | undefined;
      if (contentType.includes('application/json')) {
        try {
          body = (await res.json()) as Record<string, unknown>;
          message = (body.message as string) ?? (body.error as string) ?? message;
        } catch {
          // ignore
        }
      }
      if ([401, 403].includes(res.status) && this.onUnauthorized) {
        this.onUnauthorized();
      }
      const code = body?.code as string | undefined;
      const required = body?.required as string | undefined;
      const retryAfterBody = body?.retryAfter as number | undefined;
      const retryAfterHeader = res.headers.get('Retry-After');
      const retryAfterSeconds =
        res.status === 429
          ? retryAfterBody ?? (retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined)
          : undefined;
      throw new PinarkiveAPIError(
        message,
        res.status,
        code,
        required,
        retryAfterSeconds,
        body
      );
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }
    if (!contentType.includes('application/json')) {
      throw new Error('Response is not JSON');
    }
    return res.json() as Promise<T>;
  }

  // --- Public (no Bearer) ---
  async getPlans(): Promise<unknown> {
    return this.request('/plans', { requireAuth: false });
  }

  async getLanguages(): Promise<unknown> {
    return this.request('/locales/languages', { requireAuth: false });
  }

  async getCountries(): Promise<unknown> {
    return this.request('/locales/countries', { requireAuth: false });
  }

  /** Login. If response has requires2FA and temporaryToken, call verify2FALogin(temporaryToken, code) to get the session token. */
  async login(
    email: string,
    password: string
  ): Promise<
    | { token: string; user?: unknown }
    | { requires2FA: true; temporaryToken: string }
  > {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      requireAuth: false,
    });
  }

  /** Complete login after 2FA. Call with temporaryToken and 6-digit code from authenticator app. */
  async verify2FALogin(
    temporaryToken: string,
    code: string
  ): Promise<{ token: string; user?: unknown }> {
    return this.request('/auth/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ temporaryToken, code }),
      requireAuth: false,
    });
  }

  async signup(body: { name: string; email: string; password: string; [k: string]: unknown }): Promise<unknown> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth: false,
    });
  }

  // --- File Management (auth + cl/timelock) ---
  async uploadFile(file: File | Blob, options: UploadOptions = {}): Promise<UploadResponse> {
    const form = new FormData();
    form.append('file', file);
    if (options.clusterId) form.append('cl', options.clusterId);
    if (options.timelock) form.append('timelock', options.timelock);
    return this.request<UploadResponse>('/files', {
      method: 'POST',
      body: form,
    });
  }

  async uploadDirectory(dirPath: string, options: UploadOptions = {}): Promise<UploadResponse> {
    return this.request<UploadResponse>('/files/directory', {
      method: 'POST',
      body: JSON.stringify({
        dirPath,
        ...(options.clusterId && { cl: options.clusterId }),
        ...(options.timelock && { timelock: options.timelock }),
      }),
    });
  }

  async uploadDirectoryDAG(
    files: FileUpload[] | Record<string, File | Blob | string>,
    options: DirectoryDAGOptions = {}
  ): Promise<DirectoryDAGResponse> {
    const form = new FormData();
    if (options.dirName) form.append('dirName', options.dirName);
    if (options.clusterId) form.append('cl', options.clusterId);
    if (options.timelock) form.append('timelock', options.timelock);

    if (Array.isArray(files)) {
      for (const file of files) {
        appendDirectoryDagFile(form, file.path, file.content);
      }
    } else {
      for (const [p, content] of Object.entries(files)) {
        appendDirectoryDagFile(form, p, content);
      }
    }
    return this.request<DirectoryDAGResponse>('/files/directory-dag', { method: 'POST', body: form });
  }

  async renameFile(uploadId: string, newName: string): Promise<RenameResponse> {
    return this.request<RenameResponse>(`/files/rename/${uploadId}`, {
      method: 'PUT',
      body: JSON.stringify({ newName }),
    });
  }

  async pinCid(cid: string, options: PinOptions = {}): Promise<PinResponse> {
    const body: Record<string, string> = {};
    if (options.customName) body.customName = options.customName;
    if (options.clusterId) body.cl = options.clusterId;
    if (options.timelock) body.timelock = options.timelock;
    return this.request<PinResponse>(`/files/pin/${cid}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async removeFile(cid: string): Promise<void> {
    return this.request(`/files/remove/${cid}`, { method: 'DELETE' });
  }

  async listUploads(
    page = 1,
    limit = 10,
    hasExpiration?: boolean,
    params?: { parentCid?: string; cid?: string }
  ): Promise<UploadsResponse> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (hasExpiration === true) q.set('hasExpiration', 'true');
    if (params?.parentCid) q.set('parentCid', params.parentCid);
    if (params?.cid) q.set('cid', params.cid);
    return this.request<UploadsResponse>(`/users/me/uploads?${q}`);
  }

  /** Detalle de un DAG (archivos internos). GET /users/me/uploads/dag/:cidDag */
  async getDagDetail(cidDag: string): Promise<unknown> {
    return this.request(`/users/me/uploads/dag/${encodeURIComponent(cidDag)}`);
  }

  // --- Token Management ---
  async generateToken(name: string, options: TokenGenerateOptions = {}): Promise<TokenResponse> {
    const payload: Record<string, unknown> = { name };
    if (options.scopes?.length) payload.scopes = options.scopes;
    if (options.permissions) payload.permissions = options.permissions;
    if (options.expiresInDays != null) payload.expiresInDays = options.expiresInDays;
    if (options.ipAllowlist) payload.ipAllowlist = options.ipAllowlist;
    const totp = options.totpCode ?? options.twoFactorCode;
    if (totp) payload.totpCode = totp;
    return this.request<TokenResponse>('/tokens/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listTokens(): Promise<unknown> {
    return this.request('/tokens/list');
  }

  /** Revoke token by name. If account has 2FA, pass totpCode in options. */
  async revokeToken(name: string, options?: { totpCode?: string; twoFactorCode?: string }): Promise<void> {
    const body =
      options?.totpCode != null
        ? JSON.stringify({ totpCode: options.totpCode })
        : options?.twoFactorCode != null
          ? JSON.stringify({ twoFactorCode: options.twoFactorCode })
          : undefined;
    return this.request(`/tokens/revoke/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      ...(body && { body }),
    });
  }

  // --- Status ---
  async getStatus(cid: string): Promise<unknown> {
    return this.request(`/status/${cid}`);
  }

  async getAllocations(cid: string): Promise<unknown> {
    return this.request(`/status/allocations/${cid}`);
  }

  // --- User ---
  async getMe(): Promise<unknown> {
    return this.request('/users/me');
  }

  async getClusters(): Promise<Array<{ id: string; label: string; region?: string; country?: string }>> {
    return this.request('/users/me/clusters');
  }

  async getPreferences(): Promise<unknown> {
    return this.request('/users/me/preferences');
  }

  async updatePreferences(language: string, country: string): Promise<unknown> {
    return this.request('/users/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ language, country }),
    });
  }

  async getMyPlan(): Promise<unknown> {
    return this.request('/plans/my-plan');
  }

  async getPlansForUser(): Promise<unknown> {
    return this.request('/users/me/plans');
  }

  /** PUT /plans/change. Body: { planId } */
  async changePlan(planId: string): Promise<unknown> {
    return this.request('/plans/change', {
      method: 'PUT',
      body: JSON.stringify({ planId }),
    });
  }

  async getReferrals(): Promise<unknown> {
    return this.request('/users/me/referrals');
  }

  /** PUT /users/me. Actualizar perfil. */
  async updateMe(body: Record<string, unknown>): Promise<unknown> {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /** PUT /users/me/password. Change password. */
  async updatePassword(body: { currentPassword: string; newPassword: string }): Promise<unknown> {
    return this.request('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /** POST /auth/logout. Invalidates the token. */
  async logout(): Promise<void> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  /** GET /allocations/:cid (mismo uso que getFileAllocations en frontend). */
  async getFileAllocations(cid: string): Promise<unknown> {
    return this.request(`/allocations/${encodeURIComponent(cid)}`);
  }

  // --- Payments (multisafepay / coingate) ---
  async createPaymentOrder(gateway: 'multisafepay' | 'coingate', planId: string): Promise<unknown> {
    return this.request(`/payments/${gateway}/create`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  async getPaymentStatus(gateway: 'multisafepay' | 'coingate', orderId: string): Promise<unknown> {
    return this.request(`/payments/${gateway}/status/${encodeURIComponent(orderId)}`);
  }

  async cancelPayment(gateway: 'multisafepay' | 'coingate', orderId: string): Promise<unknown> {
    return this.request(`/payments/${gateway}/cancel/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    });
  }
}
