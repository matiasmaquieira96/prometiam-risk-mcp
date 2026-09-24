/**
 * Thin HTTP client for the Prometiam company data API.
 *
 * Reads the API key from the PROMETIAM_API_KEY environment variable.
 * Falls back to PROMETIAM_BASE_URL when set (useful for local testing).
 */

const DEFAULT_BASE_URL = 'https://api.prometiam.com/functions/v1/risk-api'
// A shared, public demo key with tight limits (30 requests a minute, 2,000 a day for everyone
// who runs the server without a key of their own). It exists so an install works on the first
// tool call; the quota message points at a free personal key. Rotated server-side if abused.
export const DEMO_KEY = 'rk_live_mcpdemo_64f4c7338872fe6dfd8aa3db'
export const SIGNUP_URL = 'https://www.prometiam.com/signup?utm_source=mcp&utm_medium=demo'
export const DEMO_NOTE =
  'Running on the shared demo key (2,000 calls a day for everyone). For your own 1,000 free calls a month, '
  + 'no card: get a key at ' + SIGNUP_URL + ' and set PROMETIAM_API_KEY.'

export class RiskApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfter?: number

  constructor(message: string, status: number, code: string, retryAfter?: number) {
    super(message)
    this.name = 'RiskApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

export interface RiskApiClientOptions {
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
  userAgent?: string
}

export class RiskApiClient {
  private readonly apiKey: string
  /** True when no key was configured and the shared demo key is in use. */
  readonly isDemo: boolean
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly userAgent: string

  constructor(opts: RiskApiClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.PROMETIAM_API_KEY ?? DEMO_KEY
    this.isDemo = apiKey === DEMO_KEY
    if (this.isDemo) console.error('[prometiam-risk-mcp] ' + DEMO_NOTE)
    if (!apiKey.startsWith('rk_live_') && !apiKey.startsWith('rk_test_')) {
      throw new Error('Invalid API key format. Prometiam keys start with rk_live_ or rk_test_.')
    }
    this.apiKey = apiKey
    this.baseUrl = (opts.baseUrl ?? process.env.PROMETIAM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.timeoutMs = opts.timeoutMs ?? 15000
    // Keep in step with package.json and the serverInfo.version in index.ts.
    this.userAgent = opts.userAgent ?? `prometiam-risk-mcp/0.4.0 (+https://www.prometiam.com)`
  }

  /**
   * GET request with query string. Returns the parsed JSON envelope as-is.
   */
  async get(path: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const url = new URL(this.baseUrl + (path.startsWith('/') ? path : '/' + path))
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue
      if (typeof value === 'boolean') {
        url.searchParams.append(key, value ? 'true' : 'false')
      } else {
        url.searchParams.append(key, String(value))
      }
    }
    return this.request('GET', url)
  }

  /** POST request with a JSON body (used by monitor subscribe). */
  async post(path: string, body: Record<string, unknown> = {}): Promise<unknown> {
    const url = new URL(this.baseUrl + (path.startsWith('/') ? path : '/' + path))
    // Strip undefined so we don't send explicit nulls the API doesn't expect.
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) if (v !== undefined && v !== null) clean[k] = v
    return this.request('POST', url, JSON.stringify(clean))
  }

  /** DELETE request (used by monitor stop). */
  async del(path: string): Promise<unknown> {
    const url = new URL(this.baseUrl + (path.startsWith('/') ? path : '/' + path))
    return this.request('DELETE', url)
  }

  /** Shared request pipeline for GET/POST/DELETE. */
  private async request(method: string, url: URL, jsonBody?: string): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          'User-Agent': this.userAgent,
          ...(jsonBody ? { 'Content-Type': 'application/json' } : {}),
        },
        body: jsonBody,
        signal: controller.signal,
      })
    } catch (err) {
      const e = err as Error
      if (e.name === 'AbortError') {
        throw new RiskApiError(`Request timed out after ${this.timeoutMs}ms`, 0, 'timeout')
      }
      throw new RiskApiError(`Network error: ${e.message}`, 0, 'network_error')
    } finally {
      clearTimeout(timer)
    }

    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        // non-JSON response from upstream; surface raw text in the error
      }
    }

    if (!response.ok) {
      const errBody = body as { error?: { code?: string; message?: string } } | null
      const code = errBody?.error?.code ?? 'http_error'
      const message = errBody?.error?.message ?? `HTTP ${response.status} ${response.statusText}`
      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined
      if (this.isDemo && (response.status === 429 || response.status === 401)) {
        throw new RiskApiError(
          (response.status === 429
            ? 'The shared demo key has used its quota for now (2,000 calls a day for everyone). '
            : 'The shared demo key was rotated. ')
            + 'Get your own free key, 1,000 calls a month and no card, at ' + SIGNUP_URL
            + ' and set PROMETIAM_API_KEY.',
          response.status, code, retryAfter)
      }
      throw new RiskApiError(message, response.status, code, retryAfter)
    }

    return body
  }
}

/** Lazy singleton — reads env vars at first use, not at import time. */
let cached: RiskApiClient | null = null
export function getClient(): RiskApiClient {
  if (!cached) cached = new RiskApiClient()
  return cached
}
