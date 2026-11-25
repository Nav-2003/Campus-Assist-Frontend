import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRoom } from '../hooks/useRooms'
import LiveTrackingMap from '../components/rooms/LiveTrackingMap'
import ReviewPanel from '../components/rooms/ReviewPanel'
import { categoryMeta, deleteRoom, fetchTicketTracking, initials, joinRoom, postRoomMessage, shareTicketLocation, statusLabel, stopTicketLocation, updateRoomStatus, urgencyMeta } from '../lib/rooms'

export default function Room() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const { room, refresh } = useRoom(roomId)
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [tracking, setTracking] = useState([])
  const [sharingLocation, setSharingLocation] = useState(false)
  const [trackingError, setTrackingError] = useState('')
  const [trackingFetchError, setTrackingFetchError] = useState('')
  const chatEnd = useRef(null)
  const watchId = useRef(null)
  const heartbeatId = useRef(null)
  const lastPosition = useRef(null)
  const lastLocationSentAt = useRef(0)
  const sharingRef = useRef(false)

  const isOwner = room?.ownerId === user.id
  const helper = room?.members.find((member) => member.role === 'helper')
  const isHelper = helper?.userId === user.id
  const isOpen = room?.status === 'open'
  const canChat = Boolean(helper && (isOwner || isHelper)) && !['completed', 'cancelled'].includes(room?.status)
  const canTrack = Boolean(helper && (isOwner || isHelper)) && ['joined', 'coming', 'parchasing'].includes(room?.status)
  sharingRef.current = sharingLocation

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [room?.messages?.length])
  useEffect(() => {
    const timer = window.setInterval(async () => {
      const { fetchRooms } = await import('../lib/rooms')
      await fetchRooms()
      refresh()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    if (!canTrack || !roomId) return undefined
    let active = true
    const loadTracking = async () => {
      const result = await fetchTicketTracking(roomId)
      if (!active) return
      if (!result.ok) { setTrackingFetchError(result.error); return }
      setTrackingFetchError('')
      const locations = result.tracking.map((entry) => ({
        ...entry,
        role: entry.userId === room.ownerId ? 'requester' : 'helper',
      }))
      setTracking(locations)
    }
    loadTracking()
    const timer = window.setInterval(loadTracking, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [canTrack, roomId, room?.ownerId, user.id])

  useEffect(() => {
    if (isHelper && room?.status === 'coming' && sessionStorage.getItem(`ca_location_consent_${roomId}`) === 'yes' && watchId.current === null) {
      startSharingLocation()
    }
  }, [isHelper, room?.status, roomId])

  useEffect(() => {
    if (canTrack || !sharingLocation || !roomId) return
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    if (heartbeatId.current !== null) window.clearInterval(heartbeatId.current)
    heartbeatId.current = null
    setSharingLocation(false)
    sessionStorage.removeItem(`ca_location_consent_${roomId}`)
    void stopTicketLocation(roomId)
  }, [canTrack, sharingLocation, roomId])

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current)
    if (heartbeatId.current !== null) window.clearInterval(heartbeatId.current)
    if (sharingRef.current) void stopTicketLocation(roomId)
  }, [roomId])

  async function act(action, successMessage) {
    setBusy(true)
    try {
      const result = await action()
      refresh()
      if (!result.ok) { setNotice(result.error); return }
      setNotice(successMessage)
      window.setTimeout(() => setNotice(''), 2500)
      if (successMessage.toLowerCase().includes('joined')) {
        window.setTimeout(() => document.getElementById('room-chat')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
      }
    } catch {
      setNotice('Could not update this request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function markComing() {
    const result = await updateRoomStatus(room.id, 'Coming')
    if (result.ok) {
      sessionStorage.setItem(`ca_location_consent_${roomId}`, 'yes')
      startSharingLocation()
    }
    return result
  }

  async function send(e) {
    e.preventDefault()
    const message = draft.trim()
    if (!message || sending || !room) return
    setSending(true)
    try {
      const result = await postRoomMessage(room.id, message)
      if (!result.ok) { setNotice(result.error); return }
      setDraft('')
      setNotice('Message sent')
      refresh()
      window.setTimeout(() => setNotice(''), 1800)
    } catch {
      setNotice('Could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function reportPosition(position) {
    lastPosition.current = position
    const now = Date.now()
    if (now - lastLocationSentAt.current < 5000 || !room) return
    lastLocationSentAt.current = now
    const payload = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }
    const result = await shareTicketLocation(room.id, payload)
    if (!result.ok) {
      setTrackingError(result.error)
      return
    }
    setTrackingError('')
    setTracking((current) => {
      const next = current.filter((entry) => entry.userId !== user.id)
      return [...next, { ...payload, userId: user.id, name: user.name, role: isOwner ? 'owner' : 'helper', updatedAt: new Date().toISOString() }]
    })
  }

  function startSharingLocation() {
    if (watchId.current !== null) return
    if (!navigator.geolocation) {
      setTrackingError('This browser does not support GPS sharing. Try the latest Safari or Chrome.')
      return
    }
    if (!window.isSecureContext) {
      setTrackingError('GPS is blocked on this address. On your phone, open Campus Assist over HTTPS; localhost only works on the device running the server.')
      return
    }
    setTrackingError('Waiting for your GPS location…')
    setSharingLocation(true)
    lastLocationSentAt.current = 0
    watchId.current = navigator.geolocation.watchPosition(
      reportPosition,
      (error) => {
        setTrackingError(error.code === 1 ? 'Allow location access in your browser to share your position.' : error.code === 3 ? 'GPS is taking too long. Move outdoors or check that location services are on, then try again.' : 'Could not get your location. Check GPS and try again.')
        setSharingLocation(false)
        sessionStorage.removeItem(`ca_location_consent_${roomId}`)
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
        if (heartbeatId.current !== null) window.clearInterval(heartbeatId.current)
        heartbeatId.current = null
        void stopTicketLocation(roomId)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    )
    heartbeatId.current = window.setInterval(() => {
      if (lastPosition.current) void reportPosition(lastPosition.current)
    }, 25000)
  }

  async function stopSharingLocation() {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    if (heartbeatId.current !== null) window.clearInterval(heartbeatId.current)
    heartbeatId.current = null
    lastPosition.current = null
    setSharingLocation(false)
    sessionStorage.removeItem(`ca_location_consent_${roomId}`)
    const result = await stopTicketLocation(roomId)
    setTracking((current) => current.filter((entry) => entry.userId !== user.id))
    if (!result.ok) setTrackingError(result.error)
    else setTrackingError('Location sharing stopped.')
  }

  if (!room) return <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center"><p className="font-display text-2xl font-bold text-ink">Room not found</p><Link to="/dashboard" className="mt-4 inline-flex text-sm font-semibold text-jade">Back to lobby</Link></div>

  const categories = (room.categories?.length ? room.categories : [room.category]).map(categoryMeta)
  const urgency = urgencyMeta(room.urgency)
  const chatMessages = room.messages.filter((message) => message.type === 'chat')
  const requester = room.members.find((member) => member.role === 'owner')

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/dashboard" className="text-sm font-semibold text-stone hover:text-jade-deep">← Lobby</Link>{notice && <p role="status" className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-jade-glow">{notice}</p>}</div>
    <section className="grid min-w-0 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
      <div className="min-w-0 rounded-3xl border border-line/80 bg-white p-4 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">{categories.map((category) => <span key={category.id} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${category.tone}`}>{category.emoji} {category.label}</span>)}<span className="text-xs font-bold uppercase text-jade">{statusLabel(room.status)}</span></div>
        <h1 className="mt-4 break-words font-display text-2xl font-bold text-ink sm:text-3xl">{room.title}</h1><p className="mt-3 text-sm leading-relaxed text-stone">{room.description}</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2"><Meta label="Location" value={room.location}/><Meta label="Urgency" value={urgency.label}/><Meta label="Tip" value={room.tip > 0 ? `₹${room.tip}` : 'Good karma'}/></dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {!isOwner && isOpen && <button type="button" disabled={busy} onClick={() => act(() => joinRoom(room.id), 'You joined this request.')} className="rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Join & help</button>}
          {isOwner && isOpen && <><button type="button" disabled={busy} onClick={async () => { const result = await deleteRoom(room.id); if (result.ok) navigate('/dashboard'); else setNotice(result.error) }} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-rose-700">Delete request</button><Link to={`/raise?edit=${room.id}`} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink">Edit request</Link></>}
          {isOwner && helper && ['joined', 'coming'].includes(room.status) && <button type="button" disabled={busy} onClick={() => act(() => updateRoomStatus(room.id, 'Cancelled'), 'Helper released; request is open again.')} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-rose-700">Cancel helper</button>}
          {isHelper && room.status === 'joined' && <button type="button" disabled={busy} onClick={() => act(markComing, 'Marked as coming. Allow location access to share your live position.')} className="rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white">Mark Coming</button>}
          {isHelper && ['joined', 'coming'].includes(room.status) && <button type="button" disabled={busy} onClick={() => act(() => updateRoomStatus(room.id, 'Parchasing'), 'Status updated to Parchasing.')} className="rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white">Mark Parchasing</button>}
          {isHelper && room.status === 'parchasing' && <button type="button" disabled={busy} onClick={() => act(() => updateRoomStatus(room.id, 'Completed'), 'Request completed. You earned 50 coins.')} className="rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white">Mark Completed</button>}
          {isHelper && ['joined', 'coming', 'parchasing'].includes(room.status) && <button type="button" disabled={busy} onClick={() => act(() => updateRoomStatus(room.id, 'Cancelled'), 'You cancelled; request is open again.')} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-rose-700">Cancel request</button>}
        </div>
        {room.status === 'parchasing' && isOwner && <p className="mt-4 text-sm font-semibold text-stone">Purchasing has started. You can no longer cancel or delete this request; the helper can still cancel if needed.</p>}
      </div>

        <aside className="min-w-0 rounded-3xl border border-line/80 bg-white p-4 sm:p-6"><h2 className="font-display text-lg font-bold text-ink">People in this request <span className="text-sm font-semibold text-stone">({room.members.length})</span></h2><p className="mt-1 text-xs font-semibold text-stone">{helper ? '1 assigned helper' : 'No helper yet'}</p><ul className="mt-4 space-y-3">{room.members.map((member) => <li key={member.userId} className="flex items-center gap-3 rounded-xl border border-line/70 px-3 py-2.5"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mist-deep text-xs font-bold text-jade-deep">{initials(member.name)}</div><div className="min-w-0"><p className="text-sm font-bold text-ink">{member.name}{member.userId === user.id ? ' · you' : ''}</p><p className="text-xs font-semibold uppercase text-stone">{member.role}</p>{member.phoneNo && <a href={`tel:${member.phoneNo}`} className="mt-1 inline-flex min-h-10 items-center text-xs font-semibold text-jade-deep hover:underline">{member.phoneNo}</a>}{member.role === 'helper' && <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-amber-50 px-2 py-1 text-[0.65rem] font-bold text-amber-800">✦ {member.stats?.points ?? 0} community pts</span><span className="rounded-full bg-jade/10 px-2 py-1 text-[0.65rem] font-bold text-jade-deep">✓ {member.stats?.completedJobs ?? member.stats?.helped ?? 0} completed</span>{member.stats?.reviewsCount > 0 && <span className="rounded-full bg-amber-50 px-2 py-1 text-[0.65rem] font-bold text-amber-800">★ {(member.stats.ratingSum / member.stats.reviewsCount).toFixed(1)} ({member.stats.reviewsCount})</span>}</div>}</div></li>)}</ul>{helper && isOwner && <button type="button" onClick={() => document.getElementById('room-chat')?.scrollIntoView({ behavior: 'smooth' })} className="mt-4 min-h-11 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Chat with {helper.name}</button>}</aside>
    </section>

    {isOwner && room.status === 'completed' && <ReviewPanel room={room} onSubmitted={refresh} />}

    {canTrack && <section className="overflow-hidden rounded-3xl border border-line/80 bg-white shadow-[0_18px_55px_-38px_rgba(6,21,16,0.45)]">
      <div className="flex flex-col gap-4 border-b border-line/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-jade">Ticket tracking</p><h2 className="mt-1 font-display text-xl font-bold text-ink">Live location map</h2><p className="mt-1 text-sm text-stone">The helper starts sharing when they mark Coming. Keep this page open for live updates; either person can also share manually.</p></div>
        <button type="button" onClick={sharingLocation ? stopSharingLocation : startSharingLocation} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${sharingLocation ? 'bg-rose-600 hover:bg-rose-700' : 'bg-jade hover:bg-jade-deep'}`}><span className={`size-2 rounded-full ${sharingLocation ? 'animate-pulse bg-white' : 'bg-jade-glow'}`}/>{sharingLocation ? 'Stop sharing' : 'Share my location'}</button>
      </div>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-stone">Your location is shared only with the other participant on this ticket. You can stop sharing at any time.</p><p className="text-xs font-bold text-jade-deep">{tracking.length ? `${tracking.length} sharing · updated ${new Date(Math.max(...tracking.map((entry) => new Date(entry.updatedAt).getTime()))).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Waiting for a live location'}</p></div>
        {(trackingError || trackingFetchError) && <p role="status" className="rounded-xl bg-mist px-3 py-2 text-sm font-medium text-stone">{trackingError || trackingFetchError}</p>}
        <LiveTrackingMap locations={tracking}/>
      </div>
    </section>}

    {canChat && <section id="room-chat" className="overflow-hidden rounded-3xl border border-jade/15 bg-white shadow-[0_24px_70px_-44px_rgba(6,21,16,0.45)]">
      <div className="flex items-center gap-3 border-b border-line/70 bg-gradient-to-r from-mist to-white px-5 py-4 sm:px-6"><div className="flex size-10 items-center justify-center rounded-full bg-jade text-sm font-bold text-white">{initials(isOwner ? helper?.name : requester?.name)}</div><div><h2 className="font-display text-base font-bold text-ink">{isOwner ? helper?.name : requester?.name}</h2><p className="text-xs font-medium text-stone">Private request chat</p></div><span className="ml-auto rounded-full bg-jade/10 px-3 py-1 text-[0.7rem] font-bold text-jade-deep">{chatMessages.length} messages</span></div>
      <div className="flex h-[min(26rem,60dvh)] min-h-64 flex-col bg-gradient-to-b from-mist/50 to-white sm:h-[26rem]"><div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {chatMessages.map((message, index) => {
          const mine = message.userId === user.id
          const showName = index === 0 || chatMessages[index - 1].userId !== message.userId
          return <div key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
            {!mine && <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mist-deep text-[0.6rem] font-bold text-jade-deep">{initials(message.name)}</div>}
            <div className="max-w-[82%] sm:max-w-[70%]">{showName && <p className={`mb-1 px-1 text-[0.65rem] font-bold tracking-wide text-stone ${mine ? 'text-right' : ''}`}>{mine ? 'You' : message.name}</p>}<div className={`rounded-2xl px-4 py-2.5 shadow-sm ${mine ? 'rounded-br-md bg-jade text-white' : 'rounded-bl-md border border-line/70 bg-white text-ink'}`}><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p><p className={`mt-1 text-right text-[0.6rem] font-medium ${mine ? 'text-white/65' : 'text-stone/70'}`}>{Number.isFinite(message.createdAt) ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</p></div></div>
            {mine && <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[0.6rem] font-bold text-jade-glow">{initials(user.name)}</div>}
          </div>
        })}
        {chatMessages.length === 0 && <div className="grid h-full place-items-center text-center"><div><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-jade/10 text-xl">✦</div><p className="mt-3 text-sm font-bold text-ink">Start the conversation</p><p className="mt-1 text-xs text-stone">Coordinate pickup, timing, and details here.</p></div></div>}
        <div ref={chatEnd}/>
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line/70 bg-white/90 px-3 py-3 sm:px-5"><textarea rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" maxLength={500} className="max-h-24 min-h-11 flex-1 resize-y rounded-2xl border border-line bg-mist/60 px-4 py-3 text-sm outline-none transition focus:border-jade focus:bg-white"/><button type="submit" disabled={!draft.trim() || sending} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-jade px-5 text-sm font-bold text-white shadow-sm transition hover:bg-jade-deep disabled:cursor-not-allowed disabled:opacity-45">{sending ? 'Sending…' : 'Send'} <span aria-hidden>↑</span></button></form>
      </div>
    </section>}
  </div>
}

function Meta({ label, value }) { return <div className="rounded-xl bg-mist px-3.5 py-3"><dt className="text-[0.65rem] font-bold uppercase text-stone">{label}</dt><dd className="mt-1 text-sm font-bold text-ink">{value}</dd></div> }
