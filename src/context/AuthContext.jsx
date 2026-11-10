import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearSession,
  ensureDemoUsers,
  readActiveSession,
  refreshSessionUser,
  signIn as authSignIn,
  signUp as authSignUp,
} from '../lib/auth'
import { ensureDemoRoom } from '../lib/rooms'
import { socket } from '../lib/socket'
import { subscribeStorage } from '../lib/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    ensureDemoUsers()
    ensureDemoRoom()
    return readActiveSession()
  })
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    ensureDemoUsers()
    ensureDemoRoom()
    setUser(refreshSessionUser())
    setBooting(false)
    return subscribeStorage((key) => {
      if (key === 'ca_session' || key === 'ca_users') {
        setUser(refreshSessionUser())
      }
    })
  }, [])

  useEffect(() => {
    const email = user?.email?.toLowerCase().trim()
    if (!email) {
      socket.disconnect()
      return undefined
    }

    const register = () => socket.emit('register', email)

    socket.on('connect', register)
    if (socket.connected) register()
    else socket.connect()

    return () => {
      socket.off('connect', register)
      socket.disconnect()
    }
  }, [user?.email])

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      async signIn(payload) {
        const result = await authSignIn(payload)
        if (result.ok) setUser(result.user)
        return result
      },
      async signUp(payload) {
        const result = await authSignUp(payload)
        if (result.ok) setUser(result.user)
        return result
      },
      signOut() {
        clearSession()
        setUser(null)
      },
      refresh() {
        setUser(refreshSessionUser())
      },
    }),
    [user, booting],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
