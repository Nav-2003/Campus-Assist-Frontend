import { useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryMeta, deleteRoom, initials, statusLabel, urgencyMeta } from '../../lib/rooms'

export default function RoomCard({ room, currentUserId }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const categories = (room.categories?.length ? room.categories : [room.category]).map(categoryMeta)
  const urgency = urgencyMeta(room.urgency)
  const isOwner = room.ownerId === currentUserId
  const isMember = room.members.some((member) => member.userId === currentUserId)
  const helper = room.members.find((member) => member.role === 'helper')
  const live = ['open', 'joined', 'coming', 'parchasing'].includes(room.status)

  async function handleDelete() {
    if (!window.confirm('Delete this request? This cannot be undone.')) return
    setDeleting(true)
    const result = await deleteRoom(room.id)
    setDeleting(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <article className="room-card group relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_12px_40px_-28px_rgba(6,21,16,0.45)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-jade/40 hover:shadow-[0_18px_50px_-24px_rgba(13,122,98,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">{categories.map((item) => <span key={item.id} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${item.tone}`}><span aria-hidden>{item.emoji}</span>{item.label}</span>)}</div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase ${live ? 'text-jade' : 'text-stone'}`}>
          {live && <span className="size-2 rounded-full bg-jade" />}{statusLabel(room.status)}
        </span>
      </div>

      <h3 className="mt-4 font-display text-lg font-bold text-ink sm:text-xl">{room.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-stone">{room.description}</p>

      <div className="mt-4 grid gap-2 text-sm font-semibold text-ink-soft sm:grid-cols-2">
        <p className="truncate"><span className="text-stone">Where · </span>{room.location}</p>
        <p className={urgency.color}><span className="text-stone">Pace · </span>{urgency.label}</p>
        <p><span className="text-stone">Tip · </span>{room.tip > 0 ? `₹${room.tip}` : 'Good karma'}</p>
        <p><span className="text-stone">Joined · </span>{helper ? '1 helper' : '0 helpers'}</p>
        {helper && <p className="truncate"><span className="text-stone">Helper · </span>{helper.name}</p>}
        {helper && <p><span className="text-stone">Trust · </span>{helper.stats?.points ?? 0} pts · {helper.stats?.completedJobs ?? helper.stats?.helped ?? 0} completed</p>}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
        <div className="flex -space-x-2">
          {room.members.slice(0, 5).map((member) => <div key={member.userId} title={member.name} className={`flex size-8 items-center justify-center rounded-full border-2 border-white text-[0.65rem] font-bold ${member.role === 'owner' ? 'bg-ink text-jade-glow' : 'bg-mist-deep text-jade-deep'}`}>{initials(member.name)}</div>)}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isOwner && room.status === 'open' && <>
            <Link to={`/raise?edit=${room.id}`} className="inline-flex items-center rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-ink hover:border-jade">Edit</Link>
            <button type="button" disabled={deleting} onClick={handleDelete} className="inline-flex items-center rounded-xl border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete'}</button>
          </>}
          {helper && (isOwner || isMember) && <Link to={`/rooms/${room.id}#room-chat`} className="auth-btn-sheen inline-flex items-center rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95">Chat</Link>}
          {!isOwner && !isMember && room.status === 'open' && <Link to={`/rooms/${room.id}`} className="auth-btn-sheen inline-flex items-center rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white hover:bg-jade-deep">Join & help</Link>}
          {isOwner && !helper && room.status !== 'open' && <Link to={`/rooms/${room.id}`} className="inline-flex items-center rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">View</Link>}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-right text-xs font-semibold text-rose-700">{error}</p>}
    </article>
  )
}
