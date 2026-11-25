import { useCallback, useEffect, useState } from 'react'
import { fetchRooms, getRoom, listRooms, listRoomViews } from '../lib/rooms'
import { subscribeStorage } from '../lib/storage'

export function useRooms() {
  const [rooms, setRooms] = useState(() => listRooms())
  const [views, setViews] = useState(() => listRoomViews())

  const refresh = useCallback(() => {
    setRooms(listRooms())
    setViews(listRoomViews())
  }, [])

  useEffect(() => {
    let active = true
    refresh()
    fetchRooms().then((result) => {
      if (active && result.ok) refresh()
    })
    const poll = window.setInterval(async () => {
      const result = await fetchRooms()
      if (active && result.ok) refresh()
    }, 5000)
    const unsubscribe = subscribeStorage((key) => {
      if (key === 'ca_rooms' || key === 'ca_room_views') refresh()
    })

    return () => {
      active = false
      window.clearInterval(poll)
      unsubscribe()
    }
  }, [refresh])

  return { rooms, views, refresh }
}

export function useRoom(roomId) {
  const [room, setRoom] = useState(() => (roomId ? getRoom(roomId) : null))

  const refresh = useCallback(() => {
    setRoom(roomId ? getRoom(roomId) : null)
  }, [roomId])

  useEffect(() => {
    refresh()
    return subscribeStorage((key) => {
      if (key === 'ca_rooms') refresh()
    })
  }, [refresh])

  return { room, refresh }
}
