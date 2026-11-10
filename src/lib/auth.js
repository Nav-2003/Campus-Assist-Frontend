import { readJson, writeJson } from './storage'
import { isNitEmail } from './email'

const USERS_KEY = 'ca_users'
const SESSION_KEY = 'ca_session'
const ACCESS_TOKEN_KEY = 'ca_access_token'
const REFRESH_TOKEN_KEY = 'ca_refresh_token'
const SIGN_IN_URL = '/api/auth/signIn/userSignIn'
const SIGN_UP_URL = '/api/auth/signUp/userSignUp'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
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
    stats: existing >= 0 ? users[existing].stats : {
      helped: 0,
      requested: 0,
      tipsEarned: 0,
      points: 40,
    },
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
