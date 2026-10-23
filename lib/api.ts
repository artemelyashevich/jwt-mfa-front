export type LoginResponse = {
  accessToken: string
  refreshToken: string
}

export type OtpResponse = {
  requestId: string
  expiresInSeconds: number
  resendAvailableInSeconds: number
}

export type OtpConfirmationResponse = {
  confirmationToken: string
  type: "EMAIL_VERIFICATION"
  expiresInSeconds: number
}

export type UserStatus = "VERIFICATION_REQUIRE" | "ACTIVE" | "BLOCKED"

export type RoleCode = "USER" | "MODERATOR" | "ADMIN"

export type CurrentUser = {
  id: number
  email: string
  name: string | null
  status: UserStatus
  locale: string
  roles: RoleCode[]
  emailVerifiedAt: string | null
  lastLoginAt: string | null
}

type ExceptionBody = {
  message?: string
  details?: Record<string, string>
}

// Keys the backend always adds to ExceptionBody.details; everything else is a field error.
const SERVICE_DETAIL_KEYS = new Set(["errorId", "errorCode", "error"])

/**
 * Error returned by the backend, mapped from its ExceptionBody.
 * `code` is the AppExceptionCode label (e.g. "OTP_INVALID"),
 * `fieldErrors` holds bean-validation messages keyed by request field.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly fieldErrors: Record<string, string>

  constructor(status: number, body: ExceptionBody | null) {
    super(body?.message ?? "Не удалось выполнить запрос. Попробуйте позже.")
    this.status = status
    this.code = body?.details?.error
    this.fieldErrors = Object.fromEntries(
      Object.entries(body?.details ?? {}).filter(
        ([key]) => !SERVICE_DETAIL_KEYS.has(key)
      )
    )
  }
}

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"

export function hasSession() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) !== null
}

/** Access token expiry (epoch ms) from its `exp` claim; null if there is no readable token. */
export function accessTokenExpiresAt() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  try {
    const payload = token?.split(".")[1]
    if (!payload) {
      return null
    }
    const { exp } = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    )
    return typeof exp === "number" ? exp * 1000 : null
  } catch {
    return null
  }
}

function saveTokens(tokens: LoginResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

type RequestOptions = {
  method?: "GET" | "POST"
  body?: unknown
  auth?: boolean
}

async function send(
  path: string,
  { method = "POST", body, auth }: RequestOptions
) {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (auth) {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`
    }
  }

  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, {
      message: "Сервер недоступен. Проверьте соединение.",
    })
  }

  if (response.ok) {
    return response.status === 204 ? null : response.json()
  }
  const errorBody = await response.json().catch(() => null)
  throw new ApiError(response.status, errorBody)
}

let refreshInFlight: Promise<void> | null = null

// Concurrent 401s share one refresh call: the backend rotates the refresh token,
// so a second parallel refresh with the old token would be rejected as revoked.
function refreshTokens() {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        throw new ApiError(401, null)
      }
      saveTokens(await send("/auth/refresh", { body: { refreshToken } }))
    } catch (error) {
      clearTokens()
      throw error
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  try {
    return await send(path, options)
  } catch (error) {
    if (!options.auth || !(error instanceof ApiError) || error.status !== 401) {
      throw error
    }
    await refreshTokens()
    return send(path, options)
  }
}

export const api = {
  /** Starts registration: sends a 6-digit email verification code. Repeat the call to resend. */
  startRegistration(email: string) {
    return request<OtpResponse>("/auth/registration", { body: { email } })
  },

  /** Exchanges the emailed code for a one-time confirmation token. */
  confirmOtp(requestId: string, code: string) {
    return request<OtpConfirmationResponse>("/auth/otp/confirm", {
      body: { requestId, code },
    })
  },

  async completeRegistration(
    confirmationToken: string,
    name: string,
    password: string
  ) {
    saveTokens(
      await request<LoginResponse>("/auth/registration/complete", {
        body: { confirmationToken, name, password },
      })
    )
  },

  /** First login factor: checks the password and emails a login code. Repeat the call to resend. */
  login(email: string, password: string) {
    return request<OtpResponse>("/auth/login", { body: { email, password } })
  },

  /** Second login factor: exchanges the emailed code for tokens. */
  async confirmLogin(requestId: string, code: string) {
    saveTokens(
      await request<LoginResponse>("/auth/login/confirm", {
        body: { requestId, code },
      })
    )
  },

  me() {
    return request<CurrentUser>("/account/me", { method: "GET", auth: true })
  },

  /** Admin only: users whose email contains `email` (case-insensitive), sorted by email. Non-admins get 403 ACCESS_DENIED. */
  adminSearchUsers(email: string) {
    return request<CurrentUser[]>(
      `/admin/users?email=${encodeURIComponent(email)}`,
      { method: "GET", auth: true }
    )
  },

  /** Revokes the session on the backend; local tokens are cleared even if the call fails. */
  async logout() {
    try {
      await request<null>("/account/logout", { auth: true })
    } finally {
      clearTokens()
    }
  },
}
