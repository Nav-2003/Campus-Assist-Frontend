import { Link } from 'react-router-dom'
import {
  categoryMeta,
  initials,
  statusLabel,
  urgencyMeta,
} from '../../lib/rooms'

export default function RoomCard({ room, currentUserId }) {
  const category = categoryMeta(room.category)
  const urgency = urgencyMeta(room.urgency)
  const isOwner = room.ownerId === currentUserId
  const isMember = room.members.some((m) => m.userId === currentUserId)
  const live = room.status === 'open' || room.status === 'active'

  return (
    <article className="room-card group relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_12px_40px_-28px_rgba(6,21,16,0.45)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-jade/40 hover:shadow-[0_18px_50px_-24px_rgba(13,122,98,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${category.tone}`}
          >
            <span aria-hidden>{category.emoji}</span>
            {category.label}
          </span>
          {room.locked ? (
            <span className="rounded-lg bg-ink/5 px-2 py-1 text-[0.65rem] font-bold tracking-wide text-stone uppercase">
              Locked
            </span>
          ) : null}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase ${
            live ? 'text-jade' : 'text-stone'
          }`}
        >
          {live ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade-glow opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-jade" />
            </span>
          ) : null}
          {statusLabel(room.status)}
        </span>
      </div>

      <h3 className="mt-4 font-display text-lg font-bold tracking-[-0.02em] text-ink sm:text-xl">
        {room.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed font-medium text-stone">
        {room.description}
      </p>

      <div className="mt-4 grid gap-2 text-sm font-semibold text-ink-soft sm:grid-cols-2">
        <p className="truncate">
          <span className="text-stone">Where · </span>
          {room.location}
        </p>
        <p className={urgency.color}>
          <span className="text-stone">Pace · </span>
          {urgency.label}
        </p>
        <p>
          <span className="text-stone">Tip · </span>
          {room.tip > 0 ? `₹${room.tip}` : 'Good karma'}
        </p>
        <p>
          <span className="text-stone">Joined · </span>
          {room.members.length} joined
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
        <div className="flex -space-x-2">
          {room.members.slice(0, 5).map((m) => (
            <div
              key={m.userId}
              title={m.name}
              className={`flex size-8 items-center justify-center rounded-full border-2 border-white text-[0.65rem] font-bold ${
                m.role === 'owner'
                  ? 'bg-ink text-jade-glow'
                  : 'bg-mist-deep text-jade-deep'
              }`}
            >
              {initials(m.name)}
            </div>
          ))}
          {room.members.length > 5 ? (
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-line text-[0.65rem] font-bold text-stone">
              +{room.members.length - 5}
            </div>
          ) : null}
        </div>

        <Link
          to={`/rooms/${room.id}`}
          className={`auth-btn-sheen inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-[transform,opacity] active:scale-[0.98] ${
            isMember || isOwner
              ? 'bg-ink hover:opacity-95'
              : 'bg-jade hover:bg-jade-deep'
          }`}
        >
          {isOwner ? 'Manage' : isMember ? 'Enter room' : 'Join & help'}
        </Link>
      </div>
    </article>
  )
}
