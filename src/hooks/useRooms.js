import { useCallback, useEffect, useState } from 'react'
import { fetchRooms, getRoom, listRooms } from '../lib/rooms'
import { subscribeStorage } from '../lib/storage'

export function useRooms() {
  const [rooms, setRooms] = useState(() => listRooms())

  const refresh = useCallback(() => {
    setRooms(listRooms())
  }, [])

  useEffect(() => {
    let active = true
    refresh()
    fetchRooms().then((result) => {
      if (active && result.ok) refresh()
    })
    const unsubscribe = subscribeStorage((key) => {
      if (key === 'ca_rooms') refresh()
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [refresh])

  return { rooms, refresh }
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
