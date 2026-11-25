import { readJson, writeJson } from './storage'
import { isNitEmail } from './email'

const USERS_KEY = 'ca_users'
const SESSION_KEY = 'ca_session'
const ACCESS_TOKEN_KEY = 'ca_access_token'
const REFRESH_TOKEN_KEY = 'ca_refresh_token'
const SIGN_IN_URL = '/api/auth/signIn/userSignIn'
const SIGN_UP_URL = '/api/auth/signUp/userSignUp'
const REFRESH_URL = '/api/auth/signIn/refresh'
const SEND_OTP_URL = '/api/send_otp/sendOtp'
const VERIFY_OTP_URL = '/api/verify_otp/verifyOtp'
const FORGET_PASSWORD_URL = '/api/forget/forgetPassword'
let refreshInFlight = null

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) return false
    try {
      const response = await fetch(REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.accessToken || !data.refreshToken) {
        clearSession()
        return false
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      if (data.user) syncApiUser({ ...data.user, id: data.user.id || data.user._id })
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export async function authenticatedFetch(url, options = {}) {
  const send = () => {
    const headers = new Headers(options.headers || {})
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(url, { ...options, headers })
  }
  let response = await send()
  if (response.status === 401 && await refreshAccessToken()) {
    response = await send()
    if (response.status === 401) clearSession()
  }
  return response
}

export async function fetchProfile() {
  try {
    const response = await authenticatedFetch('/api/auth/signIn/me')
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return { ok: false, error: data.message || 'Could not load profile.' }
    const user = { ...data.user, id: data.user.id || data.user._id }
    syncApiUser(user)
    const session = readActiveSession()
    if (session?.id === user.id) setSession(user, session.remember !== false)
    return { ok: true, user }
  } catch {
    return { ok: false, error: 'Unable to reach the server.' }
  }
}

export const DEMO_ACCOUNTS = [
  {
    id: 'user_demo_043',
    name: 'Aarav Sharma',
    email: '2024pgcsca043@nitjsr.ac.in',
    password: '12345678',
  },
  {
    id: 'user_demo_044',
    name: 'Ananya Verma',
    email: '2024pgcsca044@nitjsr.ac.in',
    password: '12345678',
  },
]

function getUsers() {
  return readJson(USERS_KEY, [])
}

function saveUsers(users) {
  writeJson(USERS_KEY, users)
}

function syncApiUser(user) {
  if (!user?.id) return
  const users = getUsers()
  const existing = users.findIndex((item) => item.id === user.id)
  const localUser = {
    ...(existing >= 0 ? users[existing] : {}),
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNo: user.phoneNo,
    stats: user.stats || (existing >= 0 ? users[existing].stats : {
      helped: 0,
      requested: 0,
      tipsEarned: 0,
      points: 40,
      coins: 0,
      completedJobs: 0,
    }),
  }

  if (existing >= 0) {
    users[existing] = localUser
  } else {
    users.push(localUser)
  }
  saveUsers(users)
}

async function requestAuth(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return { ok: false, error: data.message || 'Authentication failed.' }
    }

    const user = data.user
    const normalizedUser = user
      ? { ...user, id: user.id || user._id }
      : null
    if (!normalizedUser?.id) {
      return { ok: false, error: 'The server returned an invalid user.' }
    }

    // Room/profile features use the local store, but a sync failure should not
    // turn a successful backend login into a failed login.
    try {
      syncApiUser(normalizedUser)
    } catch (syncError) {
      console.warn('Could not sync local user profile:', syncError)
    }
    if (data.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
    if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    return { ok: true, user: setSession(normalizedUser) }
  } catch (error) {
    console.error('Authentication request failed:', error)
    return {
      ok: false,
      error: 'Unable to reach the server. Please try again.',
    }
  }
}

async function requestOtp(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))
    return response.ok
      ? { ok: true, message: data.message }
      : { ok: false, error: data.message || 'Email verification failed.' }
  } catch {
    return { ok: false, error: 'Unable to reach the server. Please try again.' }
  }
}

export async function sendEmailOtp(email) {
  const cleanEmail = String(email).trim().toLowerCase()
  if (!isNitEmail(cleanEmail)) return { ok: false, error: 'Use your official @nitjsr.ac.in email.' }
  return requestOtp(SEND_OTP_URL, { email: cleanEmail })
}

export async function verifyEmailOtp(email, otp) {
  const cleanEmail = String(email).trim().toLowerCase()
  if (!isNitEmail(cleanEmail)) return { ok: false, error: 'Use your official @nitjsr.ac.in email.' }
  if (!/^\d{6}$/.test(String(otp).trim())) return { ok: false, error: 'Enter the six digit code from your email.' }
  return requestOtp(VERIFY_OTP_URL, { email: cleanEmail, otp: String(otp).trim() })
}

export async function resetPassword(email, password) {
  const cleanEmail = String(email).trim().toLowerCase()
  if (!isNitEmail(cleanEmail)) return { ok: false, error: 'Use your official @nitjsr.ac.in email.' }
  if (String(password).length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  try {
    const response = await fetch(FORGET_PASSWORD_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    })
    const data = await response.json().catch(() => ({}))
    return response.ok
      ? { ok: true, message: data.message }
      : { ok: false, error: data.message || 'Could not update your password.' }
  } catch {
    return { ok: false, error: 'Unable to reach the server. Please try again.' }
  }
}

/** Ensures explore accounts always exist with the known password. */
export function ensureDemoUsers() {
  const users = getUsers()
  let changed = false

  const next = [...users]
  for (const demo of DEMO_ACCOUNTS) {
    const index = next.findIndex((u) => u.email === demo.email || u.id === demo.id)
    if (index === -1) {
      next.push({
        id: demo.id,
        name: demo.name,
        email: demo.email,
        password: demo.password,
        createdAt: Date.now(),
        stats: {
          helped: demo.id === 'user_demo_044' ? 2 : 0,
          requested: demo.id === 'user_demo_043' ? 1 : 0,
          tipsEarned: demo.id === 'user_demo_044' ? 40 : 0,
          points: demo.id === 'user_demo_044' ? 80 : 45,
        },
      })
      changed = true
    } else {
      const existing = next[index]
      const synced = {
        ...existing,
        id: demo.id,
        name: existing.name || demo.name,
        email: demo.email,
        password: demo.password,
        stats: existing.stats || {
          helped: 0,
          requested: 0,
          tipsEarned: 0,
          points: 40,
        },
      }
      if (
        existing.id !== synced.id ||
        existing.email !== synced.email ||
        existing.password !== synced.password
      ) {
        next[index] = synced
        changed = true
      }
    }
  }

  if (changed) saveUsers(next)
  return next
}

export function getSession() {
  return readJson(SESSION_KEY, null)
}

export function setSession(user, remember = true) {
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    stats: user.stats,
    remember,
  }
  if (remember) {
    writeJson(SESSION_KEY, session)
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    localStorage.removeItem(SESSION_KEY)
    window.dispatchEvent(
      new CustomEvent('ca-storage', { detail: { key: SESSION_KEY } }),
    )
  }
  return session
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(
    new CustomEvent('ca-storage', { detail: { key: SESSION_KEY } }),
  )
}

export function readActiveSession() {
  const fromLocal = readJson(SESSION_KEY, null)
  if (fromLocal) return fromLocal
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null
}

export function refreshSessionUser() {
  const session = readActiveSession()
  if (!session) return null
  const user = getUserById(session.id)
  if (!user) {
    clearSession()
    return null
  }
  return {
    ...session,
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNo: user.phoneNo,
    stats: user.stats,
  }
}

export async function signUp({ name, email, phoneNo, password }) {
  const cleanEmail = String(email).trim().toLowerCase()
  const cleanName = String(name).trim()

  if (!cleanName) return { ok: false, error: 'Enter your full name.' }
  if (!isNitEmail(cleanEmail)) {
    return { ok: false, error: 'Use your official @nitjsr.ac.in email.' }
  }
  if (String(password).length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }

  if (!phoneNo) return { ok: false, error: 'Enter your phone number.' }
  const result = await requestAuth(SIGN_UP_URL, {
    name: cleanName,
    email: cleanEmail,
    phoneNo: String(phoneNo).trim(),
    password,
  })
  if (!result.ok) return result

  // Registration returns the user but no access token, so authenticate the
  // new account before allowing access to protected room actions.
  return requestAuth(SIGN_IN_URL, { email: cleanEmail, password })
}

export async function signIn({ email, password, remember = true }) {
  const cleanEmail = String(email).trim().toLowerCase()
  if (!isNitEmail(cleanEmail)) {
    return { ok: false, error: 'Use your official @nitjsr.ac.in email.' }
  }

  const result = await requestAuth(SIGN_IN_URL, { email: cleanEmail, password })
  if (!result.ok) return result
  return { ...result, user: setSession(result.user, remember) }
}

export function updateUserStats(userId, patch) {
  const users = getUsers()
  const next = users.map((u) => {
    if (u.id !== userId) return u
    return { ...u, stats: { ...u.stats, ...patch(u.stats) } }
  })
  saveUsers(next)
  const session = readActiveSession()
  if (session?.id === userId) {
    const user = next.find((u) => u.id === userId)
    if (user) setSession(user, session.remember !== false)
  }
}

export function displayNameFromEmail(email) {
  const local = String(email).split('@')[0] || 'student'
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
