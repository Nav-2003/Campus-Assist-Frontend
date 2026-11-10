import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRoom } from '../hooks/useRooms'
import {
  categoryMeta,
  closeRoom,
  initials,
  joinRoom,
  kickMember,
  leaveRoom,
  sendMessage,
  setRoomLocked,
  statusLabel,
  urgencyMeta,
} from '../lib/rooms'

export default function Room() {
  const { roomId } = useParams()
  const { user, refresh: refreshAuth } = useAuth()
  const { room, refresh } = useRoom(roomId)
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const chatEnd = useRef(null)

  const isOwner = room?.ownerId === user.id
  const membership = room?.members.find((m) => m.userId === user.id)
  const isMember = Boolean(membership)
  const isOpen = room && ['open', 'active'].includes(room.status)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room?.messages?.length])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  function run(action, successMessage) {
    setBusy(true)
    const result = action()
    setBusy(false)
    refresh()
    refreshAuth()
    if (!result.ok) {
      flash(result.error)
      return false
    }
    if (successMessage) flash(successMessage)
    return true
  }

  function handleJoin() {
    run(() => joinRoom(room.id, user), 'You’re in the room.')
  }

  function handleLeave() {
    if (run(() => leaveRoom(room.id, user.id), 'Left room.')) {
      navigate('/dashboard')
    }
  }

  function handleKick(targetId) {
    run(() => kickMember(room.id, user.id, targetId), 'Helper removed.')
  }

  function handleLockToggle() {
    run(
      () => setRoomLocked(room.id, user.id, !room.locked),
      room.locked ? 'Room unlocked.' : 'Room locked.',
    )
  }

  function handleClose(fulfilled) {
    if (
      run(
        () => closeRoom(room.id, user.id, fulfilled),
        fulfilled ? 'Marked fulfilled.' : 'Room closed.',
      )
    ) {
      // stay on page so owner sees final state
    }
  }

  function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()) return
    const result = sendMessage(room.id, user, draft)
    if (!result.ok) {
      flash(result.error)
      return
    }
    setDraft('')
    refresh()
  }

  if (!room) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
        <p className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          Room not found
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-flex text-sm font-semibold text-jade hover:text-jade-deep"
        >
          Back to lobby
        </Link>
      </div>
    )
  }

  const category = categoryMeta(room.category)
  const urgency = urgencyMeta(room.urgency)

  return (
    <div className="space-y-6">
      <div className="auth-rise flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="text-sm font-semibold text-stone transition-colors hover:text-jade-deep"
        >
          ← Lobby
        </Link>
        {notice ? (
          <p className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-jade-glow">
            {notice}
          </p>
        ) : null}
      </div>

      <section className="auth-rise auth-rise-delay-1 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-line/80 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${category.tone}`}
            >
              <span aria-hidden>{category.emoji}</span>
              {category.label}
            </span>
            <span
              className={`text-xs font-bold tracking-wide uppercase ${
                isOpen ? 'text-jade' : 'text-stone'
              }`}
            >
              {statusLabel(room.status)}
              {room.locked ? ' · locked' : ''}
            </span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.03em] text-ink">
            {room.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed font-medium text-stone sm:text-base">
            {room.description}
          </p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <Meta label="Location" value={room.location} />
            <Meta label="Urgency" value={urgency.label} />
            <Meta
              label="Tip"
              value={room.tip > 0 ? `₹${room.tip}` : 'Good karma'}
            />
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {!isMember && isOpen ? (
              <button
                type="button"
                disabled={busy || room.locked}
                onClick={handleJoin}
                className="auth-btn-sheen rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white hover:bg-jade-deep disabled:opacity-55"
              >
                {room.locked ? 'Locked by owner' : 'Enter room & help'}
              </button>
            ) : null}

            {isMember && !isOwner && isOpen ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleLeave}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-stone hover:border-rose-300 hover:text-rose-700"
              >
                Leave room
              </button>
            ) : null}

            {isOwner && isOpen ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleLockToggle}
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-jade"
                >
                  {room.locked ? 'Unlock joining' : 'Lock joining'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleClose(true)}
                  className="auth-btn-sheen rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white hover:bg-jade-deep"
                >
                  Mark fulfilled
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleClose(false)}
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-stone hover:border-rose-300 hover:text-rose-700"
                >
                  Close room
                </button>
              </>
            ) : null}
          </div>
        </div>

        <aside className="rounded-3xl border border-line/80 bg-white p-6">
          <h2 className="font-display text-lg font-bold tracking-[-0.02em] text-ink">
            In the room
          </h2>
          <ul className="mt-4 space-y-3">
            {room.members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-3 rounded-xl border border-line/70 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-full text-xs font-bold ${
                      m.role === 'owner'
                        ? 'bg-ink text-jade-glow'
                        : 'bg-mist-deep text-jade-deep'
                    }`}
                  >
                    {initials(m.name)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {m.name}
                      {m.userId === user.id ? ' · you' : ''}
                    </p>
                    <p className="text-xs font-semibold tracking-wide text-stone uppercase">
                      {m.role === 'owner' ? 'Owner' : 'Helper'}
                    </p>
                  </div>
                </div>
                {isOwner && m.role !== 'owner' && isOpen ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleKick(m.userId)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-bold tracking-wide text-rose-700 uppercase hover:bg-rose-50"
                  >
                    Throw
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {isOwner ? (
            <p className="mt-4 text-xs leading-relaxed font-medium text-stone">
              Owner privilege: throw helpers out, lock new joins, or close the
              room when you’re done.
            </p>
          ) : null}
        </aside>
      </section>

      <section className="auth-rise auth-rise-delay-2 overflow-hidden rounded-3xl border border-line/80 bg-white">
        <div className="border-b border-line/70 px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-bold tracking-[-0.02em] text-ink">
            Room chat
          </h2>
          <p className="text-xs font-medium text-stone">
            Coordinate pickup, timing, and details here.
          </p>
        </div>

        <div className="flex h-[22rem] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
            {room.messages.map((msg) =>
              msg.type === 'system' ? (
                <p
                  key={msg.id}
                  className="text-center text-xs font-semibold text-stone/80"
                >
                  {msg.text}
                </p>
              ) : (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.userId === user.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[70%] ${
                      msg.userId === user.id
                        ? 'bg-jade text-white'
                        : 'bg-mist text-ink'
                    }`}
                  >
                    <p
                      className={`text-[0.65rem] font-bold tracking-wide uppercase ${
                        msg.userId === user.id
                          ? 'text-white/75'
                          : 'text-stone'
                      }`}
                    >
                      {msg.name}
                    </p>
                    <p className="mt-0.5 text-sm font-medium leading-snug">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ),
            )}
            <div ref={chatEnd} />
          </div>

          {isMember && isOpen ? (
            <form
              onSubmit={handleSend}
              className="flex gap-2 border-t border-line/70 px-4 py-3 sm:px-5"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message the room…"
                className="auth-field flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-stone/50"
              />
              <button
                type="submit"
                className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Send
              </button>
            </form>
          ) : (
            <p className="border-t border-line/70 px-5 py-3 text-sm font-medium text-stone">
              {isMember
                ? 'This room is closed.'
                : 'Join the room to chat with helpers.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div className="rounded-xl bg-mist px-3.5 py-3">
      <dt className="text-[0.65rem] font-bold tracking-wide text-stone uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-ink">{value}</dd>
    </div>
  )
}
