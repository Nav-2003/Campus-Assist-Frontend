import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../lib/rooms'

const nav = [
  { to: '/dashboard', label: 'Lobby' },
  { to: '/raise', label: 'Raise request' },
  { to: '/profile', label: 'Profile' },
]

export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="app-atmosphere min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="app-orb absolute -top-32 right-[-8%] h-[34rem] w-[34rem] rounded-full blur-2xl"
          style={{
            background:
              'radial-gradient(circle, rgba(18,168,132,0.28) 0%, rgba(18,168,132,0.08) 42%, transparent 70%)',
          }}
        />
        <div
          className="app-orb app-orb-delay absolute bottom-[-20%] left-[-12%] h-[28rem] w-[28rem] rounded-full blur-2xl"
          style={{
            background:
              'radial-gradient(circle, rgba(9,92,74,0.2) 0%, rgba(13,122,98,0.08) 45%, transparent 72%)',
          }}
        />
        <div
          className="absolute top-[38%] left-[42%] h-64 w-64 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%)',
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 shadow-[0_8px_30px_-20px_rgba(6,21,16,0.25)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/dashboard" className="shrink-0">
            <span className="font-display text-[1.05rem] font-bold tracking-[-0.02em] text-ink">
              Campus Assist
            </span>
            <span className="mt-0.5 block text-[0.68rem] font-medium tracking-[0.02em] text-jade">
              Live request lobby
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-jade/10 text-jade-deep'
                      : 'text-stone hover:bg-white/70 hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{user?.name}</p>
              <p className="text-xs font-medium text-stone">
                {user?.stats?.points ?? 0} community pts
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-jade-glow">
              {initials(user?.name)}
            </div>
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={handleSignOut}
              className="rounded-lg border border-line/80 bg-white/60 px-3 py-2 text-xs font-semibold text-stone transition-colors hover:border-jade hover:text-jade-deep"
            >
              <span className="hidden sm:inline">Sign out</span><span className="sm:hidden" aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

      </header>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-line/70 bg-white/90 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_36px_-28px_rgba(6,21,16,0.45)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {nav.map((item, index) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.68rem] font-bold transition-colors ${isActive ? 'bg-jade/10 text-jade-deep' : 'text-stone'}`}>
              <span className="text-base leading-none" aria-hidden="true">{['⌂', '+', '◉'][index]}</span>
              <span>{item.label === 'Raise request' ? 'Raise' : item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-3 py-5 pb-24 sm:px-6 sm:py-10 sm:pb-10">
        <Outlet />
      </main>
    </div>
  )
}
