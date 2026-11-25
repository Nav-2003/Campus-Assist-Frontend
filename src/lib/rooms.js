import { authenticatedFetch, DEMO_ACCOUNTS, getAccessToken, getUserById, updateUserStats } from './auth'
import { readJson, writeJson, uid } from './storage'

const ROOMS_KEY = 'ca_rooms'
const ROOM_VIEWS_KEY = 'ca_room_views'
const DEMO_ROOM_ID = 'room_demo_print'

export const CATEGORIES = [
  { id: 'food', label: 'Food & canteen', emoji: '🍜', tone: 'bg-amber-100 text-amber-900' },
  { id: 'print', label: 'Print & stationery', emoji: '🖨️', tone: 'bg-sky-100 text-sky-900' },
  { id: 'notes', label: 'Notes & study', emoji: '📚', tone: 'bg-violet-100 text-violet-900' },
  { id: 'medicine', label: 'Medicine / first aid', emoji: '💊', tone: 'bg-rose-100 text-rose-900' },
  { id: 'errand', label: 'Campus errand', emoji: '🏃', tone: 'bg-jade/15 text-jade-deep' },
  { id: 'ride', label: 'Ride / drop', emoji: '🛵', tone: 'bg-orange-100 text-orange-900' },
  { id: 'other', label: 'Other favour', emoji: '✨', tone: 'bg-mist-deep text-stone' },
]

export const URGENCY = [
  { id: 'low', label: 'Whenever', color: 'text-stone' },
  { id: 'normal', label: 'Soon', color: 'text-jade-deep' },
  { id: 'urgent', label: 'Urgent', color: 'text-rose-700' },
]

function getRooms() {
  return readJson(ROOMS_KEY, [])
}

function saveRooms(rooms) {
  writeJson(ROOMS_KEY, rooms)
}

export function listRooms() {
  return getRooms()
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function listRoomViews() {
  return readJson(ROOM_VIEWS_KEY, {})
}

/** Seeds one open lobby room so explore accounts have something to join. */
export function ensureDemoRoom() {
  const rooms = getRooms()
  if (rooms.some((r) => r.id === DEMO_ROOM_ID)) return

  const owner =
    getUserById(DEMO_ACCOUNTS[0].id) || {
      id: DEMO_ACCOUNTS[0].id,
      name: DEMO_ACCOUNTS[0].name,
      email: DEMO_ACCOUNTS[0].email,
    }

  const now = Date.now()
  const room = {
    id: DEMO_ROOM_ID,
    ownerId: owner.id,
    title: 'Need 10 pages printed near Library',
    description:
      'Assignment printout before 4 PM. Black & white is fine. Happy to tip for the walk.',
    location: 'Central Library entrance',
    tip: 30,
    category: 'print',
    urgency: 'urgent',
    status: 'open',
    locked: false,
    members: [
      {
        userId: owner.id,
        name: owner.name,
        email: owner.email,
        role: 'owner',
        joinedAt: now,
      },
    ],
    bannedIds: [],
    messages: [
      {
        id: 'msg_demo_system',
        userId: 'system',
        name: 'Campus Assist',
        text: `${owner.name} opened this request room.`,
        type: 'system',
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  saveRooms([room, ...rooms])
}

export function getRoom(id) {
  return getRooms().find((r) => r.id === id) || null
}

function normalizeApiRoom(apiRoom) {
  const owner = apiRoom.createdBy || {}
  const ownerId = String(owner._id || owner.id || apiRoom.createdBy || '')
  const categoryLabels = Array.isArray(apiRoom.categories) && apiRoom.categories.length ? apiRoom.categories : [apiRoom.category]
  const categories = categoryLabels.map((label) => CATEGORIES.find((item) => item.label === label)?.id).filter(Boolean)
  const category = categories[0] || CATEGORIES.find((item) => item.label === apiRoom.category)?.id || 'other'
  const urgency = URGENCY.find((item) => item.label === apiRoom.urgency)?.id || 'normal'
  const statusMap = {
    Open: 'open',
    Joined: 'joined',
    Coming: 'coming',
    Parchasing: 'parchasing',
    Completed: 'completed',
    Cancelled: 'cancelled',
  }
  const createdAt = apiRoom.createdAt ? new Date(apiRoom.createdAt).getTime() : Date.now()

  return {
    id: String(apiRoom._id || apiRoom.id),
    ownerId,
    title: apiRoom.title,
    description: apiRoom.description,
    location: apiRoom.address,
    tip: apiRoom.tip || 0,
    category,
    categories: categories.length ? categories : [category],
    urgency,
    status: statusMap[apiRoom.status] || 'open',
    locked: false,
    members: [
      {
        userId: ownerId,
        name: owner.name || 'Student',
        email: owner.email || '',
        phoneNo: owner.phoneNo || '',
        role: 'owner',
        joinedAt: createdAt,
      },
      ...(apiRoom.helpBy ? [{ userId: String(apiRoom.helpBy._id || apiRoom.helpBy), name: apiRoom.helpBy.name || 'Helper', email: apiRoom.helpBy.email || '', phoneNo: apiRoom.helpBy.phoneNo || '', stats: apiRoom.helpBy.stats || {}, role: 'helper', joinedAt: createdAt }] : []),
    ],
    bannedIds: [],
    messages: [
      {
        id: `msg_${String(apiRoom._id || apiRoom.id)}`,
        userId: 'system',
        name: 'Campus Assist',
        text: `${owner.name || 'Student'} opened this request room.`,
        type: 'system',
        createdAt,
      },
      ...(apiRoom.messages || []).map((m, i) => ({ id: String(m._id || i), userId: String(m.sender?._id || m.sender || ''), name: m.name, text: m.text, type: 'chat', createdAt: new Date(m.createdAt).getTime() })),
    ],
    createdAt,
    updatedAt: apiRoom.updatedAt ? new Date(apiRoom.updatedAt).getTime() : createdAt,
    review: apiRoom.review?.rating ? { rating: apiRoom.review.rating, feedback: apiRoom.review.feedback || '', createdAt: apiRoom.review.createdAt ? new Date(apiRoom.review.createdAt).getTime() : null } : null,
  }
}

export async function fetchRooms() {
  const token = getAccessToken()
  if (!token) return { ok: false, error: 'Your session has expired. Please sign in again.' }

  try {
    const response = await authenticatedFetch('/api/room/fetch/fetchRoomData')
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { ok: false, error: data.message || 'Could not load rooms.' }
    }

    const rooms = Array.isArray(data.rooms) ? data.rooms.map(normalizeApiRoom) : []
    const roomViews = Object.fromEntries(Object.entries(data.roomViews || {}).map(([key, items]) => [key, Array.isArray(items) ? items.map(normalizeApiRoom) : []]))
    saveRooms(rooms)
    writeJson(ROOM_VIEWS_KEY, roomViews)
    return { ok: true, rooms }
  } catch (error) {
    console.error('Fetch rooms request failed:', error)
    return { ok: false, error: 'Unable to reach the server. Please try again.' }
  }
}

function normalizeRoom(apiRoom) {
  return normalizeApiRoom(apiRoom)
}

async function roomRequest(roomId, path, { method = 'PATCH', body } = {}) {
  const token = getAccessToken()
  if (!token) return { ok: false, error: 'Your session has expired. Please sign in again.' }
  try {
    const response = await authenticatedFetch(`/api/room/joinroom/${roomId}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return { ok: false, error: data.message || 'Could not update this room.' }
    if (data.room) {
      const room = normalizeRoom(data.room)
      saveRooms([room, ...getRooms().filter((item) => item.id !== room.id)])
      await fetchRooms()
      return { ok: true, room }
    }
    if (method === 'DELETE') {
      saveRooms(getRooms().filter((item) => item.id !== roomId))
      await fetchRooms()
    }
    return { ok: true }
  } catch (error) {
    console.error('Room request failed:', error)
    return { ok: false, error: 'Unable to reach the server. Please try again.' }
  }
}

export async function joinRoom(roomId) {
  const token = getAccessToken()
  try {
    const response = await authenticatedFetch('/api/room/joinroom/joinAndHelp', {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return { ok: false, error: data.message || 'Could not join this room.' }
    const room = normalizeRoom(data.room)
    saveRooms([room, ...getRooms().filter((item) => item.id !== room.id)])
    await fetchRooms()
    return { ok: true, room }
  } catch { return { ok: false, error: 'Unable to reach the server. Please try again.' } }
}

export function updateRoomStatus(roomId, status) {
  return roomRequest(roomId, '/status', { body: { status } })
}

export function postRoomMessage(roomId, text) {
  return roomRequest(roomId, '/messages', { method: 'POST', body: { text } })
}

export function submitRoomReview(roomId, rating, feedback) {
  return roomRequest(roomId, '/review', { method: 'POST', body: { rating, feedback } })
}

export async function fetchTicketTracking(roomId) {
  try {
    const response = await authenticatedFetch(`/api/room/joinroom/${roomId}/tracking`)
    const data = await response.json().catch(() => ({}))
    return response.ok ? { ok: true, tracking: data.tracking || [] } : { ok: false, error: data.message || 'Could not load live tracking.' }
  } catch {
    return { ok: false, error: 'Unable to load live tracking.' }
  }
}

export async function shareTicketLocation(roomId, location) {
  try {
    const response = await authenticatedFetch(`/api/room/joinroom/${roomId}/tracking`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    })
    const data = await response.json().catch(() => ({}))
    return response.ok ? { ok: true } : { ok: false, error: data.message || `Could not share your location (HTTP ${response.status}).` }
  } catch {
    return { ok: false, error: 'Unable to share your location.' }
  }
}

export async function stopTicketLocation(roomId) {
  try {
    const response = await authenticatedFetch(`/api/room/joinroom/${roomId}/tracking`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    return response.ok ? { ok: true } : { ok: false, error: data.message || 'Could not stop location sharing.' }
  } catch {
    return { ok: false, error: 'Unable to stop location sharing.' }
  }
}

export function deleteRoom(roomId) {
  return roomRequest(roomId, '', { method: 'DELETE' })
}

export async function editRoom(roomId, payload) {
  const selected = Array.isArray(payload.categories) && payload.categories.length ? payload.categories : [payload.category]
  const categoryLabels = selected.map((id) => CATEGORIES.find((item) => item.id === id)?.label).filter(Boolean)
  const category = categoryLabels[0] || 'Other favour'
  const urgency = URGENCY.find((item) => item.id === payload.urgency)?.label || 'Soon'
  return roomRequest(roomId, '', { method: 'PATCH', body: { title: payload.title, description: payload.description, address: payload.location, tip: Number(payload.tip) || 0, category, categories: categoryLabels, urgency } })
}

function patchRoom(id, updater) {
  const rooms = getRooms()
  const index = rooms.findIndex((r) => r.id === id)
  if (index === -1) return { ok: false, error: 'Room not found.' }
  const next = updater(rooms[index])
  if (next?.ok === false) return next
  rooms[index] = next.room
  saveRooms(rooms)
  return { ok: true, room: next.room }
}

function systemMessage(text) {
  return {
    id: uid('msg'),
    userId: 'system',
    name: 'Campus Assist',
    text,
    type: 'system',
    createdAt: Date.now(),
  }
}

function memberSnapshot(user, role) {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    joinedAt: Date.now(),
  }
}

export async function createRoom(owner, payload) {
  const title = String(payload.title || '').trim()
  const description = String(payload.description || '').trim()
  const location = String(payload.location || '').trim()
  const tip = Number(payload.tip) || 0
  const categories = Array.isArray(payload.categories) && payload.categories.length ? payload.categories : [payload.category || 'other']
  const category = categories[0]
  const urgency = payload.urgency || 'normal'
  const categoryLabel = CATEGORIES.find((item) => item.id === category)?.label || 'Other favour'
  const categoryLabels = categories.map((id) => CATEGORIES.find((item) => item.id === id)?.label).filter(Boolean)

  if (!title) return { ok: false, error: 'Give your request a short title.' }
  if (!description) return { ok: false, error: 'Describe what you need.' }
  if (!location) return { ok: false, error: 'Add a pickup / meet location.' }

  const token = getAccessToken()
  if (!token) return { ok: false, error: 'Your session has expired. Please sign in again.' }

  const urgencyLabel = URGENCY.find((item) => item.id === urgency)?.label || 'Soon'

  try {
    const response = await authenticatedFetch('/api/room/createRoom/createRoom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        address: location,
        category: categoryLabel,
        categories: categoryLabels,
        tip,
        urgency: urgencyLabel,
      }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return { ok: false, error: data.message || 'Could not create the room.' }
    }

    const apiRoom = data.room
    if (!apiRoom) return { ok: false, error: 'The server returned an invalid room.' }

    const roomId = apiRoom.id || apiRoom._id
    const roomCategory = CATEGORIES.find((item) => item.label === apiRoom.category)?.id || category
    const room = {
      id: roomId,
      ownerId: owner.id,
      title: apiRoom.title || title,
      description: apiRoom.description || description,
      location: apiRoom.address || location,
      tip: apiRoom.tip ?? tip,
      category: roomCategory,
      categories: categoryLabels,
      urgency,
      status: 'open',
      locked: false,
      members: [memberSnapshot(owner, 'owner')],
      bannedIds: [],
      messages: [systemMessage(`${owner.name} opened this request room.`)],
      createdAt: apiRoom.createdAt || Date.now(),
      updatedAt: apiRoom.updatedAt || Date.now(),
    }

    saveRooms([room, ...getRooms().filter((item) => item.id !== room.id)])
    updateUserStats(owner.id, (stats) => ({
      requested: (stats.requested || 0) + 1,
      points: (stats.points || 0) + 5,
    }))

    await fetchRooms()

    return { ok: true, room }
  } catch (error) {
    console.error('Create room request failed:', error)
    return { ok: false, error: 'Unable to reach the server. Please try again.' }
  }
}

export function legacyLocalJoinRoom(roomId, user) {
  return patchRoom(roomId, (room) => {
    if (room.status === 'closed' || room.status === 'fulfilled') {
      return { ok: false, error: 'This request is no longer open.' }
    }
    if (room.locked) {
      return { ok: false, error: 'The owner locked this room.' }
    }
    if (room.bannedIds.includes(user.id)) {
      return { ok: false, error: 'You were removed from this room.' }
    }
    if (room.members.some((m) => m.userId === user.id)) {
      return { ok: true, room }
    }
    const next = {
      ...room,
      status: room.status === 'open' ? 'active' : room.status,
      members: [...room.members, memberSnapshot(user, 'helper')],
      messages: [
        ...room.messages,
        systemMessage(`${user.name} joined to help.`),
      ],
      updatedAt: Date.now(),
    }
    return { room: next }
  })
}

export function leaveRoom(roomId, userId) {
  return patchRoom(roomId, (room) => {
    if (room.ownerId === userId) {
      return { ok: false, error: 'Owners should close the room instead of leaving.' }
    }
    const member = room.members.find((m) => m.userId === userId)
    if (!member) return { ok: true, room }

    const nextMembers = room.members.filter((m) => m.userId !== userId)
    return {
      room: {
        ...room,
        members: nextMembers,
        status:
          nextMembers.length === 1 && room.status === 'active'
            ? 'open'
            : room.status,
        messages: [
          ...room.messages,
          systemMessage(`${member.name} left the room.`),
        ],
        updatedAt: Date.now(),
      },
    }
  })
}

export function kickMember(roomId, ownerId, targetId) {
  return patchRoom(roomId, (room) => {
    if (room.ownerId !== ownerId) {
      return { ok: false, error: 'Only the room owner can remove people.' }
    }
    if (targetId === ownerId) {
      return { ok: false, error: 'You cannot remove yourself.' }
    }
    const target = room.members.find((m) => m.userId === targetId)
    if (!target) return { ok: true, room }

    return {
      room: {
        ...room,
        members: room.members.filter((m) => m.userId !== targetId),
        bannedIds: [...new Set([...room.bannedIds, targetId])],
        messages: [
          ...room.messages,
          systemMessage(`${target.name} was removed by the owner.`),
        ],
        updatedAt: Date.now(),
      },
    }
  })
}

export function setRoomLocked(roomId, ownerId, locked) {
  return patchRoom(roomId, (room) => {
    if (room.ownerId !== ownerId) {
      return { ok: false, error: 'Only the owner can lock the room.' }
    }
    return {
      room: {
        ...room,
        locked: Boolean(locked),
        messages: [
          ...room.messages,
          systemMessage(
            locked
              ? 'Room locked — new helpers cannot join.'
              : 'Room unlocked — helpers can join again.',
          ),
        ],
        updatedAt: Date.now(),
      },
    }
  })
}

export function closeRoom(roomId, ownerId, asFulfilled = false) {
  return patchRoom(roomId, (room) => {
    if (room.ownerId !== ownerId) {
      return { ok: false, error: 'Only the owner can close this room.' }
    }

    const helpers = room.members.filter((m) => m.role === 'helper')
    if (asFulfilled) {
      helpers.forEach((h) => {
        updateUserStats(h.userId, (stats) => ({
          helped: (stats.helped || 0) + 1,
          tipsEarned: (stats.tipsEarned || 0) + (room.tip || 0),
          points: (stats.points || 0) + 20,
        }))
      })
      updateUserStats(ownerId, (stats) => ({
        points: (stats.points || 0) + 8,
      }))
    }

    return {
      room: {
        ...room,
        status: asFulfilled ? 'fulfilled' : 'closed',
        locked: true,
        messages: [
          ...room.messages,
          systemMessage(
            asFulfilled
              ? 'Request marked fulfilled. Thanks for helping!'
              : 'Room closed by the owner.',
          ),
        ],
        updatedAt: Date.now(),
      },
    }
  })
}

export function sendMessage(roomId, user, text) {
  const clean = String(text || '').trim()
  if (!clean) return { ok: false, error: 'Message cannot be empty.' }
  if (clean.length > 500) return { ok: false, error: 'Keep messages under 500 characters.' }

  return patchRoom(roomId, (room) => {
    if (!room.members.some((m) => m.userId === user.id)) {
      return { ok: false, error: 'Join the room before chatting.' }
    }
    if (room.status === 'closed' || room.status === 'fulfilled') {
      return { ok: false, error: 'This room is closed.' }
    }

    return {
      room: {
        ...room,
        messages: [
          ...room.messages,
          {
            id: uid('msg'),
            userId: user.id,
            name: user.name,
            text: clean,
            type: 'chat',
            createdAt: Date.now(),
          },
        ],
        updatedAt: Date.now(),
      },
    }
  })
}

export function categoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
}

export function urgencyMeta(id) {
  return URGENCY.find((u) => u.id === id) || URGENCY[1]
}

export function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'
}

export function statusLabel(status) {
  switch (status) {
    case 'open':
      return 'Open'
    case 'joined': return 'Joined'
    case 'coming': return 'Coming'
    case 'parchasing': return 'Parchasing'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    default:
      return status
  }
}
