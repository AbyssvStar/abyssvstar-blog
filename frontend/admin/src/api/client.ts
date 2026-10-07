/**
 * 与后端通信的唯一入口。
 *
 * 三条规则都写在这里，页面里不用再操心：
 *  1. 所有接口都是统一 envelope，**code = 0 才算成功**，前端只看 code
 *  2. 非 GET 请求必须带 X-CSRF-Token，否则一律 403
 *  3. 失败一律抛 ApiError，带 code，页面按 code 决定怎么提示
 */

export interface ApiResponse<T> {
  code: number
  message: string
  data?: T
  errors?: FieldViolation[]
}

export interface FieldViolation {
  field: string
  code: string
  message: string
}

/** 登录后拿到的 csrfToken 存在这里。刷新页面后靠 GET /auth/me 重新取回。 */
let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

export class ApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly status: number,
    readonly violations?: FieldViolation[],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  // 非 GET 一律带上，漏了后端会直接 403
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(`/admin/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  if (!text) {
    throw new ApiError(-1, `服务端返回了空响应（HTTP ${res.status}）`, res.status)
  }

  let json: ApiResponse<T>
  try {
    json = JSON.parse(text) as ApiResponse<T>
  } catch {
    throw new ApiError(-1, `响应不是合法 JSON（HTTP ${res.status}）`, res.status)
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, json.message, res.status, json.errors)
  }
  return json.data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}

/** 错误码常量，和后端 shared/web/ErrorCode.kt 对齐 */
export const Code = {
  OK: 0,
  VALIDATION_FAILED: 10001,
  CONFLICT: 10004,
  UNAUTHENTICATED: 20001,
  BAD_CREDENTIALS: 20004,
  POST_NOT_FOUND: 30001,
  SLUG_TAKEN: 30002,
  PUBLISH_TIME_IN_PAST: 30003,
  TOO_MANY_TAGS: 30004,
  INVALID_TAG_NAME: 30005,
  SUMMARY_REQUIRED: 30007,
  INVALID_STATE_TRANSITION: 30011,
} as const
