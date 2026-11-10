import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../hooks/useRooms'
import { initials } from '../lib/rooms'

export default function Profile() {
  const { user } = useAuth()
  const { rooms } = useRooms()

  const owned = rooms.filter((r) => r.ownerId === user.id)
  const helping = rooms.filter(
    (r) =>
      r.members.some((m) => m.userId === user.id && m.role === 'helper') &&
      ['open', 'active'].includes(r.status),
  )
  const fulfilled = owned.filter((r) => r.status === 'fulfilled').length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="auth-rise overflow-hidden rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-ink font-display text-xl font-bold text-jade-glow">
            {initials(user.name)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-[-0.03em] text-ink">
              {user.name}
            </h1>
            <p className="mt-1 text-sm font-semibold text-stone">{user.email}</p>
            <p className="mt-2 text-sm font-medium text-jade-deep">
              Campus helper · {user.stats?.points ?? 0} assist points
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Helped" value={user.stats?.helped ?? 0} />
          <Stat label="Requested" value={user.stats?.requested ?? 0} />
          <Stat label="Tips earned" value={`₹${user.stats?.tipsEarned ?? 0}`} />
          <Stat label="Fulfilled" value={fulfilled} />
        </div>
      </section>

      <section className="auth-rise auth-rise-delay-1 rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink">
          Active involvement
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <List
            title="Rooms you own"
            empty="No open requests yet."
            items={owned.filter((r) => ['open', 'active'].includes(r.status))}
          />
          <List
            title="Rooms you’re helping"
            empty="Join a live room from the lobby."
            items={helping}
          />
        </div>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex text-sm font-semibold text-jade hover:text-jade-deep"
        >
          Browse live lobby →
        </Link>
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-mist px-3 py-3.5">
      <p className="text-[0.65rem] font-bold tracking-wide text-stone uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] text-ink">
        {value}
      </p>
    </div>
  )
}

function List({ title, empty, items }) {
  return (
    <div className="rounded-2xl border border-line/70 p-4">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-stone">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((room) => (
            <li key={room.id}>
              <Link
                to={`/rooms/${room.id}`}
                className="block rounded-lg px-2 py-1.5 text-sm font-semibold text-jade-deep hover:bg-mist"
              >
                {room.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
