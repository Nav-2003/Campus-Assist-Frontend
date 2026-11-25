import { io } from 'socket.io-client'
import { API_BASE_URL } from './auth'

const socketUrl = import.meta.env.VITE_SOCKET_URL || API_BASE_URL || window.location.origin

export const socket = io(socketUrl, {
  autoConnect: false,
})
