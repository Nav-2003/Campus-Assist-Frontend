import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../hooks/useRooms'
import { fetchProfile } from '../lib/auth'
import { initials, statusLabel } from '../lib/rooms'

export default function Profile() {
  const { user } = useAuth()
  const { rooms } = useRooms()
  const [profile, setProfile] = useState(user)
  useEffect(() => {
    let active = true
    const load = async () => {
      const result = await fetchProfile()
      if (active && result.ok) setProfile(result.user)
    }
    load()
    const timer = window.setInterval(load, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const owned = rooms.filter((room) => room.ownerId === user.id)
  const helping = rooms.filter((room) => room.members.some((member) => member.userId === user.id && member.role === 'helper'))
  const activeOwned = owned.filter((room) => ['open', 'joined', 'coming', 'parchasing'].includes(room.status))
  const activeHelping = helping.filter((room) => ['open', 'joined', 'coming', 'parchasing'].includes(room.status))
  const stats = profile.stats || {}

  return <div className="mx-auto max-w-4xl space-y-6">
    <section className="auth-rise relative overflow-hidden rounded-3xl bg-ink p-4 text-white shadow-[0_28px_70px_-38px_rgba(6,21,16,0.7)] sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-jade/25 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-white/10 font-display text-2xl font-bold text-jade-glow shadow-inner">{initials(profile.name)}</div>
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-jade-glow">Campus Assist member</p><h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{profile.name}</h1><p className="mt-1 truncate text-sm font-medium text-white/65">{profile.email}</p><div className="mt-3 flex flex-wrap gap-2"><span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">{stats.points ?? 0} community points</span>{stats.reviewsCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-100">★ {(stats.ratingSum / stats.reviewsCount).toFixed(1)} helper rating · {stats.reviewsCount} {stats.reviewsCount === 1 ? 'review' : 'reviews'}</span>}</div></div>
      </div>
      <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Coins earned" value={stats.coins ?? 0} icon="✦" />
        <Stat label="Jobs completed" value={stats.completedJobs ?? stats.helped ?? 0} icon="✓" />
        <Stat label="Requests posted" value={stats.requested ?? owned.length} icon="＋" />
        <Stat label="Tips earned" value={`₹${stats.tipsEarned ?? 0}`} icon="₹" />
      </div>
      <p className="relative mt-4 text-xs font-medium text-white/50">Earn 50 coins and 20 community points for each completed request. Posting a request earns 5 community points.</p>
    </section>

    <section className="auth-rise auth-rise-delay-1 rounded-3xl border border-line/80 bg-white p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-jade">Your campus activity</p><h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] text-ink">Rooms and requests</h2></div><Link to="/dashboard" className="text-sm font-semibold text-jade hover:text-jade-deep">Browse lobby →</Link></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><List title="Requests you own" empty="No requests yet. Create one when you need a hand." items={activeOwned}/><List title="Requests you’re helping" empty="Join an open request to help another student." items={activeHelping}/></div>
    </section>
  </div>
}

function Stat({ label, value, icon }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-3.5 backdrop-blur-sm"><div className="flex items-center justify-between gap-2"><p className="text-[0.62rem] font-bold uppercase tracking-wide text-white/60">{label}</p><span className="flex size-7 items-center justify-center rounded-lg bg-jade/25 text-sm font-bold text-jade-glow">{icon}</span></div><p className="mt-2 font-display text-2xl font-bold tracking-[-0.02em] text-white">{value}</p></div>
}

function List({ title, empty, items }) {
  return <div className="rounded-2xl border border-line/70 bg-mist/40 p-4"><h3 className="text-sm font-bold text-ink">{title}<span className="ml-2 text-xs font-semibold text-stone">{items.length}</span></h3>{items.length === 0 ? <p className="mt-3 text-sm font-medium text-stone">{empty}</p> : <ul className="mt-3 space-y-2">{items.map((room) => <li key={room.id}><Link to={`/rooms/${room.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-white px-3 py-2.5 text-sm font-semibold text-jade-deep hover:border-jade/50"><span className="truncate">{room.title}</span><span className="shrink-0 text-[0.65rem] font-bold uppercase text-stone">{statusLabel(room.status)}</span></Link></li>)}</ul>}</div>
}
