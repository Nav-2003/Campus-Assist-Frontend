import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RoomCard from '../components/rooms/RoomCard'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../hooks/useRooms'
import { CATEGORIES } from '../lib/rooms'

const FILTERS = [
  { id: 'live', label: 'Live now' },
  { id: 'mine', label: 'My rooms' },
  { id: 'helping', label: 'Helping' },
  { id: 'helpedBy', label: 'Helped by' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const { rooms, views: roomViews } = useRooms()
  const [filter, setFilter] = useState('live')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')

  const stats = useMemo(() => {
    const live = rooms.filter((r) => r.status === 'open')
    const helpers = new Set()
    live.forEach((r) => r.members.filter((m) => m.role === 'helper').forEach((m) => helpers.add(m.userId)))
    return {
      live: live.length,
      helpers: helpers.size,
      tips: live.reduce((sum, r) => sum + (r.tip || 0), 0),
    }
  }, [rooms])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sourceRooms = Object.hasOwn(roomViews, filter) ? roomViews[filter] : rooms
    return sourceRooms.filter((room) => {
      if (filter === 'live' && room.status !== 'open') return false
      if (filter === 'mine' && (room.ownerId !== user.id || room.status !== 'open')) return false
      if (
        filter === 'helping' &&
        (room.status === 'completed' || !room.members.some((m) => m.userId === user.id && m.role === 'helper'))
      ) {
        return false
      }
      if (filter === 'helpedBy' && (room.status === 'completed' || room.ownerId !== user.id || !room.members.some((member) => member.role === 'helper'))) return false
      if (category !== 'all' && room.category !== category && !room.categories?.includes(category)) return false
      if (!q) return true
      return (
        room.title.toLowerCase().includes(q) ||
        room.description.toLowerCase().includes(q) ||
        room.location.toLowerCase().includes(q)
      )
    })
  }, [rooms, roomViews, filter, category, query, user.id])

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="auth-rise relative overflow-hidden rounded-3xl border border-white/10 bg-ink px-4 py-6 text-white shadow-[0_30px_80px_-40px_rgba(6,21,16,0.65)] sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 85% 20%, rgba(18,168,132,0.28), transparent 55%), radial-gradient(ellipse 50% 60% at 10% 90%, rgba(13,122,98,0.22), transparent 50%)',
          }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              Open a room. Help walk in.
            </h1>
            <p className="mt-3 text-sm leading-relaxed font-medium text-white/80 sm:text-base">
              Raise what you need — snacks, printouts, notes, a quick errand.
              Other Nitjsr students see it live, join your room, and the owner
              stays in control.
            </p>
          </div>
          <Link
            to="/raise"
            className="auth-btn-sheen inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-jade px-5 py-3.5 text-sm font-semibold text-white transition-[transform,opacity] hover:bg-jade-deep active:scale-[0.985] lg:w-auto"
          >
            Raise a request
          </Link>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:max-w-lg sm:gap-3">
          <Stat label="Live rooms" value={stats.live} />
          <Stat label="Students in" value={stats.helpers} />
          <Stat label="Tips pool" value={`₹${stats.tips}`} />
        </div>
      </section>

      <section className="auth-rise auth-rise-delay-1 space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${
                  filter === item.id
                    ? 'bg-ink text-white'
                    : 'border border-line bg-white text-stone hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, place, need…"
            className="auth-field w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-stone/50 lg:max-w-xs"
          />
        </div>

        <div className="flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
          <Chip
            active={category === 'all'}
            onClick={() => setCategory('all')}
            label="All kinds"
          />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
              label={`${c.emoji} ${c.label}`}
            />
          ))}
        </div>
      </section>

      <section className="auth-rise auth-rise-delay-2">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/70 px-6 py-16 text-center">
            <p className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
              No rooms here yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-stone">
              Be the first — raise a request and your room appears on everyone’s
              lobby instantly (open another browser tab to try multi-user).
            </p>
            <Link
              to="/raise"
              className="mt-6 inline-flex rounded-xl bg-jade px-5 py-3 text-sm font-semibold text-white hover:bg-jade-deep"
            >
              Create first room
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                currentUserId={user.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 sm:px-4">
      <p className="text-[0.65rem] font-bold tracking-wide text-white/55 uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
        {value}
      </p>
    </div>
  )
}

function Chip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 snap-start rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
        active
          ? 'bg-jade text-white'
          : 'border border-line bg-white text-stone hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
